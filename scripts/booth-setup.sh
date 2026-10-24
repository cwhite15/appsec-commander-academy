#!/usr/bin/env bash
# Sets up a SAINTCON booth laptop to serve the AppSec Community Academy
# from Docker, so it works without a network, and points Firefox at it.
#
# Run it from the laptop's admin account. It is safe to re-run: the first
# run installs everything, and later runs pull the latest academy code and
# rebuild.
#
#   sudo bash booth-setup.sh                 set up or update this laptop
#   sudo bash booth-setup.sh --event-mode    pause updates, sleep and screen lock
#   sudo bash booth-setup.sh --unlock        undo --event-mode after the event
#
# Options:
#   --guest NAME            attendee account (default: guest)
set -Eeuo pipefail

BOOTH_DIR=/opt/booth
PORTAL_DIR=$BOOTH_DIR/appsec-community-academy
PORTAL_URL=http://127.0.0.1:8085
TIMEZONE=America/Denver
LOG=/var/log/booth-setup.log
DCONF_FILE=/etc/dconf/db/local.d/00-booth
DCONF_LOCKS=/etc/dconf/db/local.d/locks/00-booth

# Folder names must match the build paths in
# appsec-community-academy/docker-compose.yml.
REPOS=(
  "appsec-community-academy https://github.com/sethlaw/appsec-community-academy.git"
  "appsec-cadet-academy     https://github.com/sethlaw/appsec-cadet-academy.git"
  "appsec-officer-academy   https://github.com/sethlaw/appsec-officer-academy.git"
  "appsec-commander-academy https://github.com/cwhite15/appsec-commander-academy.git"
  "SaintCon-AppSec-Dev-2026 https://github.com/phuleofatook/SaintCon-AppSec-Dev-2026.git"
)
ROUTES=(/cadets/ /navigators/ /communication-officers/ /commanders/)

GUEST_USER=guest
MODE=setup
APP_STATUS="not checked"
WARNINGS=()

step() { printf '\n==> %s\n' "$*"; }
ok()   { printf '    ok: %s\n' "$*"; }
warn() { printf '    WARNING: %s\n' "$*"; WARNINGS+=("$*"); }
die()  { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
in_group() { [[ " $(id -nG "$1") " == *" $2 "* ]]; }
as_admin() { sudo -u "$ADMIN_USER" -H "$@"; }

APT=(apt-get -y -o DPkg::Lock::Timeout=900
     -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

while [[ $# -gt 0 ]]; do
  case $1 in
    --event-mode) MODE=event ;;
    --unlock) MODE=unlock ;;
    --guest) GUEST_USER=${2:?--guest needs an account name}; shift ;;
    -h|--help) sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) die "Unknown option: $1 (see --help)" ;;
  esac
  shift
done

[[ $EUID -eq 0 ]] || die "Run this with sudo: sudo bash $0"
ADMIN_USER=${SUDO_USER:-}
[[ -n $ADMIN_USER && $ADMIN_USER != root ]] ||
  die "Run this from the laptop's admin account with sudo, not from a root shell."
[[ $ADMIN_USER != "$GUEST_USER" ]] ||
  die "Run this from the admin account, not '$GUEST_USER'. Switch with: su - <admin account>"
id "$GUEST_USER" >/dev/null 2>&1 ||
  die "There is no '$GUEST_USER' account on this laptop. Name the attendee account with --guest NAME."

# shellcheck source=/dev/null
. /etc/os-release
[[ ${ID:-} == ubuntu ]] || die "This script is for Ubuntu."

exec > >(tee -a "$LOG") 2>&1
trap 'printf "\nERROR: the script stopped at line %s. Full log: %s\n" "$LINENO" "$LOG" >&2' ERR
printf '\n#### booth-setup.sh %s on %s at %s (admin: %s)\n' \
  "$MODE" "$(hostname)" "$(date -Is)" "$ADMIN_USER"
[[ ${VERSION_ID:-} == 24.04 ]] ||
  warn "Written for Ubuntu 24.04; this laptop runs ${PRETTY_NAME:-an unknown release}."

fix_clock() {
  step "Clock"
  timedatectl set-timezone "$TIMEZONE"
  # The BIOS clocks were set to Mountain time, which is also what Windows
  # expects on the dual-boot machines, so Ubuntu reads them as local time.
  if [[ $(timedatectl show -p LocalRTC --value) != yes ]]; then
    if [[ $(timedatectl show -p NTPSynchronized --value) == yes ]]; then
      timedatectl set-local-rtc 1
    else
      timedatectl set-local-rtc 1 --adjust-system-clock
    fi
  fi
  timedatectl set-ntp true
  ok "$(date '+%a %b %-d %H:%M %Z')"
}

update_os() {
  step "Ubuntu updates (slow on the first run after a long time off)"
  export DEBIAN_FRONTEND=noninteractive
  "${APT[@]}" update
  "${APT[@]}" full-upgrade
  "${APT[@]}" autoremove
  "${APT[@]}" install git curl ca-certificates
  if pgrep -x firefox >/dev/null; then
    warn "Firefox is open, so it can't update. Close it in every account and re-run."
  fi
  if ! snap refresh; then
    warn "snap refresh didn't finish. Re-run the script later."
  fi
  ok "packages up to date"
}

ensure_docker() {
  step "Docker"
  if snap list docker >/dev/null 2>&1; then
    die "Docker is installed as a snap. Removing it deletes its images, so do it by hand (sudo snap remove docker) and re-run."
  fi
  if ! dpkg -s docker-ce >/dev/null 2>&1; then
    local pkg
    for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
      if dpkg -s "$pkg" >/dev/null 2>&1; then "${APT[@]}" remove "$pkg"; fi
    done
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME:-$VERSION_CODENAME} stable" \
      > /etc/apt/sources.list.d/docker.list
    "${APT[@]}" update
    "${APT[@]}" install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  fi
  systemctl enable --now docker containerd
  if ! in_group "$ADMIN_USER" docker; then
    usermod -aG docker "$ADMIN_USER"
    ok "added $ADMIN_USER to the docker group (applies at their next login)"
  fi
  ok "$(docker --version)"
}

lock_down_guest() {
  step "Attendee account: $GUEST_USER"
  # Either group would give attendees root on the laptop.
  local grp
  for grp in sudo docker; do
    if in_group "$GUEST_USER" "$grp"; then
      gpasswd -d "$GUEST_USER" "$grp" >/dev/null
      ok "removed $GUEST_USER from the $grp group"
    fi
  done
  ok "$GUEST_USER is not in the sudo or docker groups"
}

set_firefox_homepage() {
  step "Firefox home page"
  # The Firefox snap reads system-wide policies from /etc/firefox/policies.
  # This applies to every account and is locked, so attendees can't change it.
  local policy=/etc/firefox/policies/policies.json
  install -d -m 0755 /etc/firefox/policies
  if [[ -f $policy && ! -f $policy.before-booth ]]; then
    cp "$policy" "$policy.before-booth"
  fi
  cat > "$policy" <<'EOF'
{
  "policies": {
    "Homepage": {
      "URL": "http://localhost:8085/",
      "StartPage": "homepage",
      "Locked": true
    },
    "OverrideFirstRunPage": "",
    "OverridePostUpdatePage": "",
    "DontCheckDefaultBrowser": true
  }
}
EOF
  chmod 0644 "$policy"
  ok "home page is http://localhost:8085/ (applies the next time Firefox starts)"
}

sync_repo() {
  local name=$1 url=$2 dir=$BOOTH_DIR/$1
  if [[ -d $dir/.git ]]; then
    if as_admin git -C "$dir" pull --ff-only -q; then
      ok "$name updated to $(as_admin git -C "$dir" log -1 --format='%h (%cs)')"
    else
      warn "$name couldn't be updated; using the copy already on this laptop."
    fi
  elif [[ -d $dir ]]; then
    ok "$name is present (copied in, not a git checkout, so not updated)"
  elif as_admin git clone -q "$url" "$dir"; then
    ok "$name cloned at $(as_admin git -C "$dir" log -1 --format='%h (%cs)')"
  else
    warn "$name couldn't be cloned from $url"
  fi
}

deploy_app() {
  step "Academy code in $BOOTH_DIR"
  install -d -m 0755 -o "$ADMIN_USER" -g "$(id -gn "$ADMIN_USER")" "$BOOTH_DIR"
  local entry name url
  for entry in "${REPOS[@]}"; do
    read -r name url <<<"$entry"
    sync_repo "$name" "$url"
  done

  # Only this laptop can reach the portal, not the conference network. An
  # override file keeps the change out of the repo, so git pull still works.
  cat > "$PORTAL_DIR/docker-compose.override.yml" <<'EOF'
services:
  community-academy:
    ports: !override
      - "127.0.0.1:8085:80"
EOF
  chown "$ADMIN_USER:" "$PORTAL_DIR/docker-compose.override.yml"

  # docker compose builds every academy from its own Dockerfile.
  local missing=()
  for entry in "${REPOS[@]}"; do
    read -r name url <<<"$entry"
    [[ -f $BOOTH_DIR/$name/Dockerfile ]] || missing+=("$name")
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    APP_STATUS="not started"
    warn "No Dockerfile yet in: ${missing[*]}. The app can't be built until every academy has one."
    return
  fi

  step "Building and starting the academy"
  (cd "$PORTAL_DIR" && docker compose up -d --build --remove-orphans)
  check_app
}

check_app() {
  step "Checking the academy at $PORTAL_URL"
  local i up=no
  for i in $(seq 1 30); do
    if curl -fsS -o /dev/null --max-time 3 "$PORTAL_URL/"; then up=yes; break; fi
    sleep 2
  done
  if [[ $up != yes ]]; then
    APP_STATUS="portal not responding"
    warn "The portal didn't respond. See: cd $PORTAL_DIR && docker compose ps && docker compose logs"
    return
  fi
  local route passed=0
  for route in "${ROUTES[@]}"; do
    if curl -fsS -o /dev/null --max-time 5 "$PORTAL_URL$route"; then
      ok "$route"
      passed=$((passed + 1))
    else
      warn "$route didn't load"
    fi
  done
  APP_STATUS="portal up, $passed/${#ROUTES[@]} academies load"
}

event_mode() {
  step "Event mode: pausing updates, sleep and screen lock"
  systemctl disable --now apt-daily.timer apt-daily-upgrade.timer
  snap refresh --hold >/dev/null
  systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target

  if ! command -v dconf >/dev/null; then "${APT[@]}" install dconf-cli; fi
  install -d /etc/dconf/profile "$(dirname "$DCONF_LOCKS")"
  if [[ ! -f /etc/dconf/profile/user ]]; then
    printf 'user-db:user\nsystem-db:local\n' > /etc/dconf/profile/user
  elif ! grep -qx 'system-db:local' /etc/dconf/profile/user; then
    warn "/etc/dconf/profile/user doesn't include system-db:local, so the screen settings won't apply."
  fi
  cat > "$DCONF_FILE" <<'EOF'
# Written by booth-setup.sh --event-mode. Remove with --unlock.
[org/gnome/desktop/session]
idle-delay=uint32 0

[org/gnome/desktop/screensaver]
lock-enabled=false

[org/gnome/settings-daemon/plugins/power]
sleep-inactive-ac-type='nothing'
sleep-inactive-battery-type='nothing'
EOF
  cat > "$DCONF_LOCKS" <<'EOF'
/org/gnome/desktop/session/idle-delay
/org/gnome/desktop/screensaver/lock-enabled
/org/gnome/settings-daemon/plugins/power/sleep-inactive-ac-type
/org/gnome/settings-daemon/plugins/power/sleep-inactive-battery-type
EOF
  dconf update
  ok "updates paused, sleep off, screen stays on and unlocked (applies at next login)"
  check_app
}

unlock_event_mode() {
  step "Undoing event mode"
  systemctl enable --now apt-daily.timer apt-daily-upgrade.timer
  snap refresh --unhold >/dev/null
  systemctl unmask sleep.target suspend.target hibernate.target hybrid-sleep.target
  rm -f "$DCONF_FILE" "$DCONF_LOCKS"
  if command -v dconf >/dev/null; then dconf update; fi
  ok "automatic updates, sleep and screen lock are back to normal"
  APP_STATUS="not checked (unlock mode)"
}

summary() {
  step "Summary"
  local docker_version
  docker_version=$(docker --version 2>/dev/null | cut -d, -f1) || docker_version="no Docker"
  printf '%s | %s | %s | %s\n' "$(hostname)" "${PRETTY_NAME:-Ubuntu}" "$docker_version" "$APP_STATUS"
  if [[ ${#WARNINGS[@]} -gt 0 ]]; then
    printf '\nNOT READY. Needs attention:\n'
    printf '  - %s\n' "${WARNINGS[@]}"
  else
    printf '\nREADY\n'
  fi
  printf 'Log: %s\n' "$LOG"
}

case $MODE in
  setup)
    fix_clock
    update_os
    ensure_docker
    lock_down_guest
    set_firefox_homepage
    deploy_app
    ;;
  event) event_mode ;;
  unlock) unlock_event_mode ;;
esac
summary
