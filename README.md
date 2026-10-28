# AppSec Mission Commander Academy

A self-contained AppSec program-building game for SAINTCON 2026. Attendees learn the four parts of an application security program, fund a one-year roadmap with a fixed budget and a small team, and watch it hold up, or not, against the attacks that land at the end of the year. No model API, database, account, or API key is required. The game works offline, and anonymous start and completion signals go to the central tracker when internet access is available.

This is the Commander track of the SAINTCON AppSec Academy, alongside the [Cadet](https://github.com/sethlaw/appsec-cadet-academy) and [Communication Officer](https://github.com/sethlaw/appsec-officer-academy) academies, and shares their visual system.

## The flow

1. **Why it matters.** Two sourced numbers from the Verizon Data Breach Investigations Reports for 2025 and 2026.
2. **Four parts of a program.** Define, Evaluate, Integrate, Measure. Open all four to continue.
3. **Build your roadmap.** Run the security program at OrbitPay, a fictional fintech, for one year. Place 18 initiative cards into four quarters, within one budget and a team cap per quarter. Program work makes tools work: a card runs at half strength for each prerequisite that isn't built in the same quarter or earlier, and only a card at full strength can stop an attack outright.
4. **The end-of-year attack simulation.** An animated console drops your cards in as a shield, then six attacks test it. The program score is the risk you cut, weighted by how likely each attack is.
5. **After-action report.** What each attack did, and why: prevented, risk cut, or unprotected, naming any missing prerequisite. Adjust the roadmap and run it again, or finish.
6. **Finish.** The Hackers Challenge token, and QR codes for BSIMM, OWASP SAMM and a roadmap worksheet to keep building.

Every cost, team size and cut in the game is an illustrative game value, not industry data. The facilitator guide, [`FACILITATOR.md`](FACILITATOR.md), covers the rules, booth operations and teaching notes.

## Run it

With Docker:

```sh
docker compose up --build
```

Open <http://localhost:8088>.

With Node.js 20 or later:

```sh
npm start
```

Open <http://localhost:8080>, or run `PORT=8088 npm start` to match the Docker port. There are no npm dependencies to install.

ES modules mean opening `index.html` directly with a `file:` URL is not supported.

## Test it

```sh
npm test
```

The tests use Node's built-in test runner. They cover the game model's rules and the scores of known roadmaps, the attack simulation engine, the tracker and CSP wiring, and that the facilitator guide's numbers match the game model.

To check the game's balance after changing any number in `js/model.js`:

```sh
node scripts/check.mjs             # exact: scores every affordable roadmap, on all CPU cores (a few minutes)
node scripts/check.mjs --sample N  # a uniform random sample of N roadmaps, fast, for tuning
```

It reports how many roadmaps win, the best ones, which cards matter, and whether the balance targets pass.

## Re-skinning

The Hackers Challenge CTF token is the only setting in [`js/config.js`](js/config.js). [`assets/styles.css`](assets/styles.css) is the shared academy stylesheet, and [`assets/commander.css`](assets/commander.css) adds the Commander components on top.

Content is isolated from the UI: every game number (cards, costs, team caps, attacks, weights and cuts) lives in [`js/model.js`](js/model.js), and the UI, the simulation and the balance check all read it from there.

## File layout

```text
appsec-commander-academy/
├── index.html             Application shell
├── js/app.js              UI, screens, flow, and on-screen copy
├── js/model.js            The game model: cards, attacks, rules, and scoring
├── js/sim/engine.js       Attack simulation: turns a roadmap into a layout and timeline
├── js/sim/renderer.js     Attack simulation: canvas animation
├── js/tracker.js          Anonymous activity telemetry
├── js/config.js           The CTF token
├── assets/styles.css      Shared academy theme
├── assets/commander.css   Commander components
├── assets/qr/             Finish-screen QR codes
├── assets/                Fonts and artwork
├── scripts/check.mjs      Balance check: scores every affordable roadmap
├── test/                  Node built-in tests
├── server.js              Small static server for npm start (local development)
├── nginx.conf             Production nginx config with the CSP
├── Dockerfile             Production nginx image
├── docker-compose.yml     One-command local deployment
└── FACILITATOR.md         Booth guide and teaching notes
```

## Deployment notes

- The nginx configuration and the Node server send a strict Content-Security-Policy. The app has no inline scripts or style attributes. Its only external request is anonymous activity telemetry to `https://appsec.community/api/activity`.
- Start and completion signals are the only data sent. The roadmap, choices, scores, and anything else the attendee does are never transmitted.
- The roadmap lives only in memory. **Start over** reloads the page and clears the anonymous participant and browser-session identifiers, ready for the next attendee.
- A browser can opt out of telemetry with `localStorage.setItem("appsec-community-analytics-opt-out", "true")`.
- In the full academy, the portal gateway serves this app at `/commanders/`.
- Port `8088` follows the Cadet (`8086`) and Officer (`8087`) academies.

## Earlier version

The previous three-mission version (The Command Protocols, The Resource Gauntlet, and The Commander's Map) lives on the `classic-commander` branch.

## Credits

The shared academy stylesheet, fonts, OWASP space logo, and activity tracker come from Seth Law's Cadet and Officer academies. The Commander academy has its own hero image (`saintcon-appsec-hero.webp`, the mission control "AppSec Program Launch" scene).

The four-part program structure and the initiatives come from the Wasatch AppSec community app's "Build an AppSec Roadmap" page. Each card carries a BSIMM and OWASP SAMM reference.
