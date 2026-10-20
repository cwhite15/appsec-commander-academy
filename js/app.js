import { academyConfig } from "./config.js";
import { checkAnswer, descriptionBlocks, findProtocol, protocols, totalCommands } from "./protocols.js";
import { assessIncident, canPlace, controlStatus, earliestStart, expectedLoss, findInitiative, findScenario, formatCoverage, effectivenessOf, formatImpact, formatPercent, foundationFactor, fullStrengthMonth, groups, helpfulInitiatives, impactOf, incidentRun, incidents, initiatives, landingMonth, levelAt, levelsAt, likelihoodDefinition, missingFoundations, optionCost, passingReadiness, penalties, phasesFor, postureOf, registerFor, runModes, sanitizeRoadmap, scenarios, scoreRoadmap, shippedFactor, startOf, startsFor, strengthenOptions, summarizeRun, supportedBy, totals, validRunMode, withinResources } from "./simulation.js";
import { buildIntro, checkMapAnswer, checkpoint as mapCheckpoint, fields, isRowComplete, isRowStarted, levels, maxFieldLength, rankRows, rowsFromSimulation, sanitizeRows, timelines } from "./roadmap.js";

const main = document.querySelector("#main");
const toast = document.querySelector("#toast");
const printRoot = document.querySelector("#print-root");
const missionIds = ["protocols", "simulator", "map"];
const missionMeta = {
  protocols: { number: "01", glyph: "◈", title: "The Command Protocols", skill: "Program components", summary: "Initiate the four protocols every AppSec program runs on, and prove you know why each one matters.", objective: "Work through Define, Evaluate, Integrate, and Measure. Initiate each command to read it, then pass the checkpoint for every protocol.", takeaway: "An AppSec program is strategy, people, workflow, and measurement, not a tool purchase." },
  simulator: { number: "02", glyph: "✦", title: "The Resource Gauntlet", skill: "Prioritization under pressure", summary: "Spend a limited budget and engineer-weeks against a company's risk register, then live through one possible timeline of incidents.", objective: `You're the new AppSec lead. Pick a company and spend its budget and engineering time on the controls that cut its risk the most. Remove at least ${passingReadiness}% of its expected loss from security incidents to pass. Your score updates live as you build.`, takeaway: "Invest against the risks you actually face, and fund the foundations that make your tools work. You cannot afford everything." },
  map: { number: "03", glyph: "⬡", title: "The Commander's Map", skill: "Roadmap planning", summary: "Turn what you learned into a stack-ranked plan you can take back to work.", objective: "Plan at least one complete initiative, let the map rank itself by impact and effort, and pass the final checkpoint to lock it in.", takeaway: "Stack-rank by impact vs. effort, and finish what you start." }
};

const emptyState = () => ({ complete: [], protocols: [], sim: { scenarioId: null, activated: [], starts: {}, runMode: runModes[0].id }, map: { rows: sanitizeRows([]), checkpointPassed: false } });
let state = loadState();
let lab = {};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(academyConfig.storageKey));
    if (!saved || typeof saved !== "object") return emptyState();
    const scenario = findScenario(saved.sim?.scenarioId);
    const roadmap = sanitizeRoadmap(scenario, saved.sim);
    return {
      complete: Array.isArray(saved.complete) ? missionIds.filter((id) => saved.complete.includes(id)) : [],
      protocols: Array.isArray(saved.protocols) ? protocols.map((protocol) => protocol.id).filter((id) => saved.protocols.includes(id)) : [],
      sim: { scenarioId: scenario ? scenario.id : null, activated: roadmap.activated, starts: roadmap.starts, runMode: validRunMode(saved.sim?.runMode) },
      map: { rows: sanitizeRows(saved.map?.rows), checkpointPassed: saved.map?.checkpointPassed === true }
    };
  } catch { return emptyState(); }
}

function saveState() {
  try { localStorage.setItem(academyConfig.storageKey, JSON.stringify(state)); } catch { /* storage unavailable: progress lasts for this page only */ }
}
function isComplete(id) { return state.complete.includes(id); }
function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2600);
}
const pause = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (milliseconds) => pause(reduceMotion() ? 0 : milliseconds);

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function shuffled(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

// Meter widths are applied through the CSSOM so the page needs no inline style attributes.
function paintMeters(root = document) {
  root.querySelectorAll("[data-meter]").forEach((element) => {
    element.style.width = `${Math.max(0, Math.min(100, Number(element.dataset.meter) || 0))}%`;
  });
}

function applyTheme() {
  const root = document.documentElement;
  const variableNames = { ink: "ink", panel: "panel", panelBright: "panel-bright", cyan: "cyan", teal: "teal", amber: "amber", coral: "coral", paper: "paper", muted: "muted" };
  Object.entries(academyConfig.theme).forEach(([key, value]) => root.style.setProperty(`--${variableNames[key]}`, value));
  document.querySelector("#academy-name").textContent = academyConfig.academy;
  document.querySelector("#event-name").textContent = academyConfig.event;
  document.querySelector("#brand-logo").src = academyConfig.assets.logo;
}

function homeTemplate() {
  const cards = missionIds.map((id, index) => {
    const item = missionMeta[id];
    const locked = index > 0 && !isComplete(missionIds[index - 1]);
    return `<article class="mission-card ${isComplete(id) ? "complete" : ""}" data-glyph="${item.glyph}">
      <span class="mission-number">Mission ${item.number} ${isComplete(id) ? "// Complete" : ""}</span>
      <h3>${item.title}</h3><span class="skill-tag">${item.skill}</span><p>${item.summary}</p>
      <a class="button ${locked ? "secondary" : ""}" href="${locked ? "#/" : `#/mission/${id}`}" ${locked ? 'aria-disabled="true"' : ""}>${isComplete(id) ? "Review mission" : locked ? "Complete prior mission" : "Begin mission"}</a>
    </article>`;
  }).join("");
  const allComplete = state.complete.length === missionIds.length;
  return `<section class="hero"><div class="hero-copy">
    <p class="eyebrow">${academyConfig.event} // ${academyConfig.program}</p>
    <h1>Take <span>command.</span></h1>
    <p class="lede">Every AppSec program runs on the same protocols. Learn the components, defend a roadmap under pressure, then build the plan you will take back to work.</p>
    <a class="button" href="${allComplete ? "#/complete" : "#curriculum"}">${allComplete ? "View qualification →" : "View training missions →"}</a>
    <div class="mission-brief"><span><strong>3</strong><br>Missions</span><span><strong>≈20</strong><br>Minutes</span><span><strong>${state.complete.length}/3</strong><br>Secured</span></div>
  </div></section>
  <section class="curriculum" id="curriculum"><div class="section-heading"><div><p class="eyebrow">Academy curriculum</p><h2>Build the program,<br>not the tool pile.</h2></div><div class="curriculum-intro"><p>No budget authority required. Learn what an AppSec program is made of, then practice the trade-offs every security leader makes.</p><img src="${academyConfig.assets.recruitmentPoster}" alt="AppSec Needs You recruitment poster featuring the AppSec cadet figure"></div></div><div class="mission-grid">${cards}</div></section>
  <section class="academy-ranks" aria-labelledby="academy-ranks-title"><div class="ranks-copy"><p class="eyebrow">Your academy path</p><h2 id="academy-ranks-title">Lead the mission.<br>Earn command.</h2><p>Commanders set direction for IT and security leadership: what the program protects, how it scales, and how it proves progress.</p></div><img src="${academyConfig.assets.rankPoster}" alt="AppSec Academy ranks: Cadets for beginners, Navigators for programmers, Communication Officers for AppSec professionals, and Commanders for IT and security leadership"></section>`;
}

function shell(id, content) {
  const item = missionMeta[id];
  return `<section class="mission-shell"><nav class="mission-nav"><a class="back-link" href="#/">← Academy deck</a><div class="progress-dots" aria-label="Mission progress">${missionIds.map((mid) => `<i class="progress-dot ${mid === id ? "active" : ""} ${isComplete(mid) ? "complete" : ""}"></i>`).join("")}</div></nav>
    <header class="mission-header"><div><p class="eyebrow">Mission ${item.number} // ${item.skill}</p><h1>${item.title}</h1><div class="mission-objective"><span>Objective</span><p>${item.objective}</p></div></div><span class="classification">Commander clearance</span></header>${content}</section>`;
}

function consoleBox(title, bodyId) {
  return `<section class="console"><div class="console-bar"><span>${title}</span><span class="console-lights"><i></i><i></i><i></i></span></div><div class="console-body" id="${bodyId}"></div></section>`;
}

function continueLinks(id) {
  const next = missionIds[missionIds.indexOf(id) + 1];
  return `<a class="button" href="${next ? `#/mission/${next}` : "#/complete"}">${next ? `Continue to mission ${missionMeta[next].number} →` : "Complete Commander qualification →"}</a><a class="button secondary" href="#/">Return to academy deck</a>`;
}

function completeMission(id) {
  if (!isComplete(id)) state.complete = missionIds.filter((mid) => mid === id || state.complete.includes(mid));
  saveState();
  notify(`Mission ${missionMeta[id].number} secured.`);
  const feedback = document.querySelector("#feedback");
  feedback.className = "feedback good mission-secured";
  feedback.innerHTML = `<strong>Mission secured.</strong><br>${missionMeta[id].takeaway}<br><small>Your verified result will remain on screen until you choose to continue.</small>`;
  document.querySelector(".repair-panel .actions").innerHTML = continueLinks(id);
  document.querySelectorAll(".repair-panel input").forEach((control) => { control.disabled = true; });
}

/* Mission 01: The Command Protocols */

function protocolUnlocked(index) {
  const firstOpen = protocols.findIndex((protocol) => !state.protocols.includes(protocol.id));
  return firstOpen === -1 || index <= firstOpen;
}

function detailTemplate(command) {
  const blocks = descriptionBlocks(command.desc).map((block) => {
    if (block.type === "list") return `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    return `<p class="${block.type}">${escapeHtml(block.text)}</p>`;
  }).join("");
  const table = command.table ? `<div class="table-wrap"><table class="sla-table"><thead><tr>${command.table.headers.map((header) => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${command.table.rows.map((row) => `<tr>${row.map((cell, index) => index === 0 ? `<th scope="row">${escapeHtml(cell)}</th>` : `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="table-caption">${escapeHtml(command.table.caption)}</p>` : "";
  return blocks + table;
}

function commandTemplate(protocol, command, index) {
  const key = `${protocol.id}-${index}`;
  const status = lab.pending === key ? "pending" : lab.initiated.has(key) ? "active" : "standby";
  const label = { pending: "Initiating…", active: "Active", standby: "Standby" }[status];
  const glyph = { pending: '<span class="thinking" aria-hidden="true"><i></i><i></i><i></i></span>', active: "✓", standby: "›" }[status];
  const expanded = status === "active" && lab.expanded === key;
  return `<div class="command"><button type="button" class="command-row ${status}${expanded ? " expanded" : ""}" data-command="${key}" aria-expanded="${expanded}"><span class="command-glyph">${glyph}</span><span class="command-name">${escapeHtml(command.name)}</span><span class="command-status">${label}</span></button>${expanded ? `<div class="command-detail">${detailTemplate(command)}</div>` : ""}</div>`;
}

function paintProtocolConsole() {
  const body = document.querySelector("#protocol-console");
  const protocol = findProtocol(lab.active);
  const readiness = Math.round((lab.initiated.size / totalCommands) * 100);
  const tabs = protocols.map((item, index) => {
    const passed = state.protocols.includes(item.id);
    return `<button type="button" role="tab" class="protocol-tab${item.id === lab.active ? " active" : ""}${passed ? " passed" : ""}" data-protocol="${item.id}" aria-selected="${item.id === lab.active}" ${protocolUnlocked(index) ? "" : "disabled"}><b>${item.number}</b>${item.title}${passed ? " ✓" : ""}</button>`;
  }).join("");
  body.innerHTML = `<div class="readiness"><div class="readiness-head"><span>Mission readiness</span><strong>${readiness}%</strong></div><div class="meter${readiness === 100 ? " full" : ""}"><i data-meter="${readiness}"></i></div><small>${lab.initiated.size}/${totalCommands} commands initiated</small></div>
    <div class="protocol-tabs" role="tablist" aria-label="Program protocols">${tabs}</div>
    <div class="protocol-heading"><span class="protocol-number">${protocol.number}</span><div><h2>${escapeHtml(protocol.title)}</h2><p>${escapeHtml(protocol.subtitle)}</p><p class="protocol-intro">${escapeHtml(protocol.intro)}</p></div></div>
    <div class="command-list">${protocol.commands.map((command, index) => commandTemplate(protocol, command, index)).join("")}</div>`;
  paintMeters(body);
}

function paintCheckpoint() {
  const panel = document.querySelector("#checkpoint-panel");
  const protocol = findProtocol(lab.active);
  const { checkpoint } = protocol;
  const passed = state.protocols.includes(protocol.id);
  const index = protocols.indexOf(protocol);
  const next = protocols[index + 1];
  const nextAction = next
    ? `<button class="button" type="button" data-goto="${next.id}">Next protocol: ${next.title} →</button>`
    : isComplete("protocols") ? continueLinks("protocols") : "";
  const choices = passed ? checkpoint.choices : shuffled(checkpoint.choices);
  panel.innerHTML = `<span class="step-label">Checkpoint // Protocol ${protocol.number}</span><h2>${escapeHtml(checkpoint.question)}</h2><p>Initiate the commands in this protocol, then transmit the answer you would defend to leadership.</p>
    <div class="patches">${choices.map((choice) => `<label class="patch"><input type="radio" name="checkpoint" value="${choice.id}"${passed && choice.id === checkpoint.correctId ? " checked" : ""}${passed ? " disabled" : ""}><span class="patch-content"><span class="patch-title">${escapeHtml(choice.label)}</span></span></label>`).join("")}</div>
    <div class="feedback${passed ? " good" : ""}" id="feedback" role="status">${passed ? `<strong>Protocol secured.</strong><br>${escapeHtml(checkpoint.takeaway)}` : "Select an answer, then transmit it."}</div>
    <div class="actions">${passed ? nextAction : '<button class="button" id="transmit" type="button">Transmit answer</button>'}</div>`;
}

function protocolsMission() {
  return shell("protocols", `<div class="workspace">${consoleBox("Command console // program protocols", "protocol-console")}<aside class="repair-panel" id="checkpoint-panel"></aside></div>`);
}

function bindProtocols() {
  const firstOpen = protocols.find((protocol) => !state.protocols.includes(protocol.id));
  lab = { active: (firstOpen || protocols[0]).id, initiated: new Set(), expanded: null, pending: null };
  const session = lab;
  paintProtocolConsole();
  paintCheckpoint();

  document.querySelector("#protocol-console").addEventListener("click", async (event) => {
    const tab = event.target.closest("[data-protocol]");
    if (tab) {
      if (tab.disabled || lab.pending) return;
      lab.active = tab.dataset.protocol;
      lab.expanded = null;
      paintProtocolConsole();
      paintCheckpoint();
      return;
    }
    const row = event.target.closest("[data-command]");
    if (!row || lab.pending) return;
    const key = row.dataset.command;
    if (lab.initiated.has(key)) {
      lab.expanded = lab.expanded === key ? null : key;
      paintProtocolConsole();
      document.querySelector(`[data-command="${key}"]`)?.focus();
      return;
    }
    lab.pending = key;
    paintProtocolConsole();
    await wait(academyConfig.timing.initiateMs);
    if (lab !== session) return;
    lab.initiated.add(key);
    lab.pending = null;
    lab.expanded = key;
    paintProtocolConsole();
    document.querySelector(`[data-command="${key}"]`)?.focus();
  });

  document.querySelector("#checkpoint-panel").addEventListener("click", (event) => {
    const goto = event.target.closest("[data-goto]");
    if (goto) {
      lab.active = goto.dataset.goto;
      lab.expanded = null;
      paintProtocolConsole();
      paintCheckpoint();
      document.querySelector(".workspace").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
      return;
    }
    if (!event.target.closest("#transmit")) return;
    const feedback = document.querySelector("#feedback");
    const selected = document.querySelector('input[name="checkpoint"]:checked');
    if (!selected) {
      feedback.className = "feedback bad";
      feedback.textContent = "Select an answer first.";
      return;
    }
    const result = checkAnswer(lab.active, selected.value);
    if (!result.correct) {
      feedback.className = "feedback bad";
      feedback.innerHTML = `<strong>Checkpoint failed.</strong><br>${escapeHtml(result.hint)}<br><small>Re-read the protocol, choose again, and transmit.</small>`;
      return;
    }
    if (!state.protocols.includes(lab.active)) state.protocols = protocols.map((protocol) => protocol.id).filter((id) => id === lab.active || state.protocols.includes(id));
    saveState();
    paintProtocolConsole();
    paintCheckpoint();
    if (state.protocols.length === protocols.length && !isComplete("protocols")) completeMission("protocols");
    else notify(`Protocol ${findProtocol(lab.active).number} secured.`);
  });
}

/* Mission 02: The Resource Gauntlet */

function activeScenario() { return findScenario(state.sim.scenarioId); }
const percentOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);
// Register totals move in small steps, so show them with one more digit than formatImpact.
const formatLoss = (amountK) => (amountK >= 1000 ? `$${(amountK / 1000).toFixed(2)}M` : formatImpact(amountK));
const optionName = (scenario, id) => `${postureOf(scenario, id) === "partial" ? "Upgrade " : ""}${findInitiative(id).short}`;
// Starts are offsets from the beginning of the timeline; on screen everything is a calendar month, 1..N.
const startPhrase = (start) => `month ${start + 1}`;
// The first calendar month a control is at full strength, given that the score samples each month at its midpoint.
const fullMonthOf = (fullBy) => Math.ceil(fullBy - 0.5) + 1;
const formatWeeks = (weeks) => String(Math.round(weeks * 10) / 10);
const phaseName = (phase, index) => `Phase ${index + 1} (months ${phase.start + 1}–${phase.end})`;
// Engineer-weeks as full-time people over the timeline (52.143 weeks a year).
const peopleOf = (scenario) => (scenario.engineerWeeks / ((scenario.months * 52.143) / 12)).toFixed(1);
const lowerFirst = (text) => text.charAt(0).toLowerCase() + text.slice(1);
const listJoin = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

function simulatorMission() {
  return shell("simulator", `<div class="workspace" id="sim-workspace">${consoleBox("Roadmap simulator // assess · fund · survive", "sim-console")}<aside class="repair-panel" id="sim-panel"></aside></div>`);
}

function briefingTemplate() {
  const cards = scenarios.map((scenario) => `<button type="button" class="scenario-card" data-scenario="${scenario.id}"><span class="skill-tag">${escapeHtml(scenario.tagline)}</span><h3>${escapeHtml(scenario.name)}</h3><p>${escapeHtml(scenario.description)}</p><span class="posture-story"><b>Today:</b> ${escapeHtml(scenario.postureStory)}</span><span class="stat-row"><span>Timeline <b>${scenario.months} months</b></span><span>Budget <b>$${scenario.budget}K</b></span><span>Team time <b>${scenario.engineerWeeks} eng-weeks</b> (≈${peopleOf(scenario)} people full-time)</span></span><span class="staffing">${escapeHtml(scenario.staffing)}</span></button>`).join("");
  return {
    console: `<div class="briefing"><strong>Assignment:</strong> Choose a company, assess what it already runs, and fund a roadmap against its risk register, then live through one possible timeline of incidents.</div><div class="scenario-grid">${cards}</div>`,
    panel: `<span class="step-label">Commander's brief</span><h2>You cannot fund everything.</h2><p>Each company is its own scenario, with a risk register of ${incidents.length} threats. A threat's likelihood times its impact is its expected loss.</p><p class="definition">${escapeHtml(likelihoodDefinition)}</p><p>Every company already runs some controls, some of them only partly. Fund new controls, upgrade partial ones, and mind the foundations: a scanner with nobody to fix its findings delivers a fraction of what it promises.</p><p>Controls take time. Each one ramps up over months after it starts, and engineer-weeks are budgeted by phase, so you can't start everything at once. Your score is the share of the company's inherent expected loss that its controls remove, what already runs plus what you fund: half for the loss avoided during the timeline, half for the risk you hand over at the end.</p><div class="protocol-list"><span>Read the risk drivers and the starting posture</span><span>Fund or upgrade controls, and choose when each one starts</span><span>Remove at least ${passingReadiness}% of the register's expected loss</span></div><div class="feedback" id="feedback">Choose a company to begin.</div><div class="actions"></div>`
  };
}

function mitigationSummary(initiative) {
  const parts = Object.entries(initiative.mitigates).map(([category, share]) => `${formatCoverage(category)} ${formatPercent(share)}`);
  if (initiative.containsAll) parts.push(`every other incident ${formatPercent(initiative.containsAll)} via containment`);
  return parts.join(" · ");
}

const missingText = (missing) => missing.map((item) => `${item.initiative.short} (−${formatPercent(item.penalty)})`).join(", ");

// "By month 6: cuts loss from injection by 35% (of 70%). Missing: Vulnerability Management (−50%)." is the lesson on every card.
function deliveryLine(status) {
  const { initiative, level, scenario } = status;
  if (initiative.foundation) {
    const penalty = penalties[initiative.id];
    const supported = listJoin(supportedBy(initiative.id).map((item) => item.short));
    return `<span class="delivery">Supports ${escapeHtml(supported)}. Without it, each delivers ${formatPercent(penalty)} less${level === 0.5 ? ` (${formatPercent(penalty / 2)} less while it's only partial)` : ""}.</span>`;
  }
  const threat = escapeHtml(formatCoverage(status.category));
  const missing = status.missing.length ? ` Missing: ${escapeHtml(missingText(status.missing))}.` : "";
  const ramping = status.funded && level > 0 && level < 1 ? ` Still ramping (${formatPercent(level)}).` : "";
  const newCodeOnly = shippedFactor(scenario, initiative, status.category) < 1
    ? ` Protects new code only: about ${formatPercent(scenario.newCodeShare)} of ${escapeHtml(scenario.name)}'s exposure is in code written during the ${scenario.months} months (an estimate).`
    : "";
  // "(of 70%)" only when the control falls short of its rating once rounded.
  const cut = (share) => `${formatPercent(share)}${formatPercent(share) === formatPercent(status.rated) ? "" : ` (of a possible ${formatPercent(status.rated)})`}`;
  const lead = level === 0
    ? `If funded now: would cut loss from ${threat} by ${cut(status.rated * status.factor * shippedFactor(scenario, initiative, status.category))} at full strength.`
    : `${status.posture === "partial" && !status.funded ? "As is (partial), by" : "By"} month ${scenario.months}: cuts loss from ${threat} by ${cut(status.delivered)}.`;
  return `<span class="delivery${status.missing.length ? " short" : ""}">${lead}${missing}${ramping}${newCodeOnly}</span>`;
}

// How long the control takes to pay off, and where it will be by the end of the timeline. A control counts as
// full strength only if it is at 100% in the last month, as the score samples it.
function rampLine(scenario, status) {
  if (status.posture === "in") return "";
  const ramp = status.initiative.rampMonths * (status.posture === "partial" ? 0.5 : 1);
  const starts = `${status.posture === "partial" ? "Upgrade starts" : "Starts"} ${startPhrase(status.start)}`;
  const text = !status.funded
    ? `Ramps up over ${formatWeeks(ramp)} ${ramp === 1 ? "month" : "months"}${status.posture === "partial" ? " from 50%" : ""}.`
    : status.level >= 1
      ? `${starts} · full strength ${fullMonthOf(status.fullBy) === status.start + 1 ? "the same month" : `from month ${fullMonthOf(status.fullBy)}`}.`
      : `${starts} · ${formatPercent(status.level)} ramped when the timeline ends.`;
  return `<span class="ramp">${text}</span>`;
}

function startPicker(scenario, id, start) {
  const options = startsFor(scenario).map((month) => {
    const allowed = month === start || canPlace(scenario, state.sim, id, month);
    return `<label><input type="radio" name="start-${id}" value="${month}" data-start-for="${id}"${month === start ? " checked" : ""}${allowed ? "" : " disabled"}><span>${month + 1}</span></label>`;
  }).join("");
  return `<fieldset class="start-phase"><legend>Start in month (1 = now)</legend><div class="segmented">${options}</div></fieldset>`;
}

// Why a control can't be funded at any start: the budget, the engineer-weeks, or no start where both fit.
function lockReason(scenario, id) {
  const withControl = (start) => ({ activated: [...state.sim.activated, id], starts: { ...state.sim.starts, [id]: start } });
  const starts = startsFor(scenario);
  if (!starts.some((start) => totals(scenario, withControl(start)).budget <= scenario.budget)) return "not enough budget left";
  if (!starts.some((start) => withinResources({ ...scenario, budget: Infinity }, withControl(start)))) return "not enough eng-weeks left in any phase";
  return "budget and eng-weeks don't fit at one start";
}

function controlCard(scenario, initiative) {
  const status = { ...controlStatus(scenario, state.sim, initiative.id), scenario };
  const badges = [
    initiative.foundation ? '<span class="badge foundation">Foundation</span>' : "",
    status.posture === "in" ? '<span class="badge in-place">In place</span>' : "",
    status.posture === "partial" ? `<span class="badge partial">${status.funded ? "Upgrading to full" : "Partial"}</span>` : ""
  ].filter(Boolean).join("");
  const body = `${badges ? `<span class="card-badges">${badges}</span>` : ""}<span class="patch-title">${escapeHtml(initiative.name)}</span>${status.note ? `<span class="posture-note">Today: ${escapeHtml(status.note)}</span>` : ""}<span class="initiative-desc">${escapeHtml(initiative.description)}</span>${initiative.foundation ? "" : `<span class="mitigates"><b>Cuts loss from:</b> ${escapeHtml(mitigationSummary(initiative))} (fully ramped, with its foundations)</span>`}${deliveryLine(status)}${rampLine(scenario, status)}`;
  if (status.posture === "in") return `<div class="patch initiative in-place"><span class="patch-content running">${body}<span class="cost">Running · no cost to your budget</span></span></div>`;
  const earliest = status.funded ? status.start : earliestStart(scenario, state.sim, initiative.id);
  const available = earliest !== null;
  const cost = optionCost(scenario, initiative.id, earliest ?? 0);
  const when = status.funded ? `, starting ${startPhrase(status.start)}` : earliest > 0 ? ` · fits from ${startPhrase(earliest)}` : "";
  const dollars = cost.budget > 0 ? `$${cost.budget}K` : "$0 (team time only)";
  const price = `${dollars} · ${formatWeeks(cost.weeks)} eng-weeks${available ? when : ` · Doesn't fit: ${lockReason(scenario, initiative.id)}`}`;
  return `<div class="initiative-card${status.funded ? " funded" : ""}"><label class="patch initiative${status.posture === "partial" ? " partial" : ""}"><input type="checkbox" name="initiative" value="${initiative.id}"${status.funded ? " checked" : ""}${available ? "" : " disabled"}><span class="patch-content">${body}<span class="cost">${status.posture === "partial" ? "Upgrade to full · " : ""}${price}</span></span></label>${status.funded ? startPicker(scenario, initiative.id, status.start) : ""}</div>`;
}

function groupTemplate(scenario, group) {
  const members = initiatives.filter((initiative) => initiative.group === group.id);
  const running = members.filter((initiative) => postureOf(scenario, initiative.id)).length;
  const selected = members.filter((initiative) => state.sim.activated.includes(initiative.id)).length;
  return `<details class="control-group" data-group="${group.id}"${lab.closedGroups.has(group.id) ? "" : " open"}><summary><span class="group-name">${escapeHtml(group.name)}</span><span class="group-meta">${escapeHtml(group.summary)} · ${members.length} controls · ${running} running today · ${selected} in your roadmap</span></summary><div class="initiative-grid">${members.map((initiative) => controlCard(scenario, initiative)).join("")}</div></details>`;
}

function lossTiles(loss) {
  return `<div class="loss-tiles"><span><small>Inherent (no controls)</small><strong>${formatLoss(loss.inherent)}</strong></span><span><small>Residual today</small><strong>${formatLoss(loss.current)}</strong></span><span><small>Residual with your roadmap</small><strong>${formatLoss(loss.target)}</strong></span></div>`;
}

// A details element that stays open across repaints once the attendee opens it.
const keptOpen = (key) => `data-keep="${key}"${lab.openDetails.has(key) ? " open" : ""}`;

// Every control that directly cuts this threat, and where it stands: running or funded, partial, or not funded.
function cutByTemplate(scenario, roadmap, category) {
  const chips = helpfulInitiatives(category).filter((item) => item.direct).map(({ initiative }) => {
    const posture = postureOf(scenario, initiative.id);
    const on = posture === "in" || roadmap.activated.includes(initiative.id);
    const [state, mark, label] = on ? ["on", " ✓", posture === "in" ? "running" : "in your roadmap"] : posture === "partial" ? ["half", " ½", "partial today"] : ["off", "", "not funded"];
    return `<span class="chip ${state}" title="${escapeHtml(initiative.short)}: ${label}">${escapeHtml(initiative.short)}${mark}<span class="sr-only"> (${label})</span></span>`;
  });
  return chips.length ? `<span class="cutby"><b>Cut by:</b> ${chips.join("")}</span>` : "";
}

// The unfunded control that would cut this threat most, as it would actually deliver with the roadmap's foundations
// (and the new-code cap), preferring one that still fits the remaining budget and engineer-weeks.
function leverTemplate(scenario, roadmap, category) {
  const levels = levelsAt(scenario, roadmap, scenario.months - 1);
  const options = helpfulInitiatives(category)
    .filter((item) => item.direct && postureOf(scenario, item.initiative.id) !== "in" && !roadmap.activated.includes(item.initiative.id))
    .map(({ initiative }) => ({ initiative, start: earliestStart(scenario, roadmap, initiative.id), missing: missingFoundations(initiative, levels), share: effectivenessOf(initiative, category) * foundationFactor(initiative, levels) * shippedFactor(scenario, initiative, category) }))
    .sort((x, y) => y.share - x.share);
  const fitting = options.filter((item) => item.start !== null);
  const best = fitting[0] || options[0];
  if (!best) return "";
  const verb = postureOf(scenario, best.initiative.id) === "partial" ? "Upgrade" : "Fund";
  const missing = best.missing.length ? `; missing ${escapeHtml(listJoin(best.missing.map((item) => item.initiative.short)))}` : "";
  const when = best.start === null ? "doesn't fit your remaining budget and eng-weeks" : `fits from ${startPhrase(best.start)}`;
  const blocked = fitting.length && options[0] !== best ? ` (${escapeHtml(options[0].initiative.short)}, up to ${formatPercent(options[0].share)}, no longer fits)` : "";
  return `<span class="lever"><b>${best.start === null ? "Biggest lever" : "Biggest lever that fits"}:</b> ${verb} ${escapeHtml(best.initiative.short)} (cuts up to ${formatPercent(best.share)}${missing}) · ${when}${blocked}</span>`;
}

// The register, biggest gap first: what's left of each threat, what cuts it, and the math behind it on request.
function registerTemplate(scenario, roadmap) {
  const register = [...registerFor(scenario, roadmap)].sort((x, y) => (y.target - x.target) || (y.inherent - x.inherent));
  const loss = expectedLoss(register);
  const largest = Math.max(...register.map((row) => row.inherent));
  const rows = register.map((row, index) => {
    const category = row.incident.coverageNeeded;
    const math = `<details class="row-math" ${keptOpen(`math-${row.incident.id}`)}><summary>The math</summary><p>Likelihood ${formatPercent(row.likelihood)} in ${scenario.months} months × impact ${formatImpact(row.impact)} = <b>${formatImpact(row.inherent)}</b> with no controls. ${formatImpact(row.current)} with what ${escapeHtml(scenario.name)} runs today. <b>${formatImpact(row.target)}</b> with your roadmap (${formatImpact(row.during)} averaged over the ${scenario.months} months, ${formatImpact(row.handover)} at handover, weighed equally).</p></details>`;
    return `<li class="register-row"><span class="register-head"><span>${escapeHtml(row.incident.title)}</span><b>${formatImpact(row.target)} left</b></span><small>of ${formatImpact(row.inherent)} · ${formatPercent(1 - row.target / row.inherent)} cut</small><span class="register-bar" aria-hidden="true"><i class="inherent" data-meter="${percentOf(row.inherent, largest)}"></i><i class="current" data-meter="${percentOf(row.current, largest)}"></i><i class="target" data-meter="${percentOf(row.target, largest)}"></i></span>${cutByTemplate(scenario, roadmap, category)}${index === 0 ? leverTemplate(scenario, roadmap, category) : ""}${math}</li>`;
  }).join("");
  const how = `<details class="how" ${keptOpen("how")}><summary>How these numbers work</summary><p>${escapeHtml(likelihoodDefinition)}</p><p>Impact is what the incident costs ${escapeHtml(scenario.name)} if nothing stops it: response, fraud, notification, downtime. It scales with company size and sector.</p><p>Expected loss = likelihood × impact over the company's timeline. If you know ALE, this is the same idea${scenario.months === 12 ? "" : ` over ${scenario.months} months instead of a year`}.</p><p>"Left" weighs two things equally, as your score does: the average over the ${scenario.months} months, and the rate you hand over at the end. The rows add up to the Residual with your roadmap tile, give or take rounding.</p></details>`;
  return `<span class="step-label">Risk register // expected loss</span>${lossTiles(loss)}<p class="register-intro">Expected loss is the average cost of a threat (its chance of happening × its cost), not a forecast. <b>Shrink the orange.</b></p>${how}<p class="register-legend"><span><i class="key target"></i>Left with your roadmap</span><span><i class="key current"></i>Your roadmap removes</span><span><i class="key inherent"></i>Already mitigated today</span></p><p class="register-legend chip-key"><span><span class="chip on">✓</span>Running or funded</span><span><span class="chip half">½</span>Partial today</span><span><span class="chip off">Name</span>Not funded</span></p><ol class="register">${rows}</ol>`;
}

// The live score: how much of the company's no-controls expected loss the roadmap removes, against the bar.
function scoreTemplate(scenario, score) {
  const gap = passingReadiness - score.readiness;
  const status = score.passed ? `Passing (${passingReadiness}% needed)` : `Pass at ${passingReadiness}% · ${gap} ${gap === 1 ? "point" : "points"} to go`;
  return `<div class="readiness live-score${score.passed ? " passed" : ""}"><div class="readiness-head"><span>Your score // Risk removed or mitigated</span><strong>${score.readiness}%</strong></div><div class="meter score-meter${score.passed ? " full" : ""}"><i data-meter="${score.readiness}"></i><b class="goal" data-meter="${passingReadiness}" aria-hidden="true"></b></div><small>${status} · ${escapeHtml(scenario.name)} started at ${score.dayOne}%</small><p>This score is the share of ${escapeHtml(scenario.name)}'s inherent expected loss from security incidents that its controls remove: what already runs plus what you fund. To raise it, fund controls, cover their foundations, and start them early: the score blends the protection you have during the ${scenario.months} months (${score.during}% removed) with what you hand over at the end (${score.handover}% removed).</p></div>`;
}

const rampClass = (level) => (level >= 1 ? "full" : level > 0 ? `ramp r${Math.ceil(level * 4)}` : "");

// Month by month: when each control in the roadmap starts and how far it has ramped (sampled mid-month, as the
// score is), with the phase starts and the months the incident run's five incidents land.
function roadmapTimelineTemplate(scenario, roadmap, run) {
  const months = Array.from({ length: scenario.months }, (_, month) => month);
  const phaseStart = (month) => (month > 0 && startsFor(scenario).includes(month) ? "phase-start" : "");
  const cell = (month, classes = "", text = "", title = "") => {
    const names = [phaseStart(month), classes].filter(Boolean).join(" ");
    return `<i${names ? ` class="${names}"` : ""}${title ? ` title="${escapeHtml(title)}"` : ""}>${text}</i>`;
  };
  const row = (label, cells, extra = "") => `<li class="gantt-row${extra}"><span class="gantt-label">${label}</span><span class="gantt-cells" aria-hidden="true">${cells}</span></li>`;
  const landings = run.map((_, index) => landingMonth(scenario, index));
  const controls = [...roadmap.activated].sort((a, b) => startOf(roadmap, a) - startOf(roadmap, b)).map((id) => {
    const start = startOf(roadmap, id);
    const atEnd = levelAt(scenario, roadmap, id, scenario.months - 1);
    const fullMonth = fullMonthOf(fullStrengthMonth(scenario, roadmap, id));
    const note = atEnd < 1 ? `${formatPercent(atEnd)} by month ${scenario.months}` : fullMonth === start + 1 ? "full the same month" : `full from month ${fullMonth}`;
    const cells = months.map((month) => {
      const level = levelAt(scenario, roadmap, id, month);
      return cell(month, rampClass(level), "", `Month ${month + 1}: ${formatPercent(level)}`);
    }).join("");
    return row(`${escapeHtml(optionName(scenario, id))}<small>Month ${start + 1} → ${note}</small>`, cells);
  }).join("");
  const axis = row("Month", months.map((month) => cell(month, "", month + 1)).join(""), " gantt-axis");
  const incidentsRow = row("Incidents land", months.map((month) => {
    const index = landings.indexOf(month);
    return index < 0 ? cell(month) : cell(month, "landing", index + 1, `Incident ${index + 1}: ${run[index].title}`);
  }).join(""), " gantt-incidents");
  const empty = roadmap.activated.length ? "" : '<p class="gantt-empty">Fund a control and it appears here: when it starts, and how fast it ramps up.</p>';
  return `<span class="step-label">Roadmap timeline // ${scenario.months} months</span><p class="resource-note">Each row is a control you funded. Shading deepens as it ramps up. Earlier starts mean more protected months, and a higher score.</p><ol class="gantt">${axis}${incidentsRow}${controls}</ol>${empty}<p class="register-legend gantt-legend"><span><i class="key ramp"></i>Ramping up</span><span><i class="key full"></i>Full strength</span><span><i class="key landing"></i>Incident lands</span><span><i class="key phase"></i>Phase starts</span></p>`;
}

// The incident run is a setting for the simulation: it picks which five incidents the attendee lives through.
function runModeTemplate(scenario, mode, run) {
  const current = runModes.find((item) => item.id === mode);
  const preview = run.map((incident, index) => `<li><b>Month ${landingMonth(scenario, index) + 1}</b> ${escapeHtml(incident.title)}</li>`).join("");
  const other = incidentRun(scenario, runModes.find((item) => item.id !== mode).id);
  const same = other.every((incident, index) => incident.id === run[index].id) ? ` At ${escapeHtml(scenario.name)}, both settings happen to send the same five.` : "";
  return `<fieldset class="run-mode"><legend>Simulation setting // incident run</legend><p>After you launch, five incidents from the register hit ${escapeHtml(scenario.name)}, spread across the ${scenario.months} months. This setting picks which five.</p><div class="segmented">${runModes.map((item) => `<label><input type="radio" name="run-mode" value="${item.id}"${item.id === mode ? " checked" : ""}><span>${escapeHtml(item.label)}</span></label>`).join("")}</div><p><b>${escapeHtml(current.label)}:</b> ${escapeHtml(lowerFirst(current.summary))}. ${escapeHtml(current.checks)}</p><ol class="run-preview">${preview}</ol><p class="run-note">It never changes your score, which always counts all ${incidents.length} threats.${same}</p></fieldset>`;
}

function buildTemplate(scenario) {
  const { activated, runMode } = state.sim;
  const spent = totals(scenario, state.sim);
  const budgetLeft = scenario.budget - spent.budget;
  const phases = phasesFor(scenario).map((phase, index) => ({ ...phase, left: phase.capacity - spent.phaseWeeks[index] }));
  const score = scoreRoadmap(scenario, state.sim);
  const { loss } = score;
  const run = incidentRun(scenario, runMode);
  const summary = `<div class="live-summary"><span>Score <b>${score.readiness}%</b> (pass ${passingReadiness}%)</span><span>$${budgetLeft}K left</span><span>Eng-weeks left ${phases.map((phase, index) => `P${index + 1} ${formatWeeks(phase.left)}`).join(" · ")}</span><span>Residual ${formatLoss(loss.current)} → <b>${formatLoss(loss.target)}</b></span></div>`;
  const phaseMeters = phases.map((phase, index) => `<div class="resource"><div class="resource-head"><span>Eng-weeks · ${phaseName(phase, index)}</span><strong>${formatWeeks(phase.left)} / ${formatWeeks(phase.capacity)}</strong></div><div class="meter"><i data-meter="${percentOf(phase.left, phase.capacity)}"></i></div></div>`).join("");
  return {
    console: `<div class="briefing"><strong>${escapeHtml(scenario.name)} // ${escapeHtml(scenario.tagline)}</strong><br>${escapeHtml(scenario.description)}</div><div class="evidence intel"><strong>Risk drivers:</strong> ${escapeHtml(scenario.threat)} ${escapeHtml(scenario.impactNote)}</div><div class="briefing posture"><strong>Starting posture:</strong> ${escapeHtml(scenario.postureStory)}</div><ul class="build-steps"><li>Tick a card to fund it, or to upgrade a partial control to full.</li><li>The "Cuts loss from" figures assume a control's foundations are in place and it has fully ramped up. The line under them shows what you'd actually get.</li><li>Costs cover setup plus running the control until month ${scenario.months}, sized for ${escapeHtml(scenario.name)}.</li></ul>${summary}${groups.map((group) => groupTemplate(scenario, group)).join("")}`,
    panel: `<span class="step-label">Resource bay</span><h2>${escapeHtml(scenario.name)}</h2>
      ${scoreTemplate(scenario, score)}
      <div class="resource"><div class="resource-head"><span>Budget remaining</span><strong>$${budgetLeft}K / $${scenario.budget}K</strong></div><div class="meter"><i data-meter="${percentOf(budgetLeft, scenario.budget)}"></i></div><small class="resource-sub">Tools and services. Your team's time is counted separately, in engineer-weeks.</small></div>
      ${phaseMeters}<p class="resource-note"><b>Your team:</b> ${escapeHtml(lowerFirst(scenario.staffing))} (≈${peopleOf(scenario)} people full-time). Each phase has its own engineer-weeks; any you don't use are lost. Controls already running cost you nothing.</p>
      ${roadmapTimelineTemplate(scenario, state.sim, run)}
      ${registerTemplate(scenario, state.sim)}
      ${runModeTemplate(scenario, runMode, run)}
      <div class="feedback" id="feedback">${activated.length ? `${activated.length} ${activated.length === 1 ? "control" : "controls"} in your roadmap. Launch to see five incidents play out.` : "Fund or upgrade at least one control to launch."}</div>
      <div class="actions"><button class="button" id="launch" type="button"${activated.length ? "" : " disabled"}>Launch simulation</button><button class="button secondary" id="change-scenario" type="button">Change company</button></div>`
  };
}

const outcomeLabels = { neutralized: "Stopped", contained: "Partly contained", breached: "Got through" };

function incidentLogTemplate(results) {
  return `<div class="incident-log">${results.map((result) => `<div class="${result.outcome}"><span>${escapeHtml(result.incident.title)}</span><em>${formatPercent(result.mitigation)} mitigated · −${formatImpact(result.impact)}</em></div>`).join("")}</div>`;
}

// "WAF 11% (of 30%, 38% ramped)": what the control delivered, with the reasons it fell short beside the number.
function contributorText(item) {
  const notes = [
    Math.round(item.effectiveness * 100) < Math.round(item.rated * 100) ? `of ${formatPercent(item.rated)}` : "",
    item.ramping ? `${formatPercent(item.level)} ramped` : item.level < 1 ? "partial" : ""
  ].filter(Boolean);
  return `${escapeHtml(item.initiative.short)} ${formatPercent(item.effectiveness)}${notes.length ? ` (${notes.join(", ")})` : ""}`;
}

// Two coaching lines: controls that would cut this threat, and missing foundations holding back the ones already in play.
function strengthenLines(scenario, roadmap, category) {
  const { controls, foundations } = strengthenOptions(scenario, roadmap, category);
  const lines = [];
  if (foundations.length) lines.push(`<b>Holding it back:</b> ${foundations.slice(0, 2).map((item) => `${item.upgrade ? "partial" : "no"} ${escapeHtml(item.initiative.short)} (weakens ${escapeHtml(listJoin(item.hampers.map((hampered) => hampered.short)))})`).join("; ")}`);
  if (controls.length) lines.push(`<b>Would strengthen it:</b> ${controls.map((item) => `${item.ramping ? `starting ${item.upgrade ? "the upgrade to " : ""}${escapeHtml(item.initiative.short)} earlier` : `${item.upgrade ? "upgrading " : ""}${escapeHtml(item.initiative.short)}`} (cuts ${formatPercent(item.effectiveness * shippedFactor(scenario, item.initiative, category))})`).join(" or ")}`);
  return lines;
}

// One cell per month: where the run's incidents land, which phases open, and where the run is now.
function timelineTemplate(scenario) {
  const landings = lab.run.map((_, index) => landingMonth(scenario, index));
  const cells = Array.from({ length: scenario.months }, (_, month) => {
    const index = landings.indexOf(month);
    const classes = [
      startsFor(scenario).includes(month) && month > 0 ? "phase-start" : "",
      index >= 0 ? "landing" : "",
      index === lab.index ? "active" : "",
      index >= 0 && index < lab.results.length ? lab.results[index].outcome : ""
    ].filter(Boolean).join(" ");
    return `<li${classes ? ` class="${classes}"` : ""}><span>${month + 1}</span></li>`;
  }).join("");
  return `<ol class="timeline" aria-label="${scenario.months}-month timeline with incident landing months">${cells}</ol>`;
}

function incidentTemplate(scenario) {
  const incident = lab.run[lab.index];
  const result = lab.revealed ? lab.results[lab.index] : null;
  const last = lab.index === lab.run.length - 1;
  let outcome;
  if (!result) {
    outcome = `<button class="button" id="assess" type="button"${lab.assessing ? " disabled" : ""}>${lab.assessing ? '<span class="thinking" aria-hidden="true"><i></i><i></i><i></i></span>&nbsp;Assessing…' : "Assess impact"}</button>`;
  } else {
    const threat = escapeHtml(formatCoverage(incident.coverageNeeded));
    const explanation = {
      neutralized: `Your controls removed ${formatPercent(result.mitigation)} of the loss from this incident.`,
      contained: `Your controls removed ${formatPercent(result.mitigation)} of the loss, but part of this incident got through.`,
      breached: result.mitigation > 0 ? `Only ${formatPercent(result.mitigation)} of the loss was stopped: what ${escapeHtml(scenario.name)} runs wasn't built for ${threat}, or wasn't strong enough yet.` : `Nothing ${escapeHtml(scenario.name)} runs addressed ${threat}. The threat slipped through.`
    }[result.outcome];
    const layers = result.contributors.length
      ? `<p class="lesson"><b>Controls in play:</b> ${result.contributors.map(contributorText).join(" · ")}${result.contributors.length > 1 ? ` → ${formatPercent(result.mitigation)} together (overlaps counted once)` : ""}</p>`
      : "";
    const pending = result.notStarted.length
      ? `<p class="lesson"><b>Not started yet:</b> ${result.notStarted.map((item) => `${item.upgrade ? `the ${escapeHtml(item.initiative.short)} upgrade` : escapeHtml(item.initiative.short)} (starts ${startPhrase(item.start)})`).join(", ")}</p>`
      : "";
    const coaching = result.outcome === "neutralized" ? [] : strengthenLines(scenario, lab.roadmap, incident.coverageNeeded);
    outcome = `<div class="verdict"><strong>${outcomeLabels[result.outcome]}</strong><p>${explanation}</p></div><div class="impact-grid"><span><small>Loss avoided</small><strong>${formatImpact(result.potential - result.impact)}</strong></span><span><small>Loss taken</small><strong>−${formatImpact(result.impact)}</strong></span></div>${layers}${pending}${coaching.map((line) => `<p class="lesson">${line}</p>`).join("")}`;
  }
  const nextButton = result ? `<button class="button" id="next-incident" type="button">${last ? "View results" : "Next incident"} →</button>` : "";
  const sofar = summarizeRun(lab.results);
  const mode = runModes.find((item) => item.id === lab.mode);
  const month = landingMonth(scenario, lab.index);
  return {
    console: `<div class="incident-progress"><span class="answer-instruction">Incident ${lab.index + 1} of ${lab.run.length} // month ${month + 1} of ${scenario.months}</span><div class="progress-dots">${lab.run.map((_, index) => `<i class="progress-dot ${index === lab.index ? "active" : ""} ${index < lab.results.length ? "complete" : ""}"></i>`).join("")}</div></div>
      ${timelineTemplate(scenario)}
      <article class="incident-card ${result ? result.outcome : ""}"><span class="severity ${incident.severity}">${incident.severity} // month ${month + 1}</span><h3>${escapeHtml(incident.title)}</h3><p>${escapeHtml(incident.description)}</p>${result ? "" : `<p class="stakes">Potential impact at ${escapeHtml(scenario.name)}: <b>${formatImpact(impactOf(incident, scenario))}</b> · likelihood <b>${formatPercent(scenario.riskRegister[incident.id])}</b> in ${scenario.months} months</p>`}${outcome}</article><div class="actions incident-actions">${nextButton}</div>`,
    panel: `<span class="step-label">Incident log // ${escapeHtml(scenario.name)}</span><h2>${escapeHtml(mode.label)}</h2><p class="resource-note">At ${escapeHtml(scenario.name)}: ${escapeHtml(lowerFirst(mode.summary))}. Your score comes from the whole register, not just these five.</p><div class="resource-head"><span>Loss taken so far</span><strong>${formatImpact(sofar.financialImpact)} of ${formatImpact(sofar.exposure)}</strong></div>${lab.results.length ? incidentLogTemplate(lab.results) : "<p>No incidents assessed yet.</p>"}<div class="feedback" id="feedback">Your roadmap: ${lab.roadmap.activated.map((id) => `${escapeHtml(optionName(scenario, id))} (starts ${startPhrase(lab.roadmap.starts[id])})`).join(", ")}</div><div class="actions"></div>`
  };
}

function budgetComparison(run, scenario) {
  if (!run.financialImpact) return `<p class="stakes">No losses this run. The ${formatImpact(scenario.budget)} program paid for itself.</p>`;
  const ratio = run.financialImpact / scenario.budget;
  return `<p class="stakes">This run's loss, <b>${formatImpact(run.financialImpact)}</b>, is ${ratio >= 1 ? `${ratio.toFixed(1)}× the whole ${formatImpact(scenario.budget)} program budget` : `${Math.round(ratio * 100)}% of the ${formatImpact(scenario.budget)} program budget`}.</p>`;
}

// The register rows with the most expected loss left, each with what would cut it further.
function gapsTemplate(scenario, register) {
  return [...register].sort((a, b) => b.target - a.target).slice(0, 3).map((row) => {
    const lines = strengthenLines(scenario, lab.roadmap, row.incident.coverageNeeded);
    return `<li><strong>${escapeHtml(row.incident.title)}</strong>: ${formatImpact(row.target)} expected loss left (${formatPercent(row.targetMitigation)} mitigated)${lines.map((line) => `<br><small>${line}</small>`).join("")}</li>`;
  }).join("");
}

function resultsTemplate(scenario) {
  const run = summarizeRun(lab.results);
  const score = scoreRoadmap(scenario, lab.roadmap);
  const register = registerFor(scenario, lab.roadmap);
  const other = runModes.find((item) => item.id !== lab.mode);
  const sameRun = incidentRun(scenario, other.id).every((incident, index) => incident.id === lab.run[index].id);
  const header = `<span class="step-label">After-action report // ${escapeHtml(scenario.name)}</span>`;
  const gaps = `<ol class="gap-list">${gapsTemplate(scenario, register)}</ol>`;
  return {
    console: `<div class="sim-score"><p class="eyebrow">${score.tier.label}</p><div class="score-orbit"><strong>${score.readiness}</strong><span>% of risk removed<br>or mitigated<br>${score.passed ? "Passed" : `Need ${passingReadiness}%`}</span></div><p>${score.tier.desc}</p></div>
      <p class="stakes">This run's five incidents cost <b>${formatImpact(run.financialImpact)}</b>. Across all ${register.length} threats, your roadmap cut ${escapeHtml(scenario.name)}'s residual risk to <b>${formatImpact(score.loss.during)}</b> over the ${scenario.months} months (${score.during}% removed) and <b>${formatImpact(score.loss.handover)}</b> at handover (${score.handover}% removed). Your score weighs those two equally: ${formatLoss(score.loss.target)}, shown below as Residual with your roadmap. It started at ${formatImpact(score.loss.current)} (${score.dayOne}% removed), against ${formatImpact(score.loss.inherent)} inherent.</p>
      ${lossTiles(score.loss)}
      <div class="stat-tiles"><span><strong>${run.defendedCount}</strong><small>Stopped</small></span><span><strong>${run.containedCount}</strong><small>Partly contained</small></span><span><strong>${run.breachedCount}</strong><small>Got through</small></span><span><strong>${formatImpact(run.financialImpact)}</strong><small>Loss this run</small></span></div>${incidentLogTemplate(lab.results)}
      <div class="actions">${sameRun ? "" : `<button class="button secondary" id="other-year" type="button">Replay with the other setting: ${escapeHtml(other.label)} →</button>`}${score.passed ? '<button class="button secondary" data-action="rebuild" type="button">Rebuild roadmap</button>' : ""}</div><p class="resource-note">${sameRun ? `Both settings send the same five incidents at ${escapeHtml(scenario.name)}, so there's no other run to replay.` : "Same roadmap, the other way of picking five incidents. Your score doesn't change."}</p>`,
    panel: score.passed
      ? `${header}<h2>Roadmap verified.</h2><p>With your roadmap, ${escapeHtml(scenario.name)}'s controls remove ${score.readiness}% of its expected loss. No roadmap removes all of it. The biggest risks you're still carrying:</p>${gaps}${budgetComparison(run, scenario)}<div class="feedback" id="feedback"></div><div class="actions"></div>`
      : `${header}<h2>The roadmap did not hold.</h2><p>With your roadmap, ${escapeHtml(scenario.name)}'s controls remove ${score.readiness}% of its expected loss; it needs ${passingReadiness}%. The biggest risks left:</p>${gaps}${budgetComparison(run, scenario)}<div class="feedback bad" id="feedback"><strong>Verification failed.</strong><br><small>Check what's holding your controls back, rebalance against the register, and launch again.</small></div><div class="actions"><button class="button" data-action="rebuild" type="button">Rebuild roadmap</button><button class="button secondary" id="change-scenario" type="button">Change company</button></div>`,
    passed: score.passed
  };
}

function paintSimulator(focusSelector) {
  const scenario = activeScenario();
  const view = lab.phase === "briefing" || !scenario ? briefingTemplate()
    : lab.phase === "build" ? buildTemplate(scenario)
      : lab.phase === "incidents" ? incidentTemplate(scenario)
        : resultsTemplate(scenario);
  document.querySelector("#sim-console").innerHTML = view.console;
  document.querySelector("#sim-panel").innerHTML = view.panel;
  paintMeters(document.querySelector("#sim-workspace"));
  if (focusSelector) document.querySelector(focusSelector)?.focus();
  if (lab.phase === "results" && view.passed) completeMission("simulator");
}

function startRun(mode) {
  Object.assign(lab, { phase: "incidents", index: 0, results: [], revealed: false, assessing: false, mode, run: incidentRun(activeScenario(), mode) });
  paintSimulator("#assess");
  document.querySelector("#sim-workspace").scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
}

function bindSimulator() {
  lab = { phase: activeScenario() ? "build" : "briefing", index: 0, results: [], revealed: false, assessing: false, closedGroups: new Set(), openDetails: new Set() };
  const workspace = document.querySelector("#sim-workspace");
  paintSimulator();

  workspace.addEventListener("change", (event) => {
    if (lab.phase !== "build") return;
    const startInput = event.target.closest("input[data-start-for]");
    if (startInput) {
      const id = startInput.dataset.startFor;
      const start = Number(startInput.value);
      if (state.sim.activated.includes(id) && canPlace(activeScenario(), state.sim, id, start)) state.sim.starts = { ...state.sim.starts, [id]: start };
      saveState();
      paintSimulator(`input[name="start-${id}"][value="${state.sim.starts[id]}"]`);
      return;
    }
    const mode = event.target.closest('input[name="run-mode"]');
    if (mode) {
      state.sim.runMode = validRunMode(mode.value);
      saveState();
      paintSimulator(`input[name="run-mode"][value="${state.sim.runMode}"]`);
      return;
    }
    const input = event.target.closest('input[name="initiative"]');
    if (!input) return;
    const id = input.value;
    const start = earliestStart(activeScenario(), state.sim, id);
    if (input.checked && start !== null && !state.sim.activated.includes(id)) {
      state.sim.activated = [...state.sim.activated, id];
      state.sim.starts = { ...state.sim.starts, [id]: start };
    } else if (!input.checked) {
      state.sim.activated = state.sim.activated.filter((item) => item !== id);
      const { [id]: _removed, ...starts } = state.sim.starts;
      state.sim.starts = starts;
    }
    saveState();
    paintSimulator(`input[name="initiative"][value="${input.value}"]`);
  });

  // Remember collapsed groups across repaints. toggle does not bubble, so listen in the capture phase.
  workspace.addEventListener("toggle", (event) => {
    const keep = event.target.dataset?.keep;
    if (keep) {
      if (event.target.open) lab.openDetails.add(keep);
      else lab.openDetails.delete(keep);
      return;
    }
    const group = event.target.dataset?.group;
    if (!group) return;
    if (event.target.open) lab.closedGroups.delete(group);
    else lab.closedGroups.add(group);
  }, true);

  workspace.addEventListener("click", async (event) => {
    const scenarioCard = event.target.closest("[data-scenario]");
    if (scenarioCard) {
      state.sim = { ...state.sim, scenarioId: scenarioCard.dataset.scenario, activated: [], starts: {} };
      saveState();
      lab.phase = "build";
      paintSimulator();
      return;
    }
    if (event.target.closest("#change-scenario")) {
      state.sim = { ...state.sim, scenarioId: null, activated: [], starts: {} };
      saveState();
      lab.phase = "briefing";
      paintSimulator();
      return;
    }
    if (event.target.closest("#launch")) {
      if (!state.sim.activated.length) return;
      lab.roadmap = { activated: [...state.sim.activated], starts: { ...state.sim.starts } };
      startRun(state.sim.runMode);
      return;
    }
    if (event.target.closest("#other-year")) {
      state.sim.runMode = runModes.find((item) => item.id !== lab.mode).id;
      saveState();
      startRun(state.sim.runMode);
      return;
    }
    if (event.target.closest('[data-action="rebuild"]')) {
      lab.phase = "build";
      paintSimulator();
      return;
    }
    if (event.target.closest("#assess")) {
      if (lab.assessing || lab.revealed) return;
      const session = lab;
      lab.assessing = true;
      paintSimulator();
      await wait(academyConfig.timing.assessMs);
      if (lab !== session) return;
      const scenario = activeScenario();
      lab.results.push(assessIncident(lab.run[lab.index], scenario, lab.roadmap, landingMonth(scenario, lab.index)));
      lab.assessing = false;
      lab.revealed = true;
      paintSimulator("#next-incident");
      return;
    }
    if (event.target.closest("#next-incident")) {
      const last = lab.index === lab.run.length - 1;
      if (last) lab.phase = "results";
      else { lab.index += 1; lab.revealed = false; }
      paintSimulator(last ? null : "#assess");
    }
  });
}

/* Mission 03: The Commander's Map */

const levelLabel = (id) => levels.find((level) => level.id === id)?.label || "";
const timelineLabel = (id) => timelines.find((timeline) => timeline.id === id)?.label || "";

function slotStatus(row) {
  return isRowComplete(row) ? "Complete" : isRowStarted(row) ? "In progress" : "Open";
}

function selectField(rowIndex, id, label, options, value) {
  return `<div class="lab-field third"><label for="r${rowIndex}-${id}">${label}</label><select id="r${rowIndex}-${id}" data-row="${rowIndex}" data-field="${id}"><option value="">Select…</option>${options.map((option) => `<option value="${option.id}"${value === option.id ? " selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}</select></div>`;
}

function slotTemplate(row, index) {
  const inputs = fields.map((field) => `<div class="lab-field ${field.id === "initiative" || field.id === "goal" ? "wide" : "half"}"><label for="r${index}-${field.id}">${escapeHtml(field.label)}</label><input id="r${index}-${field.id}" data-row="${index}" data-field="${field.id}" maxlength="${maxFieldLength}" placeholder="${escapeHtml(field.example)}" value="${escapeHtml(row[field.id])}" autocomplete="off"></div>`).join("");
  return `<fieldset class="map-slot"><legend>Initiative 0${index + 1} // <span id="slot-status-${index}">${slotStatus(row)}</span></legend><div class="field-grid">${inputs}${selectField(index, "timeline", "Timeline", timelines, row.timeline)}${selectField(index, "impact", "Impact", levels, row.impact)}${selectField(index, "effort", "Effort", levels, row.effort)}</div></fieldset>`;
}

function rankListTemplate() {
  const ranked = rankRows(state.map.rows);
  if (!ranked.length) return '<p class="rank-empty">Start an initiative and it will appear here, ranked.</p>';
  return ranked.map((row, index) => `<div class="rank-item"><b>${index + 1}</b><div><strong>${escapeHtml(row.initiative.trim() || "Untitled initiative")}</strong><small><span class="priority-tag">${row.priority}</span> · Impact ${levelLabel(row.impact) || "?"} / Effort ${levelLabel(row.effort) || "?"} · ${timelineLabel(row.timeline) || "No timeline"}</small></div></div>`).join("");
}

function paintMapConsole() {
  const imported = state.sim.activated.length;
  document.querySelector("#map-console").innerHTML = `<div class="briefing"><strong>Protocol 05 // Build your map.</strong> ${escapeHtml(buildIntro)}</div>${imported ? `<button class="suggestion" id="import-sim" type="button">Start from my simulator roadmap (${Math.min(imported, 3)} ${imported === 1 ? "initiative" : "initiatives"})</button>` : ""}<form id="map-form" novalidate>${state.map.rows.map(slotTemplate).join("")}</form>`;
}

function paintMapPanel() {
  const passed = state.map.checkpointPassed;
  const choices = passed ? mapCheckpoint.choices : shuffled(mapCheckpoint.choices);
  const anyStarted = state.map.rows.some(isRowStarted);
  document.querySelector("#map-panel").innerHTML = `<span class="step-label">Stack rank</span><h2>Your map, ranked.</h2><p>Highest impact first, then lowest effort. Start at the top and build credibility.</p><div class="rank-list" id="rank-list">${rankListTemplate()}</div>
    <hr class="panel-divider"><span class="step-label">Final checkpoint</span><h3 class="checkpoint-question">${escapeHtml(mapCheckpoint.question)}</h3>
    <div class="patches">${choices.map((choice) => `<label class="patch"><input type="radio" name="map-checkpoint" value="${choice.id}"${passed && choice.id === mapCheckpoint.correctId ? " checked" : ""}><span class="patch-content"><span class="patch-title">${escapeHtml(choice.label)}</span></span></label>`).join("")}</div>
    <div class="feedback" id="feedback" role="status">Complete at least one initiative, answer the checkpoint, then lock in your map.</div>
    <div class="actions"><button class="button" id="lock-map" type="button">Lock in map</button><button class="button secondary" id="print-map" type="button"${anyStarted ? "" : " disabled"}>Print my map</button></div>`;
}

function mapMission() {
  return shell("map", `<div class="workspace map-workspace">${consoleBox("Commander's map // 30 · 60 · 90 · 180 · 360", "map-console")}<aside class="repair-panel" id="map-panel"></aside></div>`);
}

function bindMap() {
  lab = {};
  paintMapConsole();
  paintMapPanel();
  const consoleBody = document.querySelector("#map-console");
  const panel = document.querySelector("#map-panel");

  const updateRow = (event) => {
    const target = event.target.closest("[data-row][data-field]");
    if (!target) return;
    const index = Number(target.dataset.row);
    const row = state.map.rows[index];
    if (!row || !(target.dataset.field in row)) return;
    row[target.dataset.field] = target.value.slice(0, maxFieldLength);
    saveState();
    document.querySelector(`#slot-status-${index}`).textContent = slotStatus(row);
    document.querySelector("#rank-list").innerHTML = rankListTemplate();
    document.querySelector("#print-map").disabled = !state.map.rows.some(isRowStarted);
  };
  consoleBody.addEventListener("input", updateRow);
  consoleBody.addEventListener("change", updateRow);

  consoleBody.addEventListener("click", (event) => {
    if (!event.target.closest("#import-sim")) return;
    if (state.map.rows.some(isRowStarted) && !window.confirm("Replace your current map with your simulator initiatives?")) return;
    state.map.rows = sanitizeRows(rowsFromSimulation(activeScenario(), state.sim));
    saveState();
    paintMapConsole();
    document.querySelector("#rank-list").innerHTML = rankListTemplate();
    document.querySelector("#print-map").disabled = false;
    notify("Simulator initiatives imported. Add metrics, timelines, impact, and effort.");
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("#print-map")) { printMap(); return; }
    if (!event.target.closest("#lock-map")) return;
    const feedback = document.querySelector("#feedback");
    if (!state.map.rows.some(isRowComplete)) {
      feedback.className = "feedback bad";
      feedback.innerHTML = "<strong>Map incomplete.</strong><br>Fill in every field for at least one initiative, including timeline, impact, and effort.";
      return;
    }
    const selected = document.querySelector('input[name="map-checkpoint"]:checked');
    if (!selected) {
      feedback.className = "feedback bad";
      feedback.textContent = "Answer the final checkpoint before locking in your map.";
      return;
    }
    const result = checkMapAnswer(selected.value);
    if (!result.correct) {
      feedback.className = "feedback bad";
      feedback.innerHTML = `<strong>Checkpoint failed.</strong><br>${escapeHtml(result.hint)}<br><small>Choose again, then lock in your map.</small>`;
      return;
    }
    state.map.checkpointPassed = true;
    completeMission("map");
    const actions = document.querySelector(".repair-panel .actions");
    actions.insertAdjacentHTML("beforeend", '<button class="button secondary" id="print-map" type="button">Print my map</button>');
  });
}

function printMap() {
  const ranked = rankRows(state.map.rows);
  if (!ranked.length) { notify("Add an initiative before printing."); return; }
  printRoot.innerHTML = `<h1>AppSec Roadmap // Commander's Map</h1><p>${escapeHtml(academyConfig.event)} · ${escapeHtml(academyConfig.academy)} · ${escapeHtml(new Date().toLocaleDateString())}</p><p>${escapeHtml(buildIntro)}</p>
    <table><thead><tr><th>#</th><th>Initiative</th><th>Goal / Outcome</th><th>Metric for success</th><th>Timeline</th><th>Investment</th><th>Impact / Effort</th><th>Priority</th></tr></thead><tbody>${ranked.map((row, index) => `<tr><td>${index + 1}</td><td>${escapeHtml(row.initiative)}</td><td>${escapeHtml(row.goal)}</td><td>${escapeHtml(row.metric)}</td><td>${escapeHtml(timelineLabel(row.timeline))}</td><td>${escapeHtml(row.investment)}</td><td>${escapeHtml(levelLabel(row.impact))} / ${escapeHtml(levelLabel(row.effort))}</td><td>${escapeHtml(row.priority)}</td></tr>`).join("")}</tbody></table>
    <p>Checkpoint at 90 days and adjust. Re-evaluate at 360 days by rerunning Protocol 01: Define.</p>`;
  window.print();
}

/* Completion, reset, routing */

function completionTemplate() {
  const anyStarted = state.map.rows.some(isRowStarted);
  return `<section class="completion"><div class="completion-card" role="dialog" aria-modal="true" aria-labelledby="completion-title"><img class="completion-logo" src="${academyConfig.assets.logo}" alt="OWASP space logo"><p class="eyebrow">Qualification confirmed</p><h1 id="completion-title">Welcome, <span>Commander.</span></h1><p>You learned the protocols, defended a roadmap under pressure, and built a plan you can take back to work. Tools do not make a program. Decisions do.</p><div class="lessons"><span>Know your why before you buy anything</span><span>Protect the capacity of the people who scale security</span><span>Prioritize by reachability and exploit context</span><span>Fund the foundations that make your tools work</span><span>Measure what drives action</span><span>Stack-rank by impact vs. effort, and finish what you start</span></div><div class="ctf-award"><span>Hackers Challenge CTF token</span><code id="ctf-token">${escapeHtml(academyConfig.ctfToken)}</code><button class="button" id="copy-token" type="button">Copy token</button></div><div class="actions completion-actions">${anyStarted ? '<button class="button secondary" id="print-completion" type="button">Print my map</button>' : ""}<button class="button secondary" id="reset-completion" type="button">Reset session</button></div></div></section>`;
}

function bindCompletion() {
  document.querySelector("#copy-token").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(academyConfig.ctfToken);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(document.querySelector("#ctf-token"));
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("copy");
      selection.removeAllRanges();
    }
    document.querySelector("#copy-token").textContent = "Copied!";
    notify("CTF token copied.");
  });
  document.querySelector("#print-completion")?.addEventListener("click", printMap);
  document.querySelector("#reset-completion").addEventListener("click", () => resetSession(false));
}

function resetSession(confirmReset = true) {
  if (confirmReset && !window.confirm("Reset all three academy missions and clear your map?")) return;
  state = emptyState();
  lab = {};
  try { localStorage.removeItem(academyConfig.storageKey); } catch { /* nothing stored */ }
  printRoot.innerHTML = "";
  window.location.hash = "#/";
  route();
  notify("Training progress reset.");
}

function route() {
  const path = window.location.hash || "#/";
  lab = {};
  if (path === "#/complete" && state.complete.length === missionIds.length) {
    main.innerHTML = completionTemplate();
    bindCompletion();
  } else if (path.startsWith("#/mission/")) {
    const id = path.split("/").pop();
    const index = missionIds.indexOf(id);
    if (index < 0 || (index > 0 && !isComplete(missionIds[index - 1]))) { window.location.hash = "#/"; return; }
    if (id === "protocols") { main.innerHTML = protocolsMission(); bindProtocols(); }
    if (id === "simulator") { main.innerHTML = simulatorMission(); bindSimulator(); }
    if (id === "map") { main.innerHTML = mapMission(); bindMap(); }
  } else main.innerHTML = homeTemplate();
  window.scrollTo({ top: 0, behavior: "instant" });
}

document.querySelector("#reset-progress").addEventListener("click", () => resetSession(true));
document.addEventListener("click", (event) => {
  const curriculumLink = event.target.closest('a[href="#curriculum"]');
  if (!curriculumLink) return;
  event.preventDefault();
  document.querySelector("#curriculum")?.scrollIntoView({ behavior: "smooth", block: "start" });
});
window.addEventListener("hashchange", route);
applyTheme();
route();
