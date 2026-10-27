// Mission Commander path. One state object, a full repaint on every change,
// and delegated clicks. Every game number comes from model.js, so the UI never
// repeats a cost, cap, or cut.
import { components, resources, initiatives, scenarios, WIN_BAR, byId, spend, fits, missingFoundations, runAll } from "./model.js";
import { installIdleReset } from "./idle-reset.js";
import { recordActivity, resetActivityIdentity } from "./tracker.js";
import { academyConfig } from "./config.js";

const CTF_TOKEN = academyConfig.ctfToken;
// Finish-screen resources. All three URLs were checked 2026-10-27; the BSIMM report sits behind an email form.
const BSIMM_URL = "https://www.blackduck.com/resources/analyst-reports/bsimm.html";
const SAMM_URL = "https://owaspsamm.org/";
const REDPOINT_URL = "https://redpointsecurity.com/appsec-program-roadmap-worksheet/";
const RESOURCE_LINKS = [
  { label: "BSIMM report", url: BSIMM_URL, image: "./assets/qr/bsimm.svg" },
  { label: "OWASP SAMM", url: SAMM_URL, image: "./assets/qr/samm.svg" },
  { label: "Redpoint roadmap worksheet", url: REDPOINT_URL, image: "./assets/qr/redpoint.svg" }
];
const STEPS = ["Why it matters", "Four parts", "Roadmap", "The year", "Finish"];
const SCREEN = { stat: 0, briefing: 1, build: 2, year: 3, finish: 4 };

const main = document.querySelector("#main");
const toast = document.querySelector("#toast");
const simRoot = document.querySelector("#sim-root");

// openGroups: which component groups are expanded on phones (desktop always shows all four).
// "Start over" reloads the page, so this is the only place state is created.
const state = { screen: SCREEN.stat, seen: new Set(), expanded: new Set(), openGroups: new Set([components[0].id]), plan: {}, run: null, reveal: 0, hint: false };

/* Helpers */

// Spelled out because it starts a sentence; follows the model's scenario count.
function attackCountWord() {
  const words = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
  return words[scenarios.length] || String(scenarios.length);
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

// Meter widths go through the CSSOM so the strict CSP never sees an inline style attribute.
function paintMeters(root = document) {
  root.querySelectorAll("[data-meter]").forEach((element) => {
    element.style.width = `${Math.max(0, Math.min(100, Number(element.dataset.meter) || 0))}%`;
  });
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}

// Floor (with a float guard) so a 79.6% score never displays as "80%" next to "Short of 80%".
const percent = (fraction) => Math.floor(fraction * 100 + 1e-6);
const fteLabel = (value) => String(Math.round(value * 100) / 100);
const quarterName = (index) => resources.quarters[index];
const percentOf = (part, whole) => (whole ? (part / whole) * 100 : 0);
const winPercent = percent(WIN_BAR);
const weightLabel = (weight) => `${Math.round(weight * 100)}% of score`;
const byWeight = (a, b) => b.weight - a.weight;
const likelihoodBadge = (likelihood) => `<span class="lk-badge lk-${escapeHtml(likelihood.toLowerCase().replaceAll(" ", "-"))}">${escapeHtml(likelihood)}</span>`;

function joinNames(names) {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function strengthWord(missingCount) {
  return missingCount === 1 ? "half" : `${percent(Math.pow(0.5, missingCount))}%`;
}

/* Cards and their prerequisites */

const KIND_LABEL = { process: "Program work", tool: "Tool" };
const KIND_ORDER = { process: 0, tool: 1 };

// Timeline chips only: the full card names wrap badly in a narrow quarter column. Cards, warnings and reports use the full name.
const SHORT_LABEL = {
  why: "Your why",
  threat_assessment: "Threat assessment",
  inventory: "App inventory",
  partners: "Key partners",
  operating_model: "Operating model",
  champions: "Champions program",
  training: "Secure coding training",
  pipeline: "Pipeline map",
  fix_slas: "Remediation & SLAs",
  threat_model: "Threat modeling",
  sca: "Dependency scanning",
  sast: "Code scanning",
  secrets: "Secrets vault",
  mfa: "MFA & logins",
  kpis: "KPIs",
  metrics_review: "Metrics review",
  pentest: "Pen test & bounty",
  detection: "Detection & response"
};
const shortName = (item) => SHORT_LABEL[item.id] || item.name;
const nameOf = (id) => byId[id].name;

// The cards that list this one in their own needs: what building it unlocks.
const unlocksOf = (id) => initiatives.filter((item) => (item.needs || []).includes(id));

// Why one prerequisite isn't in place for a card built in `quarter`: not in the plan,
// built after the card, or built in time but missing its own prerequisite (the recursive rule).
function prereqProblem(plan, needId, quarter) {
  const name = nameOf(needId);
  if (plan[needId] === undefined) return `${name} isn't in your plan`;
  if (plan[needId] > quarter) return `${name} isn't built until ${quarterName(plan[needId])}`;
  const own = missingFoundations(plan, needId).map(nameOf);
  return own.length ? `${name} is missing its own prerequisite (${joinNames(own)})` : `${name} isn't in place`;
}

// One clause per missing prerequisite, joined with semicolons because a clause can hold "and".
const prereqProblems = (plan, id) => missingFoundations(plan, id).map((needId) => prereqProblem(plan, needId, plan[id])).join("; ");

/* Anonymous activity telemetry (js/tracker.js). The three ids match the portal's counts;
   recordActivity dedupes each track/id/event per session, so repeat calls are harmless. */

const track = (id, event) => recordActivity("commander", id, event);

/* Shared chrome */

function navTemplate() {
  const canGoBack = state.screen > SCREEN.stat && state.screen < SCREEN.finish;
  const back = canGoBack ? `<button class="back-link path-back" type="button" data-action="back" data-key="back">← Back</button>` : "<span></span>";
  const dots = STEPS.map((label, index) => `<i class="progress-dot${index === state.screen ? " active" : ""}${index < state.screen ? " complete" : ""}" title="${escapeHtml(label)}"></i>`).join("");
  return `<nav class="mission-nav path-nav" aria-label="Path progress">${back}<div class="progress-dots" role="img" aria-label="Step ${state.screen + 1} of ${STEPS.length}: ${escapeHtml(STEPS[state.screen])}">${dots}</div></nav>`;
}

// Screens 3 and 4 share the live Mission 02 shell and its Resource Gauntlet art.
function stageShell(header, content) {
  return `<div class="mission-stage mission-stage-simulator"><section class="mission-shell">${navTemplate()}<header class="mission-header"><div>${header}</div><span class="classification">Commander clearance</span></header>${content}</section></div>`;
}

/* Screen 1: the four components */

function briefingScreen() {
  const cards = components.map((component) => {
    const open = state.expanded.has(component.id);
    const hint = open ? "Tap to close" : state.seen.has(component.id) ? "Opened · tap to reread" : "Tap to open";
    return `<button class="component-card accent-${escapeHtml(component.id)}${open ? " open" : ""}${state.seen.has(component.id) ? " seen" : ""}" type="button" data-action="open" data-id="${escapeHtml(component.id)}" data-key="open-${escapeHtml(component.id)}" aria-expanded="${open}">
      <span class="component-number">${escapeHtml(component.number)}</span>
      <span class="component-title">${escapeHtml(component.title)}</span>
      <span class="component-line">${escapeHtml(component.line)}</span>
      ${open ? `<span class="component-detail">${escapeHtml(component.detail)}</span>` : ""}
      <span class="component-hint">${hint}</span>
    </button>`;
  }).join("");
  const ready = state.seen.size === components.length;
  return `<div class="path-nav-wrap">${navTemplate()}</div>
    <section class="path-header"><p class="eyebrow">Phase 2 · Briefing</p><h1>Four parts <span>of a program</span></h1><p class="lede">One practical way to organize an AppSec program. Open all four before you build your roadmap.</p></section>
    <section class="path-section">
      <div class="component-grid">${cards}</div>
      <p class="path-note">Every initiative on your roadmap sits under one of these four parts.</p>
      <div class="path-actions"><span class="path-count">${state.seen.size} of ${components.length} opened</span><button class="button" type="button" data-action="go" data-to="${SCREEN.build}" data-key="continue"${ready ? "" : " disabled"}>Continue →</button></div>
    </section>`;
}

/* Screen 1: why it matters. Two verified DBIR figures, each worded to match what its chart measures. */

const STATS = [
  {
    figure: "34",
    year: "DBIR 2025",
    headline: "Web applications were the most common route in breaches.",
    body: "In 34% of breaches where the route was known, it ran through a web application.",
    source: "Verizon 2025 Data Breach Investigations Report, p.28, Figure 28, top action vectors in breaches (n=7,372).",
    note: "In basic web application attacks, about 88% of breaches involved stolen credentials (same report, p.53), so logins count as much as code."
  },
  {
    figure: "31",
    year: "DBIR 2026",
    headline: "Exploiting a vulnerability is now the most common way attackers first get in.",
    body: "It was how 31% of breaches started, up from 20% the year before.",
    source: "Verizon 2026 Data Breach Investigations Report, p.15, Figure 10, initial access vectors in non-Error, non-Misuse breaches (n=20,023).",
    note: "That counts every kind of vulnerability, including VPNs and other edge devices, not only your own apps."
  }
];

function statScreen() {
  const cards = STATS.map((stat) => `<article class="stat-card">
      <div class="stat-figure" aria-hidden="true">${escapeHtml(stat.figure)}<span>%</span></div>
      <div class="stat-copy">
        <p class="stat-year">${escapeHtml(stat.year)}</p>
        <h2>${escapeHtml(stat.headline)}</h2>
        <p class="stat-body">${escapeHtml(stat.body)}</p>
        <p class="stat-secondary">${escapeHtml(stat.note)}</p>
        <p class="stat-source">${escapeHtml(stat.source)}</p>
      </div>
    </article>`).join("");
  return `<div class="path-nav-wrap">${navTemplate()}</div>
    <section class="hero hero-short"><div class="hero-copy"><p class="eyebrow">Phase 1 · Intel</p><h1>Why AppSec <span>matters</span></h1><p class="lede">Attackers go where the software is. Two numbers from this year's and last year's Verizon breach reports.</p></div></section>
    <section class="path-section stat-section">
      <div class="stat-grid">${cards}</div>
      <div class="path-actions"><button class="button" type="button" data-action="go" data-to="${SCREEN.briefing}" data-key="continue">Continue →</button></div>
    </section>`;
}

/* Screen 3: build the roadmap */

function resourceBar(used) {
  const left = resources.budgetK - used.budgetK;
  const quarters = resources.fte.map((cap, index) => {
    const full = used.fte[index] >= cap - 1e-9;
    return `<div class="resource res-q"><div class="resource-head"><span>${escapeHtml(quarterName(index))}</span><strong>${fteLabel(used.fte[index])}/${fteLabel(cap)}</strong></div><div class="meter${full ? " capped" : ""}"><i data-meter="${percentOf(used.fte[index], cap)}"></i></div></div>`;
  }).join("");
  return `<div class="res-bar" role="region" aria-label="Resources">
    <div class="resource res-budget"><div class="resource-head"><span>Budget left</span><strong>$${left}K / $${resources.budgetK}K</strong></div><div class="meter${left <= 0 ? " capped" : ""}"><i data-meter="${percentOf(left, resources.budgetK)}"></i></div></div>
    <div class="res-team"><span class="res-label">Team per quarter · FTE used / cap</span><div class="res-fte">${quarters}</div></div>
    <button class="button" type="button" data-action="run" data-key="run-bar"${Object.keys(state.plan).length ? "" : " disabled"}>Run end-of-year attack simulation</button>
  </div>`;
}

function timelineTemplate(used) {
  const columns = resources.quarters.map((name, quarter) => {
    const builds = initiatives.filter((item) => state.plan[item.id] === quarter).map((item) => {
      const missing = missingFoundations(state.plan, item.id);
      const note = missing.length ? `<em>${strengthWord(missing.length)} strength: prerequisite not in place</em>` : "";
      return `<li class="q-chip accent-${escapeHtml(item.component)}" title="${escapeHtml(item.name)}">${escapeHtml(shortName(item))}${note}</li>`;
    }).join("");
    return `<div class="q-col"><div class="q-head"><b>${escapeHtml(name)}</b><small>${fteLabel(used.fte[quarter])}/${fteLabel(resources.fte[quarter])} FTE</small></div>
      <ul class="q-list">${builds || '<li class="q-empty">Nothing built yet</li>'}</ul></div>`;
  }).join("");
  // All attacks land after Q4, heaviest first, so players can see what counts most.
  const attacks = [...scenarios].sort(byWeight).map((scenario) => `<li class="incoming"><span class="threat-glyph" aria-hidden="true">▲</span><span><span class="incoming-title">${escapeHtml(scenario.title)}</span><span class="incoming-meta">${likelihoodBadge(scenario.likelihood)}<small>${weightLabel(scenario.weight)}</small></span></span></li>`).join("");
  const endPanel = `<div class="q-col q-end"><div class="q-head"><b>End of year</b><small>Incoming</small></div><ul class="q-list">${attacks}</ul></div>`;
  return `<section class="console year-console"><div class="console-bar"><span>Your year // builds, then the attacks</span><span class="console-lights"><i></i><i></i><i></i></span></div><div class="year">${columns}${endPanel}</div></section>`;
}

// Why a quarter button is disabled: budget blocks every quarter at once; team caps block one quarter.
function blockReason(item, quarter, used) {
  const without = { ...state.plan };
  delete without[item.id];
  const budgetLeft = resources.budgetK - spend(without).budgetK;
  if (item.costK > budgetLeft) return `Over budget: costs $${item.costK}K, $${budgetLeft}K left`;
  const busy = used.fte[quarter] - (state.plan[item.id] === quarter ? item.fte : 0);
  return `Not enough team in ${quarterName(quarter)}: needs ${fteLabel(item.fte)} FTE, ${fteLabel(busy)} of ${fteLabel(resources.fte[quarter])} used`;
}

function initiativeCard(item, used) {
  const placed = state.plan[item.id];
  const isPlaced = placed !== undefined;
  const blocked = [];
  const buttons = resources.quarters.map((name, quarter) => {
    const active = placed === quarter;
    const allowed = active || fits(state.plan, item.id, quarter);
    if (!allowed) blocked.push({ quarter, reason: blockReason(item, quarter, used) });
    const title = active ? `Remove from ${name}` : allowed ? `Build in ${name}` : blockReason(item, quarter, used);
    return `<button class="q-btn${active ? " active" : ""}" type="button" data-action="place" data-id="${escapeHtml(item.id)}" data-q="${quarter}" data-key="q-${escapeHtml(item.id)}-${quarter}" aria-pressed="${active}" title="${escapeHtml(title)}"${allowed ? "" : " disabled"}>${escapeHtml(name)}</button>`;
  }).join("");
  let reason = "";
  if (blocked.length) {
    const overBudget = blocked.find((entry) => entry.reason.startsWith("Over budget"));
    reason = overBudget ? overBudget.reason : `Not enough team in ${joinNames(blocked.map((entry) => quarterName(entry.quarter)))} (needs ${fteLabel(item.fte)} FTE)`;
  }
  const needs = (item.needs || []).map(nameOf);
  const unlocks = item.foundation ? unlocksOf(item.id).map((entry) => entry.name) : [];
  const missing = isPlaced ? missingFoundations(state.plan, item.id) : [];
  const warn = missing.length ? `<p class="init-warn">Runs at ${strengthWord(missing.length)} strength: ${escapeHtml(prereqProblems(state.plan, item.id))}.</p>` : "";
  const kind = KIND_LABEL[item.kind] ? `<span class="badge kind kind-${escapeHtml(item.kind)}">${escapeHtml(KIND_LABEL[item.kind])}</span>` : "";
  return `<article class="init-card accent-${escapeHtml(item.component)}${isPlaced ? " placed" : ""}">
    <div class="card-badges">${kind}${item.foundation ? '<span class="badge foundation">Foundation</span>' : ""}${isPlaced ? `<span class="badge placed-badge">Built ${escapeHtml(quarterName(placed))}</span>` : ""}</div>
    <h3>${escapeHtml(item.name)}</h3>
    <p class="init-does">${escapeHtml(item.does)}</p>
    <p class="init-cost">$${item.costK}K · ${fteLabel(item.fte)} FTE</p>
    ${needs.length ? `<p class="init-needs"><b>Needs:</b> ${escapeHtml(joinNames(needs))}</p>` : ""}
    ${unlocks.length ? `<p class="init-needs init-unlocks"><b>Unlocks:</b> ${escapeHtml(joinNames(unlocks))}</p>` : ""}
    ${warn}
    <div class="q-buttons" role="group" aria-label="Build quarter for ${escapeHtml(item.name)}">${buttons}</div>
    ${reason ? `<p class="q-reason">${escapeHtml(reason)}</p>` : ""}
    <p class="init-ref">${escapeHtml(item.ref)}</p>
  </article>`;
}

// Program work first, then tools; the sort is stable, so model order holds within each kind.
const byKind = (a, b) => (KIND_ORDER[a.kind] ?? 2) - (KIND_ORDER[b.kind] ?? 2);

// Desktop shows the plain header and every group. Below 560px the CSS swaps in the
// toggle header instead, and a closed group hides its cards.
function groupTemplate(component, used) {
  const items = initiatives.filter((item) => item.component === component.id).sort(byKind);
  const placed = items.filter((item) => state.plan[item.id] !== undefined).length;
  const open = state.openGroups.has(component.id);
  const id = escapeHtml(component.id);
  const cards = items.map((item) => initiativeCard(item, used)).join("");
  const toggle = `<h2 class="init-group-toggle-wrap"><button class="init-group-toggle" type="button" data-action="toggle-group" data-id="${id}" data-key="group-${id}" aria-expanded="${open}" aria-controls="group-body-${id}"><b>${escapeHtml(component.number)}</b><span class="toggle-title">${escapeHtml(component.title)}</span><span class="toggle-meta">${items.length} ${items.length === 1 ? "card" : "cards"} · ${placed} placed</span><i class="toggle-chevron" aria-hidden="true"></i></button></h2>`;
  return `<section class="init-group accent-${id}${open ? "" : " closed"}" aria-labelledby="group-${id}"><header class="init-group-head"><b>${escapeHtml(component.number)}</b><h2 id="group-${id}">${escapeHtml(component.title)}</h2><p>${escapeHtml(component.line)}</p></header>${toggle}<div class="init-group-body" id="group-body-${id}"><p class="init-group-line">${escapeHtml(component.line)}</p><div class="init-grid">${cards}</div></div></section>`;
}

function buildScreen() {
  const used = spend(state.plan);
  const count = Object.keys(state.plan).length;
  const header = `<p class="eyebrow">Phase 3 · Roadmap</p><h1>Build your <span>roadmap</span></h1>
    <div class="mission-objective"><span>Objective</span><p>Fund a one-year roadmap for ${escapeHtml(resources.company)}. At the end of the year, ${attackCountWord().toLowerCase()} attacks test your program. You can't cover everything, so choose. Win with a program score of ${winPercent}% or better: the average risk you cut, weighted by how likely each attack is.</p></div>
    <div class="briefing company"><strong>${escapeHtml(resources.company)}</strong><br>${escapeHtml(resources.blurb)}</div>
    <p class="game-note"><b>Illustrative game values:</b> budgets, costs, team sizes and how much each control cuts risk are made up for this game. They are not industry data.</p>`;
  const content = `${resourceBar(used)}${timelineTemplate(used)}
    <p class="definition rule-line">Program work makes tools work. A card runs at half strength for each prerequisite that isn't in place by its quarter, and only a card at full strength can stop an attack outright. Prerequisites can have their own prerequisites. Attacks land at the end of the year.</p>
    ${hintTemplate()}
    ${components.map((component) => groupTemplate(component, used)).join("")}
    <div class="path-actions build-actions"><span class="path-count">${count} ${count === 1 ? "initiative" : "initiatives"} placed</span><button class="button" type="button" data-action="run" data-key="run-bottom"${count ? "" : " disabled"}>Run end-of-year attack simulation</button></div>`;
  return stageShell(header, content);
}

/* Screen 4: the year plays out */

function whyLine(result) {
  const stopper = byId[result.scenario.stops].name;
  if (result.outcome === "prevented") return `${stopper} was built with its prerequisites in place, so it stopped this outright.`;
  const first = result.stopperLive
    ? `${stopper} was built but ran at ${strengthWord(result.stopperMissing.length)} strength: ${prereqProblems(state.plan, result.scenario.stops)}.`
    : `Nothing that stops this was built. ${stopper} would have.`;
  const sorted = [...result.contributions].sort((a, b) => b.cut - a.cut);
  let second = "Nothing you built cut this risk.";
  if (sorted.length === 1) second = `${byId[sorted[0].id].name} alone cut ${percent(result.reduction)}%.`;
  if (sorted.length > 1) second = `${joinNames(sorted.map((entry) => `${byId[entry.id].name} (${percent(entry.cut)}%)`))} together cut ${percent(result.reduction)}%.`;
  return `${first} ${second}`;
}

function outcomeTemplate(result) {
  if (result.outcome === "prevented") return '<div class="outcome"><b class="outcome-badge prevented">Prevented</b></div>';
  if (result.outcome === "reduced") return `<div class="outcome"><b class="outcome-badge reduced">Risk cut by ${percent(result.reduction)}%</b><span class="meter cut-meter" aria-hidden="true"><i data-meter="${percent(result.reduction)}"></i></span></div>`;
  const cut = result.reduction > 0 ? `<small>Risk cut by ${percent(result.reduction)}%</small>` : "";
  return `<div class="outcome"><b class="outcome-badge unprotected">Unprotected</b>${cut}</div>`;
}

// Sourced notes for attacks based on real incidents. Verified against saved copies of the
// CISA KEV feed and php.net in research/php-incident-2026-10/.
const REAL_WORLD = {
  php: "Based on PHP2Shell (CVE-2026-109618 and CVE-2026-109619). PHP shipped fixes on 21 Oct 2026, and CISA added both to its Known Exploited Vulnerabilities catalog on 26 Oct 2026, telling owners to evaluate each asset's internet exposure."
};

function attackCard(result, index, total, fresh) {
  return `<article class="attack-card ${result.outcome}${fresh ? " fresh" : ""}" id="attack-${index}">
    <span class="attack-meta"><span>Attack ${index + 1} of ${total}</span>${likelihoodBadge(result.scenario.likelihood)}<span>${weightLabel(result.scenario.weight)}</span></span>
    <h3>${escapeHtml(result.scenario.title)}</h3>
    <p>${escapeHtml(result.scenario.story)}</p>
    ${outcomeTemplate(result)}
    <p class="why">${escapeHtml(whyLine(result))}</p>
    ${REAL_WORLD[result.scenario.id] ? `<p class="real-world"><span>Real world</span>${escapeHtml(REAL_WORLD[result.scenario.id])}</p>` : ""}
  </article>`;
}

// The attack that cost the most score: weight times the risk left over.
function biggestExposure(results) {
  const worst = results.reduce((top, result) => {
    const lost = result.scenario.weight * (1 - result.reduction);
    return lost > top.lost ? { result, lost } : top;
  }, { result: null, lost: 1e-9 });
  return worst.result ? `Your biggest exposure: ${worst.result.scenario.title} (${worst.result.scenario.likelihood}).` : "Every attack was stopped outright.";
}

function summaryTemplate() {
  const { results, score, won } = state.run;
  return `<div class="run-summary${won ? " won" : " short"}">
    <p class="eyebrow">Program score</p>
    <div class="program-score"><strong>${percent(score)}%</strong><span class="verdict-tag">${won ? "Phase complete" : `Short of ${winPercent}%`}</span></div>
    <div class="meter score-meter${won ? " full" : ""}"><i data-meter="${percent(score)}"></i><b class="goal" data-meter="${winPercent}" aria-hidden="true"></b></div>
    <p class="score-scale"><span>0%</span><span><b aria-hidden="true">┃</b> Marker: win at ${winPercent}%</span><span>100%</span></p>
    <p class="exposure">${escapeHtml(biggestExposure(results))}</p>
    <div class="actions completion-actions"><button class="button secondary" type="button" data-action="adjust" data-key="adjust">Adjust roadmap</button><button class="button" type="button" data-action="finish" data-key="finish">Finish →</button></div>
  </div>`;
}

function yearScreen() {
  const { results } = state.run;
  const total = results.length;
  const done = state.reveal >= total;
  const dots = results.map((_, index) => `<i class="progress-dot${index === state.reveal - 1 ? " active" : ""}${index < state.reveal ? " complete" : ""}"></i>`).join("");
  const cards = results.slice(0, state.reveal).map((result, index) => attackCard(result, index, total, index === state.reveal - 1)).join("");
  const controls = done
    ? summaryTemplate()
    : `<div class="actions run-controls"><button class="button" type="button" data-action="next-attack" data-key="next-attack">Next attack →</button><button class="button secondary" type="button" data-action="show-all" data-key="show-all">Show all</button></div>`;
  const header = `<p class="eyebrow">Phase 4 · The year</p><h1>The year <span>plays out</span></h1><p>The year is over and the attacks arrive, one at a time, starting with the one that counts most toward your score.</p>`;
  const content = `<div class="incident-progress"><span class="answer-instruction">Attack ${Math.min(state.reveal, total)} of ${total}</span><div class="progress-dots">${dots}</div></div><div class="attack-list" aria-live="polite">${cards}</div>${controls}`;
  return stageShell(header, content);
}

/* Screen 5: finish */

// Three resource QR codes. The SVGs are generated elsewhere (dark modules on white),
// so each sits on its own white tile with a quiet zone so phones can scan it.
function qrTile(link) {
  return `<figure class="qr-tile"><span class="qr-frame"><img src="${escapeHtml(link.image)}" alt="QR code: ${escapeHtml(link.label)}" width="160" height="160"></span><figcaption><strong>${escapeHtml(link.label)}</strong><small>${escapeHtml(link.url)}</small></figcaption></figure>`;
}

function finishScreen() {
  return `<section class="completion"><div class="completion-card finish-card" aria-labelledby="completion-title">
    <img class="completion-logo" src="./assets/space-owasp.png" alt="OWASP space logo">
    <p class="eyebrow">Qualification confirmed</p>
    <h1 id="completion-title">Welcome, <span>Commander.</span></h1>
    <div class="ctf-award"><span>Hackers Challenge CTF token</span><code id="ctf-token">${escapeHtml(CTF_TOKEN)}</code><button class="button" type="button" data-action="copy" data-key="copy">Copy token</button></div>
    <section class="qr-section" aria-labelledby="qr-title"><h2 id="qr-title" class="qr-heading">Keep building your roadmap</h2><div class="qr-row">${RESOURCE_LINKS.map(qrTile).join("")}</div></section>
    <div class="actions completion-actions"><button class="button secondary" type="button" data-action="restart" data-key="restart">Start over</button></div>
  </div></section>`;
}

/* End-of-year attack simulation: a modal console above the dimmed roadmap */

// The overlay mounts in #sim-root, outside #main, so a repaint never kills the canvas
// mid-animation. The engine and renderer load on demand; if either fails, the dialog
// still offers the after-action report, so the flow never dead-ends.
let sim = null;
let simToken = 0;

function simButtons(done) {
  return done
    ? `<button class="button secondary" type="button" data-action="sim-back" data-key="sim-back">Back to roadmap</button><button class="button" type="button" data-action="sim-report" data-key="sim-report">See after-action report</button>`
    : `<button class="button secondary" type="button" data-action="sim-skip" data-key="sim-skip">Skip to results</button>`;
}

function simTemplate() {
  const company = escapeHtml(resources.company);
  return `<div class="sim-backdrop">
    <section class="sim-window console" role="dialog" aria-modal="true" aria-labelledby="sim-title" aria-describedby="sim-status" tabindex="-1">
      <div class="console-bar"><span id="sim-title">Attack simulation // ${company}</span><span class="console-lights" aria-hidden="true"><i></i><i></i><i></i></span></div>
      <div class="sim-body">
        <canvas class="sim-canvas" role="img" aria-label="Animation: ${escapeHtml(attackCountWord().toLowerCase())} attacks test the roadmap for ${company}. Each result is announced below."></canvas>
        <p class="sim-fallback" hidden>The animation couldn't load. Your results are ready in the after-action report.</p>
      </div>
      <div class="sim-foot">
        <div class="sim-health">
          <div class="resource-head"><span>Organization health</span><strong data-sim="health">100%</strong></div>
          <div class="meter score-meter sim-meter"><i data-meter="100"></i><b class="goal" data-meter="${winPercent}" aria-hidden="true"></b></div>
          <p class="score-scale"><span>0%</span><span><b aria-hidden="true">┃</b> Hold ${winPercent}%</span><span>100%</span></p>
        </div>
        <p class="sim-status" id="sim-status" aria-live="polite">Loading the simulation…</p>
        <div class="sim-actions" data-sim="actions">${simButtons(false)}</div>
      </div>
    </section>
  </div>`;
}

function setSimHealth(fraction) {
  const value = percent(Math.max(0, Math.min(1, fraction)));
  simRoot.querySelector(".sim-meter > i").dataset.meter = value;
  simRoot.querySelector(".sim-meter").classList.toggle("warn", fraction < WIN_BAR - 1e-9);
  simRoot.querySelector('[data-sim="health"]').textContent = `${value}%`;
  paintMeters(simRoot);
}

function setSimStatus(message, tone = "") {
  const status = simRoot.querySelector(".sim-status");
  status.textContent = message;
  status.classList.toggle("held", tone === "held");
  status.classList.toggle("below", tone === "below");
}

function shotMessage(shot) {
  const label = shot.label || scenarios.find((scenario) => scenario.id === shot.scenarioId)?.title || "Attack";
  const result = shot.outcome === "prevented" ? "prevented" : shot.outcome === "reduced" ? `risk cut ${percent(shot.reduction)}%` : "unprotected";
  return `${label}: ${result}. Health ${percent(Math.max(0, shot.healthAfter))}%.`;
}

function simShot(token, shot) {
  if (sim?.token !== token || sim.done) return;
  setSimHealth(shot.healthAfter);
  setSimStatus(shotMessage(shot));
}

// The verdict comes from runAll, the same source as the after-action report.
function simDone(token) {
  if (sim?.token !== token || sim.done) return;
  sim.done = true;
  track("simulator", "completed");
  const { score, won } = runAll(state.plan);
  if (sim.data && Math.abs(sim.data.finalHealth - score) > 1e-6) console.warn(`Attack simulation: engine finalHealth ${sim.data.finalHealth} differs from runAll score ${score}.`);
  setSimHealth(score);
  setSimStatus(won ? `Roadmap held: ${percent(score)}%` : `Below ${winPercent}%: ${percent(score)}%`, won ? "held" : "below");
  const actionsBox = simRoot.querySelector('[data-sim="actions"]');
  const hadFocus = actionsBox.contains(document.activeElement) || !simRoot.contains(document.activeElement);
  actionsBox.innerHTML = simButtons(true);
  if (hadFocus) actionsBox.querySelector('[data-key="sim-report"]').focus();
}

function simFallback(token, error) {
  if (sim?.token !== token) return;
  console.error("Attack simulation: sim/engine.js or sim/renderer.js failed to load or start. Showing results without the animation.", error);
  try { sim.controller?.destroy(); } catch (destroyError) { console.error(destroyError); }
  sim.controller = null;
  simRoot.querySelector(".sim-canvas").hidden = true;
  simRoot.querySelector(".sim-fallback").hidden = false;
  simDone(token);
}

function setBackgroundInert(on) {
  [main, document.querySelector(".topbar"), document.querySelector("footer"), document.querySelector(".skip-link")].forEach((element) => {
    if (element) element.inert = on;
  });
  document.body.classList.toggle("sim-open", on);
}

async function openSimulation(opener) {
  if (sim) return;
  const token = ++simToken;
  sim = { token, openerKey: opener?.dataset.key, controller: null, data: null, done: false, skipRequested: false };
  simRoot.innerHTML = simTemplate();
  paintMeters(simRoot);
  setBackgroundInert(true);
  document.addEventListener("keydown", simKeydown);
  simRoot.querySelector('[data-key="sim-skip"]').focus();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let engine;
  let renderer;
  try {
    [engine, renderer] = await Promise.all([import("./sim/engine.js"), import("./sim/renderer.js")]);
  } catch (error) {
    simFallback(token, error);
    return;
  }
  if (sim?.token !== token) return;
  try {
    sim.data = engine.buildSimulation(state.plan);
    setSimStatus(`${attackCountWord()} attacks incoming.`);
    const controller = renderer.mountSimulator(simRoot.querySelector(".sim-canvas"), sim.data, {
      reducedMotion,
      onShot: (shot) => simShot(token, shot),
      onDone: () => simDone(token)
    });
    // Closed while mounting: nothing is left to animate into.
    if (sim?.token !== token) {
      controller.destroy();
      return;
    }
    sim.controller = controller;
    if (sim.skipRequested) skipSimulation();
  } catch (error) {
    simFallback(token, error);
  }
}

function skipSimulation() {
  if (!sim || sim.done) return;
  if (!sim.controller) {
    sim.skipRequested = true;
    return;
  }
  sim.controller.skip();
  // The renderer should fire onDone from skip(); never leave the player without a way on.
  if (!sim.done) {
    console.warn("Attack simulation: skip() did not fire onDone.");
    simDone(sim.token);
  }
}

function closeSimulation({ restoreFocus = true } = {}) {
  if (!sim) return;
  const { controller, openerKey } = sim;
  sim = null;
  try { controller?.destroy(); } catch (error) { console.error("Attack simulation: destroy() failed.", error); }
  simRoot.innerHTML = "";
  setBackgroundInert(false);
  document.removeEventListener("keydown", simKeydown);
  if (restoreFocus && openerKey) main.querySelector(`[data-key="${CSS.escape(openerKey)}"]`)?.focus({ preventScroll: true });
}

// Esc skips while running and closes when done; Tab stays inside the dialog.
function simKeydown(event) {
  if (!sim) return;
  if (event.key === "Escape") {
    event.preventDefault();
    if (sim.done) closeSimulation(); else skipSimulation();
    return;
  }
  if (event.key !== "Tab") return;
  const dialog = simRoot.querySelector('[role="dialog"]');
  const focusable = [...dialog.querySelectorAll("button:not([disabled])")];
  if (!focusable.length) {
    event.preventDefault();
    dialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable.at(-1);
  const inside = dialog.contains(document.activeElement);
  if (event.shiftKey && (!inside || document.activeElement === first)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
    event.preventDefault();
    first.focus();
  }
}

/* Render and events */

const screens = [statScreen, briefingScreen, buildScreen, yearScreen, finishScreen];

function render({ newScreen = false } = {}) {
  // Full repaint drops focus, so remember the focused control by its data-key and restore it.
  const focusKey = document.activeElement?.dataset?.key;
  main.innerHTML = screens[state.screen]();
  paintMeters(main);
  if (state.screen === SCREEN.build) track("simulator", "started");
  if (state.screen === SCREEN.finish) {
    track("map", "started");
    track("map", "completed");
  }
  if (newScreen) {
    window.scrollTo({ top: 0, behavior: "instant" });
    main.focus({ preventScroll: true });
    return;
  }
  if (focusKey) main.querySelector(`[data-key="${CSS.escape(focusKey)}"]`)?.focus({ preventScroll: true });
}

function goTo(screen) {
  closeSimulation({ restoreFocus: false });
  if (state.screen === SCREEN.briefing && state.seen.size === components.length) track("protocols", "completed");
  state.screen = screen;
  render({ newScreen: true });
}

// After the simulation every attack has already landed, so the report opens fully revealed.
function runYear({ revealAll = false } = {}) {
  const { results, score, won } = runAll(state.plan);
  // Reveal heaviest first; the sort is stable, so equal weights keep model order.
  state.run = { results: [...results].sort((a, b) => byWeight(a.scenario, b.scenario)), score, won };
  state.reveal = revealAll ? results.length : 1;
  goTo(SCREEN.year);
}

function revealTo(count) {
  state.reveal = Math.min(count, state.run.results.length);
  render();
  const target = state.reveal >= state.run.results.length ? main.querySelector(".run-summary") : main.querySelector(`#attack-${state.reveal - 1}`);
  target?.scrollIntoView({ block: "nearest" });
}

async function copyToken(button) {
  try {
    await navigator.clipboard.writeText(CTF_TOKEN);
    button.textContent = "Copied!";
    notify("CTF token copied.");
  } catch {
    // No clipboard permission: select the token so the player can copy it by hand.
    const range = document.createRange();
    range.selectNodeContents(document.querySelector("#ctf-token"));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    notify("Token selected. Press Ctrl+C or ⌘C to copy.");
  }
}

// Hidden by default so players try first. Each line is backed by the exhaustive balance check.
function hintTemplate() {
  const body = state.hint ? `<ul class="hint-box" id="hint-box">
      <li>Do program work early, in Q1 and Q2, so your tools land at full strength.</li>
      <li>Cover the Likely attacks first. You can't cover all six.</li>
      <li>Every winning roadmap includes "Build your application inventory".</li>
    </ul>` : "";
  return `<div class="hint"><button class="button secondary hint-toggle" type="button" data-action="hint" data-key="hint" aria-expanded="${state.hint}" aria-controls="hint-box">${state.hint ? "Hide hint" : "Get a hint"}</button>${body}</div>`;
}

const actions = {
  hint() { state.hint = !state.hint; render(); },
  open(target) {
    const { id } = target.dataset;
    state.seen.add(id);
    if (state.expanded.has(id)) state.expanded.delete(id); else state.expanded.add(id);
    render();
  },
  go(target) { goTo(Number(target.dataset.to)); },
  back() { goTo(state.screen - 1); },
  place(target) {
    const { id } = target.dataset;
    const quarter = Number(target.dataset.q);
    if (state.plan[id] === quarter) delete state.plan[id];
    else if (fits(state.plan, id, quarter)) state.plan[id] = quarter;
    render();
  },
  "toggle-group"(target) {
    const { id } = target.dataset;
    if (state.openGroups.has(id)) state.openGroups.delete(id); else state.openGroups.add(id);
    render();
  },
  run(target) { if (Object.keys(state.plan).length) openSimulation(target); },
  "sim-skip"() { skipSimulation(); },
  "sim-back"() { closeSimulation(); },
  "sim-report"() { runYear({ revealAll: true }); },
  "next-attack"() { revealTo(state.reveal + 1); },
  "show-all"() { revealTo(state.run.results.length); },
  adjust() { goTo(SCREEN.build); },
  finish() { goTo(SCREEN.finish); },
  copy(target) { copyToken(target); },
  // A fresh start is a fresh participant: drop the tracker identity, then reload.
  restart() {
    resetActivityIdentity();
    window.location.reload();
  }
};

function returnToCommunity(event) {
  event.preventDefault();
  resetActivityIdentity();
  window.location.assign("/");
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.disabled) return;
  // While the simulation is open, only its own controls act, so the roadmap never repaints under it.
  if (sim && !simRoot.contains(target)) return;
  actions[target.dataset.action]?.(target);
});
document.querySelector(".brand").addEventListener("click", returnToCommunity);

track("protocols", "started");
render();
installIdleReset(() => actions.restart());
