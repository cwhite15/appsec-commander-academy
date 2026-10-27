import test from "node:test";
import assert from "node:assert/strict";
import { checkAnswer, descriptionBlocks, protocols, totalCommands } from "../js/protocols.js";
import { assessIncident, biggestFix, canPlace, controlStatus, costOf, deliveredFor, deliveredShareAt, earliestStart, expectedLoss, findScenario, foundationFactor, formatImpact, groups, helpfulInitiatives, impactOf, incidentRun, incidents, initiatives, landingMonth, levelAt, levelsFor, mitigationFor, optionCost, passingReadiness, penalties, phasesFor, registerFor, runSimulation, sanitizeRoadmap, scenarios, scoreRoadmap, scoreWeights, startsFor, strengthenOptions, tiers, totals, validRunMode, withinResources } from "../js/simulation.js";
import { difficultyOf, foundationIds, proveBestWithoutFoundations, score, searchContext } from "../scripts/roadmaps.mjs";
import { breachRoutes, categoryOf, evidenceGrades, lenses, programs, riskCategories, validLens } from "../js/context.js";
import { readFileSync } from "node:fs";
import { checkMapAnswer, checkpoint, isRowComplete, maxFieldLength, rankRows, readyToLock, rowsFromSimulation, sanitizeRows } from "../js/roadmap.js";

const orbitpay = findScenario("orbitpay");
const medisecure = findScenario("medisecure");
const retailrush = findScenario("retailrush");
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-9, `${label ?? ""} ${actual} != ${expected}`);
// A company with nothing in place, to test the mechanics in isolation.
const blank = { id: "blank", headcount: 100, months: 12, budget: 1000, engineerWeeks: 1000, impactMultiplier: 1, newCodeShare: 1, posture: {}, riskRegister: {} };
const plan = (starts) => ({ activated: Object.keys(starts), starts });

// The search behind the difficulty tests, run once (a few seconds). See scripts/roadmaps.mjs.
const difficulty = Object.fromEntries(scenarios.map((scenario) => [scenario.id, difficultyOf(scenario)]));

// The facilitator guide's example roadmaps (the best found, and the leanest winner) and their readiness.
const examples = {
  orbitpay: [
    [plan({ inventory: 0, vuln_mgmt: 0, mfa: 0, secrets: 0, waf: 0, pentest: 3, dast: 3, ir: 3, container: 3, sca: 3, sast: 3 }), 68],
    [plan({ inventory: 0, mfa: 0, detection: 0, ir: 0, vuln_mgmt: 3, pentest: 3, dast: 3 }), 64]
  ],
  medisecure: [
    [plan({ vuln_mgmt: 0, sca: 0, ir: 0, container: 3, inventory: 3, secrets: 6, waf: 6 }), 70],
    [plan({ vuln_mgmt: 0, sca: 0, ir: 0, container: 3 }), 62]
  ],
  retailrush: [
    [plan({ sca: 0, vuln_mgmt: 0, inventory: 3, ir: 6, waf: 6, detection: 6, mfa: 12, training: 12 }), 72],
    [plan({ waf: 0, sca: 0, ir: 0, vuln_mgmt: 3, inventory: 6 }), 66]
  ]
};

test("protocol checkpoints are well formed and explain every wrong answer", () => {
  assert.deepEqual(protocols.map((protocol) => protocol.id), ["define", "evaluate", "integrate", "measure"]);
  assert.equal(totalCommands, 10);
  for (const { checkpoint: item } of protocols) {
    const ids = item.choices.map((choice) => choice.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes(item.correctId));
    for (const id of ids.filter((choice) => choice !== item.correctId)) assert.ok(item.hints[id], `missing hint for ${id}`);
  }
});

test("protocol answers are graded and wrong answers return a specific hint", () => {
  assert.equal(checkAnswer("integrate", "72h").correct, true);
  const wrong = checkAnswer("integrate", "7d");
  assert.equal(wrong.correct, false);
  assert.match(wrong.hint, /P1/);
  assert.equal(checkAnswer("unknown", "72h").correct, false);
});

test("protocol copy splits into lists, options, and paragraphs", () => {
  const blocks = descriptionBlocks("* One\n* Two\n\n[ ] Gatekeeper: owns review\n\n• Leading Examples\n\nPlain text");
  assert.deepEqual(blocks.map((block) => block.type), ["list", "option", "indent", "paragraph"]);
  assert.deepEqual(blocks[0].items, ["One", "Two"]);
});

test("the catalog has 18 controls, 4 foundations, and every control sits in a SAMM business function", () => {
  assert.equal(initiatives.length, 18);
  assert.equal(new Set(initiatives.map((initiative) => initiative.id)).size, 18);
  assert.deepEqual(initiatives.filter((initiative) => initiative.foundation).map((initiative) => initiative.id).sort(), ["champions", "inventory", "training", "vuln_mgmt"]);
  assert.deepEqual(groups.map((group) => group.id), ["governance", "design", "implementation", "verification", "operations"]);
  for (const group of groups) assert.ok(initiatives.some((initiative) => initiative.group === group.id), group.id);
  for (const initiative of initiatives) {
    assert.ok(groups.some((group) => group.id === initiative.group), initiative.id);
    assert.ok(initiative.short && initiative.description.length <= maxFieldLength, initiative.id);
    assert.ok(initiative.rampMonths >= 1 && initiative.rampMonths <= 6, `${initiative.id} ramp`);
    for (const need of initiative.needs) assert.ok(need in penalties, `${initiative.id} needs ${need}`);
    for (const key of ["setupK", "monthlyK", "setupWeeks", "monthlyWeeks"]) assert.ok(initiative[key] >= 0, `${initiative.id}.${key}`);
    if (initiative.foundation) assert.deepEqual([initiative.mitigates, initiative.needs], [{}, []], `${initiative.id} is a pure foundation`);
  }
  assert.deepEqual(initiatives.find((initiative) => initiative.id === "ir").needs, ["detection"], "IR depends on detection");
  assert.deepEqual(initiatives.filter((initiative) => initiative.helpsShipped === false).map((initiative) => initiative.id).sort(), ["secure_defaults", "threat_modeling"]);
});

test("every threat is coverable, and no control is perfect", () => {
  assert.equal(incidents.length, 14);
  for (const incident of incidents) assert.ok(helpfulInitiatives(incident.coverageNeeded).some((item) => item.direct), incident.id);
  for (const initiative of initiatives) {
    for (const share of Object.values(initiative.mitigates)) assert.ok(share > 0 && share < 1, `${initiative.id} must be partial`);
  }
  for (const category of new Set(incidents.map((incident) => incident.coverageNeeded))) {
    const everything = Object.fromEntries(initiatives.map((initiative) => [initiative.id, 1]));
    assert.ok(mitigationFor(everything, category) < 1, `${category} reaches 100%`);
  }
});

test("every company's register rates every threat, with likelihoods between 0 and 1", () => {
  for (const scenario of scenarios) {
    assert.deepEqual(Object.keys(scenario.riskRegister).sort(), incidents.map((incident) => incident.id).sort(), scenario.id);
    for (const [id, likelihood] of Object.entries(scenario.riskRegister)) assert.ok(likelihood > 0 && likelihood < 1, `${scenario.id}.${id}`);
    for (const [id, item] of Object.entries(scenario.posture)) {
      assert.ok(initiatives.some((initiative) => initiative.id === id), `${scenario.id} posture names ${id}`);
      assert.ok(["in", "partial"].includes(item.state) && item.note.length > 0, `${scenario.id}.${id}`);
    }
    assert.ok(scenario.postureStory.length > 0, scenario.id);
    assert.ok(scenario.newCodeShare > 0 && scenario.newCodeShare <= 1, scenario.id);
  }
});

test("expected loss is likelihood × impact, summed across the register", () => {
  const register = registerFor(orbitpay);
  const stuffing = register.find((row) => row.incident.id === "cred_stuffing");
  assert.deepEqual([stuffing.likelihood, stuffing.impact], [0.6, 310]);
  near(stuffing.inherent, 186);
  assert.equal(register.length, 14);
  assert.deepEqual(register.map((row) => row.inherent), [...register.map((row) => row.inherent)].sort((a, b) => b - a), "sorted by inherent loss");
  const loss = expectedLoss(register);
  near(loss.inherent, register.reduce((sum, row) => sum + row.likelihood * row.impact, 0));
  for (const key of ["during", "handover", "target"]) near(loss[key], loss.current, `with no roadmap, ${key} is today's loss`);
  const totals = scenarios.map((scenario) => expectedLoss(registerFor(scenario))).map((item) => [Math.round(item.inherent), Math.round(item.current)]);
  assert.deepEqual(totals, [[893, 706], [755, 558], [1813, 1368]]);
});

test("readiness blends the loss during the timeline with the risk handed over, and the bar is 62%", () => {
  assert.equal(passingReadiness, 62);
  assert.deepEqual(tiers.map((tier) => tier.min), [62, 50, 35, 0]);
  assert.deepEqual(scoreWeights, { during: 0.5, handover: 0.5 });
  const [roadmap] = examples.medisecure[0];
  const result = scoreRoadmap(medisecure, roadmap);
  near(result.loss.target, (result.loss.during + result.loss.handover) / 2);
  assert.equal(result.readiness, Math.round(100 * (1 - result.loss.target / result.loss.inherent)));
  assert.ok(result.loss.handover < result.loss.during, "controls are stronger at handover than on average");
  assert.ok(result.loss.during < result.loss.current && result.loss.current < result.loss.inherent);
  assert.equal(result.passed, true);
  assert.equal(result.tier.label, "Mission success");
});

test("the starting posture counts toward readiness, and day one is far below the bar", () => {
  assert.deepEqual(scenarios.map((scenario) => scoreRoadmap(scenario, []).readiness), [21, 26, 25]);
  for (const scenario of scenarios) {
    const dayOne = scoreRoadmap(scenario, []);
    assert.equal(dayOne.readiness, dayOne.dayOne);
    assert.ok(dayOne.readiness <= passingReadiness - 30, scenario.id);
    assert.equal(dayOne.tier.label, "Mission failure");
  }
});

test("each run is the five largest risks: inherent by default, or current, never shaped by the roadmap", () => {
  const runs = (mode) => Object.fromEntries(scenarios.map((scenario) => [scenario.id, incidentRun(scenario, mode).map((incident) => incident.id)]));
  assert.deepEqual(runs("inherent"), {
    orbitpay: ["cred_stuffing", "sqli", "secret_leak", "account_takeover", "idor"],
    medisecure: ["dep_vuln", "breach", "privilege_escalation", "secret_leak", "idor"],
    retailrush: ["dep_vuln", "cred_stuffing", "breach", "sqli", "ddos"]
  });
  assert.deepEqual(runs("current"), {
    orbitpay: ["cred_stuffing", "sqli", "secret_leak", "account_takeover", "idor"],
    medisecure: ["dep_vuln", "breach", "secret_leak", "misconfiguration", "privilege_escalation"],
    retailrush: ["dep_vuln", "cred_stuffing", "breach", "ddos", "design_flaw"]
  });
  for (const scenario of scenarios) {
    const top = registerFor(scenario).slice(0, 5).map((row) => row.incident.id);
    assert.deepEqual(incidentRun(scenario).map((incident) => incident.id), top, scenario.id);
    assert.deepEqual(incidentRun(scenario, "bogus"), incidentRun(scenario, "inherent"));
  }
  assert.equal(validRunMode("current"), "current");
  for (const bad of ["bogus", undefined, null, 3, "__proto__"]) assert.equal(validRunMode(bad), "inherent");
});

test("the run mode changes which incidents play, never the score", () => {
  for (const [id, cases] of Object.entries(examples)) {
    for (const [roadmap] of [...cases, [plan({})]]) {
      const scenario = findScenario(id);
      const inherent = runSimulation(scenario, roadmap, "inherent");
      const current = runSimulation(scenario, roadmap, "current");
      assert.deepEqual([inherent.readiness, inherent.passed, inherent.tier], [current.readiness, current.passed, current.tier], id);
      assert.equal(inherent.results.length, 5);
    }
  }
});

test("missing foundations cut what a control delivers, and partial foundations cut half as much", () => {
  const sast = initiatives.find((initiative) => initiative.id === "sast");
  const delivered = (ids) => deliveredFor(sast, "code_injection", levelsFor(blank, ids));
  near(delivered(["sast", "vuln_mgmt", "champions", "training"]), 0.7, "all three");
  near(delivered(["sast", "vuln_mgmt", "champions"]), 0.595, "no training");
  near(delivered(["sast", "vuln_mgmt", "training"]), 0.525, "no champions");
  near(delivered(["sast", "champions", "training"]), 0.35, "no vuln mgmt");
  near(delivered(["sast"]), 0.7 * 0.5 * 0.75 * 0.85, "none");
  near(deliveredFor(sast, "code_injection", { sast: 1, vuln_mgmt: 0.5, champions: 1, training: 1 }), 0.525, "partial vuln mgmt halves its penalty");
  near(deliveredFor(sast, "code_injection", { sast: 0.5, vuln_mgmt: 1, champions: 1, training: 1 }), 0.35, "a partial control runs at half strength");
  const ir = initiatives.find((initiative) => initiative.id === "ir");
  near(deliveredFor(ir, "breach_response", { ir: 1 }), 0.3);
  near(deliveredFor(ir, "breach_response", { ir: 1, detection: 0.5 }), 0.45);
  near(deliveredFor(ir, "breach_response", { ir: 1, detection: 1 }), 0.6);
  near(deliveredFor(ir, "ddos", { ir: 1, detection: 1 }), 0.15, "containment on every other incident");
  for (const foundation of initiatives.filter((initiative) => initiative.foundation)) assert.equal(foundationFactor(foundation, {}), 1);
});

test("threat modeling and secure defaults protect only new code, except against logic flaws", () => {
  const defaults = initiatives.find((initiative) => initiative.id === "secure_defaults");
  const modeling = initiatives.find((initiative) => initiative.id === "threat_modeling");
  const levels = { secure_defaults: 1, threat_modeling: 1, champions: 1, training: 1 };
  near(deliveredFor(defaults, "code_injection", levels, retailrush), 0.75 * 0.7);
  near(deliveredFor(modeling, "design_flaw", levels, orbitpay), 0.7, "logic flaws are new features by definition");
  near(deliveredFor(modeling, "authz_flaw", levels, medisecure), 0.4 * 0.5);
});

test("layered controls combine without exceeding 100%", () => {
  const levels = levelsFor(blank, ["sast", "secure_defaults", "vuln_mgmt", "champions", "training"]);
  near(mitigationFor(levels, "code_injection"), 1 - 0.3 * 0.25);
  near(mitigationFor(levelsFor(blank, ["secrets"]), "credential_stuffing"), 0);
  near(mitigationFor(levelsFor(blank, ["mfa", "inventory"]), "credential_stuffing"), 0.85);
});

test("shelfware: a control in place still delivers a fraction without its foundations", () => {
  const sast = controlStatus(retailrush, [], "sast");
  assert.equal(sast.posture, "in");
  near(sast.delivered, 0.7 * 0.5 * 0.75 * 0.925);
  assert.deepEqual(sast.missing.map((item) => [item.initiative.id, item.penalty]), [["vuln_mgmt", 0.5], ["champions", 0.25], ["training", 0.075]]);
  near(controlStatus(retailrush, plan({ vuln_mgmt: 0 }), "sast").delivered, sast.delivered * 2, "once vulnerability management has ramped up");
  const pentest = controlStatus(medisecure, [], "pentest");
  near(controlStatus(medisecure, plan({ vuln_mgmt: 0 }), "pentest").delivered, pentest.delivered * 2, "fixing findings makes the existing pen test pay off");
  const coaching = strengthenOptions(retailrush, [], "code_injection");
  assert.equal(coaching.foundations[0].initiative.id, "vuln_mgmt");
  assert.deepEqual(coaching.foundations[0].hampers.map((item) => item.id), ["sast", "pentest"]);
});

test("controls ramp up from their start month, and upgrades ramp from 50% over half the time", () => {
  const roadmap = plan({ sast: 0, secrets: 3, mfa: 0 });
  // RetailRush: SAST is in place, secrets are new (4-month ramp), MFA is partial (3-month ramp, so 1.5 to upgrade).
  assert.equal(levelAt(retailrush, roadmap, "sast", 0), 1);
  assert.equal(levelAt(retailrush, roadmap, "secrets", 2), 0, "not started yet");
  near(levelAt(retailrush, roadmap, "secrets", 3), 0.5 / 4);
  near(levelAt(retailrush, roadmap, "secrets", 6), 3.5 / 4);
  assert.equal(levelAt(retailrush, roadmap, "secrets", 7), 1);
  near(levelAt(retailrush, roadmap, "mfa", 0), 0.5 + 0.5 * (0.5 / 1.5));
  assert.equal(levelAt(retailrush, roadmap, "mfa", 1), 1);
  assert.equal(levelAt(retailrush, plan({}), "mfa", 10), 0.5, "a partial control left alone stays at half strength");
  const status = controlStatus(retailrush, roadmap, "secrets");
  assert.deepEqual([status.start, status.fullBy, status.level], [3, 7, 1]);
});

test("each company's timeline offers the start months that fit, with capacity split by phase", () => {
  assert.deepEqual(scenarios.map(startsFor), [[0, 3], [0, 3, 6], [0, 3, 6, 12]]);
  assert.deepEqual(phasesFor(medisecure), [{ start: 0, end: 3, capacity: 8.5 }, { start: 3, end: 6, capacity: 8.5 }, { start: 6, end: 12, capacity: 17 }]);
  for (const scenario of scenarios) near(phasesFor(scenario).reduce((sum, phase) => sum + phase.capacity, 0), scenario.engineerWeeks, scenario.id);
  assert.deepEqual(scenarios.map((scenario) => [0, 1, 2, 3, 4].map((index) => landingMonth(scenario, index))), [[0, 1, 3, 4, 5], [1, 3, 6, 8, 10], [1, 5, 9, 12, 16]]);
});

test("costs: in place is free, partial upgrades cost half, and a later start pays fewer months", () => {
  assert.deepEqual(costOf(initiatives.find((initiative) => initiative.id === "sast"), orbitpay), { budget: 11, weeks: 6 });
  const upgrade = optionCost(orbitpay, "sast", 0);
  assert.equal(upgrade.budget, 6, "half of $11K, rounded");
  near(upgrade.phaseWeeks[0], 0.5 * 1.2 * (3 + 0.4 * 3), "setup plus three months of run effort");
  near(upgrade.phaseWeeks[1], 0.5 * 1.2 * 0.4 * 3);
  near(upgrade.weeks, upgrade.phaseWeeks[0] + upgrade.phaseWeeks[1]);
  const later = optionCost(orbitpay, "sast", 3);
  assert.ok(later.budget < upgrade.budget && later.weeks < upgrade.weeks);
  assert.equal(later.phaseWeeks[0], 0, "nothing is spent before it starts");
  assert.equal(optionCost(retailrush, "mfa").budget, 14);
  assert.deepEqual(optionCost(medisecure, "pentest"), { budget: 0, weeks: 0, phaseWeeks: [0, 0, 0] });
  assert.equal(canPlace(medisecure, [], "pentest", 0), false, "in-place controls can't be bought again");
  assert.equal(canPlace(orbitpay, [], "sast", 6), false, "not a start month inside a 6-month timeline");
  assert.deepEqual(levelsFor(medisecure, []), { data_protection: 1, pentest: 1, ir: 0.5, inventory: 0.5, training: 0.5, rbac: 0.5, detection: 0.5 });
  assert.equal(totals(orbitpay, plan({ sast: 0, inventory: 0 })).budget, 6 + 4);
});

test("capacity is enforced per phase, so you can't start everything at once", () => {
  const [best] = examples.orbitpay[0];
  assert.equal(withinResources(orbitpay, best), true);
  assert.equal(withinResources(orbitpay, { activated: best.activated, starts: {} }), false, "the best plan, all started now, is over capacity");
  for (const scenario of scenarios) {
    const ids = difficulty[scenario.id].best.ids;
    assert.equal(withinResources(scenario, { activated: ids, starts: {} }), false, `${scenario.id}: everything at month 0 should not fit`);
  }
  const full = plan({ inventory: 0, vuln_mgmt: 0, mfa: 0, secrets: 0, waf: 0 });
  assert.equal(earliestStart(orbitpay, full, "dast"), 3, "the first quarter is full, so DAST fits only later");
  assert.equal(canPlace(orbitpay, full, "dast", 0), false);
});

test("restored roadmaps are rebuilt within resources, moving starts that no longer fit", () => {
  const restored = sanitizeRoadmap(orbitpay, { activated: ["inventory", "bogus", "inventory", "vuln_mgmt", "mfa", "secrets", "waf", "dast", "sast"], starts: { inventory: 0, vuln_mgmt: 7, dast: 0 } });
  assert.deepEqual(restored.activated, ["inventory", "vuln_mgmt", "mfa", "secrets", "waf", "dast", "sast"]);
  assert.equal(restored.starts.vuln_mgmt, 0, "an invalid start moves to the earliest that fits");
  assert.equal(restored.starts.dast, 3, "a start that no longer fits moves later");
  assert.equal(withinResources(orbitpay, restored), true);
  assert.deepEqual(sanitizeRoadmap(medisecure, { activated: ["pentest", "sca"] }).activated, ["sca"], "in-place controls are dropped");
  assert.deepEqual(sanitizeRoadmap(orbitpay, ["mfa", "sca"]), { activated: ["mfa", "sca"], starts: { mfa: 0, sca: 0 } }, "a saved list from before start months still loads");
  assert.deepEqual(sanitizeRoadmap(orbitpay, "not a roadmap"), { activated: [], starts: {} });
  assert.deepEqual(sanitizeRoadmap(undefined, ["sca"]), { activated: [], starts: {} });
});

// The booth screenshot (2026-10-20): ten controls at OrbitPay with no Vulnerability Management, Champions or Detection.
const unfounded = plan({ threat_modeling: 0, sca: 0, waf: 0, inventory: 0, ir: 0, training: 0, secure_defaults: 3, mfa: 3, sast: 3, container: 3 });

test("the roadmap timeline shades what a control delivers: ramp × foundations, matching the card", () => {
  assert.ok(withinResources(orbitpay, unfounded));
  const last = orbitpay.months - 1;
  for (const id of unfounded.activated) {
    const status = controlStatus(orbitpay, unfounded, id);
    const expected = status.initiative.foundation ? status.level : status.delivered / status.rated;
    near(deliveredShareAt(orbitpay, unfounded, id, last), expected, id);
  }
  // Fully ramped, but held back by missing foundations: the old timeline called these "full strength".
  assert.equal(levelAt(orbitpay, unfounded, "sast", last), 1);
  near(deliveredShareAt(orbitpay, unfounded, "sast", last), 0.5 * 0.75);
  near(deliveredShareAt(orbitpay, unfounded, "sca", last), 0.5);
  near(deliveredShareAt(orbitpay, unfounded, "ir", last), 0.5);
  // Before its upgrade starts, a partial control runs at half, still cut by its missing foundations.
  assert.equal(levelAt(orbitpay, unfounded, "mfa", 0), 0.5);
  assert.ok(deliveredShareAt(orbitpay, unfounded, "sast", 0) < 0.5);
});

test("after a failed launch, the biggest fix is the single change that cuts the most loss and still fits", () => {
  const fix = biggestFix(orbitpay, unfounded);
  assert.deepEqual([fix.kind, fix.drop, fix.id, fix.start], ["swap", "threat_modeling", "vuln_mgmt", 0]);
  assert.equal(scoreRoadmap(orbitpay, unfounded).readiness, 53);
  assert.equal(fix.readiness, 58);
  assert.ok(withinResources(orbitpay, fix.roadmap));
  // No single addition that fits does better.
  const loss = (roadmap) => expectedLoss(registerFor(orbitpay, roadmap)).target;
  for (const initiative of initiatives) {
    if (unfounded.activated.includes(initiative.id)) continue;
    const start = earliestStart(orbitpay, unfounded, initiative.id);
    if (start === null) continue;
    assert.ok(loss(fix.roadmap) <= loss({ activated: [...unfounded.activated, initiative.id], starts: { ...unfounded.starts, [initiative.id]: start } }) + 1e-9, initiative.id);
  }
  // The guide's second example: MediSecure with only SAST, DAST and Pen Testing.
  const testing = plan({ sast: 0, dast: 0, pentest: 0 });
  const swap = biggestFix(medisecure, testing);
  assert.deepEqual([swap.kind, swap.drop, swap.id, swap.start, scoreRoadmap(medisecure, testing).readiness, swap.readiness], ["swap", "sast", "sca", 0, 28, 39]);
  const cut = (roadmap) => registerFor(medisecure, roadmap).find((row) => row.incident.id === "dep_vuln").target;
  assert.equal(formatImpact(cut(testing) - cut(swap.roadmap)), "$77K");
  // From an empty roadmap the best first move is a plain addition, started now.
  const first = biggestFix(medisecure, plan({}));
  assert.equal(first.kind, "add");
  assert.equal(first.start, 0);
  assert.ok(first.readiness > scoreRoadmap(medisecure, plan({})).readiness);
});

test("an incident is met by whatever had ramped up by the month it lands", () => {
  const leak = incidents.find((incident) => incident.id === "secret_leak");
  const early = assessIncident(leak, retailrush, plan({ secrets: 0, inventory: 0 }), 1);
  const secrets = early.contributors.find((item) => item.initiative.id === "secrets");
  near(secrets.level, 1.5 / 4);
  assert.equal(secrets.ramping, true, "the card reads 'Secrets Management 38% ramped'");
  const late = assessIncident(leak, retailrush, plan({ secrets: 0, inventory: 0 }), 9);
  assert.ok(late.mitigation > early.mitigation && late.impact < early.impact);
  const waiting = assessIncident(leak, retailrush, plan({ secrets: 3 }), 1);
  assert.deepEqual(waiting.notStarted.map((item) => [item.initiative.id, item.start]), [["secrets", 3]]);
  assert.equal(waiting.month, 1);
  const stuffing = incidents.find((incident) => incident.id === "cred_stuffing");
  const before = assessIncident(stuffing, retailrush, plan({ mfa: 12 }), 5);
  const mfa = before.contributors.find((item) => item.initiative.id === "mfa");
  assert.deepEqual([mfa.level, mfa.ramping], [0.5, false], "a partial control waiting for its upgrade is not ramping yet");
  assert.deepEqual(before.notStarted.map((item) => [item.initiative.id, item.upgrade]), [["mfa", true]]);
  const sqli = incidents.find((incident) => incident.id === "sqli");
  const shelfware = assessIncident(sqli, retailrush, [], 0);
  assert.equal(shelfware.potential, 500);
  assert.equal(shelfware.outcome, "contained");
  assert.deepEqual(shelfware.contributors.slice(0, 2).map((item) => item.initiative.id), ["sast", "pentest"]);
  assert.equal(assessIncident(sqli, blank, [], 0).outcome, "breached");
});

test("sequencing: foundations first beats the same controls with tools first", () => {
  const ids = { inventory: 0, vuln_mgmt: 0, mfa: 0, pentest: 0, container: 0, secrets: 3, dast: 3, ir: 3, sca: 3 };
  const toolsFirst = { mfa: 0, sca: 0, secrets: 0, dast: 0, pentest: 0, container: 0, ir: 3, inventory: 3, vuln_mgmt: 3 };
  assert.equal(withinResources(orbitpay, plan(ids)), true);
  assert.equal(withinResources(orbitpay, plan(toolsFirst)), true);
  assert.equal(scoreRoadmap(orbitpay, plan(ids)).readiness, 66);
  assert.equal(scoreRoadmap(orbitpay, plan(toolsFirst)).readiness, 63);
  const ramped = scoreRoadmap(retailrush, plan({ vuln_mgmt: 0, sca: 0 }));
  const delayed = scoreRoadmap(retailrush, plan({ vuln_mgmt: 12, sca: 12 }));
  assert.ok(ramped.during > delayed.during && ramped.readiness > delayed.readiness, "starting later loses the months in between");
});

test("scoring follows dollars: dropping a control against a bigger risk costs more", () => {
  const [best] = examples.medisecure[0];
  const without = (id) => scoreRoadmap(medisecure, { activated: best.activated.filter((item) => item !== id), starts: best.starts }).readiness;
  assert.ok(without("sca") < without("waf"), "MediSecure's #1 risk is dependency CVEs");
});

test("the search's fast scorer matches the model", () => {
  for (const [id, cases] of Object.entries(examples)) {
    const scenario = findScenario(id);
    const ctx = searchContext(scenario);
    for (const [roadmap] of cases) {
      const loss = scoreRoadmap(scenario, roadmap).loss;
      near(Math.round(score(ctx, new Map(Object.entries(roadmap.starts))) * 1e6), Math.round(100 * (1 - loss.target / loss.inherent) * 1e6), id);
    }
  }
});

test("no roadmap passes without funding or upgrading a foundation (proved over every schedule)", () => {
  for (const scenario of scenarios) {
    const proof = proveBestWithoutFoundations(searchContext(scenario));
    assert.ok(proof.sets > 0 && proof.schedules > 0, scenario.id);
    assert.ok(Math.round(proof.score) < passingReadiness, `${scenario.id}: ${proof.score.toFixed(2)}% without a foundation`);
    assert.ok(![...proof.plan.keys()].some((id) => foundationIds.has(id)));
  }
});

test("each company is winnable with room to spare, in many ways", () => {
  for (const scenario of scenarios) {
    const { best, winners } = difficulty[scenario.id];
    assert.ok(best.score >= passingReadiness + 6, `${scenario.id} best ${best.score.toFixed(1)}`);
    assert.ok(winners.length >= 50, `${scenario.id} has ${winners.length} winning sets`);
    assert.equal(runSimulation(scenario, []).passed, false);
  }
  for (const initiative of initiatives) {
    assert.ok(scenarios.some((scenario) => difficulty[scenario.id].winners.some((item) => item.ids.includes(initiative.id))), `${initiative.id} never appears in a winning roadmap`);
  }
  for (const scenario of scenarios) {
    const latest = startsFor(scenario).at(-1);
    const everything = difficulty[scenario.id].ctx.options;
    assert.equal(withinResources(scenario, { activated: everything, starts: Object.fromEntries(everything.map((id) => [id, latest])) }), false, `${scenario.id} can afford everything`);
  }
});

test("the facilitator guide's example roadmaps fit and pass", () => {
  for (const [id, cases] of Object.entries(examples)) {
    const scenario = findScenario(id);
    for (const [roadmap, readiness] of cases) {
      assert.deepEqual(sanitizeRoadmap(scenario, roadmap), roadmap, `${id} roadmap exceeds resources`);
      assert.equal(scoreRoadmap(scenario, roadmap).readiness, readiness, `${id}: ${JSON.stringify(roadmap.starts)}`);
    }
  }
  const tools = { sast: 0, sca: 0, secrets: 0, mfa: 0, waf: 0, container: 0 };
  assert.equal(scoreRoadmap(orbitpay, plan(tools)).passed, false, "upgrading every free tool without foundations");
});

test("scenarios use 6, 12, and 18 month timelines measured in engineer-weeks", () => {
  assert.deepEqual(scenarios.map((scenario) => scenario.months), [6, 12, 18]);
  assert.deepEqual(scenarios.map((scenario) => [scenario.budget, scenario.engineerWeeks]), [[90, 48], [80, 34], [250, 105]]);
  for (const scenario of scenarios) {
    assert.ok(Number.isInteger(scenario.engineerWeeks) && scenario.engineerWeeks > 0, scenario.id);
    assert.ok(scenario.staffing.length > 0, scenario.id);
    assert.equal("engineerHours" in scenario, false);
  }
});

test("initiative costs are setup plus monthly run, scaled by the company's own size", () => {
  const sast = initiatives.find((initiative) => initiative.id === "sast");
  const company = (headcount, months) => ({ headcount, months });
  assert.deepEqual(costOf(sast, company(100, 12)), { budget: 18, weeks: 8 });
  assert.ok(costOf(sast, company(100, 18)).budget > costOf(sast, company(100, 6)).budget);
  assert.ok(costOf(sast, company(200, 12)).weeks > costOf(sast, company(100, 12)).weeks);
});

test("each scenario stands alone with resources sized to its own company", () => {
  for (const scenario of scenarios) {
    const scale = scenario.headcount / 100;
    const budgetPerMonth = scenario.budget / scenario.months / scale;
    const weeksPerMonth = scenario.engineerWeeks / scenario.months / scale;
    assert.ok(budgetPerMonth >= 6 && budgetPerMonth <= 15, `${scenario.id} budget rate ${budgetPerMonth}`);
    assert.ok(weeksPerMonth >= 2.5 && weeksPerMonth <= 7, `${scenario.id} capacity rate ${weeksPerMonth}`);
  }
});

test("incident impact scales with company size and sector exposure", () => {
  const breach = incidents.find((incident) => incident.id === "breach");
  const malicious = incidents.find((incident) => incident.id === "malicious_package");
  assert.deepEqual(scenarios.map((scenario) => impactOf(breach, scenario)), [780, 600, 1000]);
  assert.deepEqual(scenarios.map((scenario) => impactOf(malicious, scenario)), [470, 360, 600]);
  for (const scenario of scenarios) {
    for (const incident of incidents) assert.equal(impactOf(incident, scenario) % 10, 0);
    assert.ok(expectedLoss(registerFor(scenario)).current > scenario.budget, `${scenario.id}: doing nothing should cost more than the program`);
  }
  assert.equal(formatImpact(780), "$780K");
  assert.equal(formatImpact(186.4), "$186K");
  assert.equal(formatImpact(1000), "$1.0M");
  assert.equal(formatImpact(1250), "$1.3M");
});

test("map rows are sanitized, length-limited, and padded to three slots", () => {
  const rows = sanitizeRows([{ initiative: "x".repeat(500), timeline: "999", impact: "high", effort: "<script>", extra: "ignored" }]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].initiative.length, maxFieldLength);
  assert.equal(rows[0].timeline, "");
  assert.equal(rows[0].impact, "high");
  assert.equal(rows[0].effort, "");
  assert.equal("extra" in rows[0], false);
  assert.equal(sanitizeRows("not an array").length, 3);
});

test("the map ranks high impact first, then low effort", () => {
  const base = { goal: "g", metric: "m", investment: "i", timeline: "30" };
  const ranked = rankRows([
    { ...base, initiative: "Big lift", impact: "high", effort: "high" },
    { ...base, initiative: "Low value", impact: "low", effort: "low" },
    { ...base, initiative: "Quick win", impact: "high", effort: "low" }
  ]);
  assert.deepEqual(ranked.map((row) => row.initiative), ["Quick win", "Big lift", "Low value"]);
  assert.deepEqual(ranked.map((row) => row.priority), ["Quick win", "Planned investment", "Fill-in"]);
  assert.equal(rankRows([{ ...base, initiative: "Costly", impact: "low", effort: "high" }])[0].priority, "Reconsider");
});

test("locking the map requires a complete initiative and the correct checkpoint answer", () => {
  const complete = { initiative: "SAST", goal: "g", metric: "m", investment: "i", timeline: "30", impact: "high", effort: "low" };
  assert.equal(isRowComplete(complete), true);
  assert.equal(isRowComplete({ ...complete, metric: "  " }), false);
  assert.equal(readyToLock(sanitizeRows([complete]), true), true);
  assert.equal(readyToLock(sanitizeRows([]), true), false);
  assert.equal(readyToLock(sanitizeRows([complete]), false), false);
  assert.equal(checkMapAnswer(checkpoint.correctId).correct, true);
  assert.equal(checkMapAnswer("split").correct, false);
});

test("simulator roadmaps seed the map with start-based timelines, upgrades, and foundations", () => {
  const rows = rowsFromSimulation(orbitpay, plan({ sast: 0, ir: 3, inventory: 0, waf: 3 }));
  assert.equal(rows.length, 3);
  assert.equal(rows[0].initiative, "Upgrade existing SAST Pipeline Scanning");
  assert.equal(rows[0].investment, "$6K and 3 engineer-weeks, starting now");
  assert.equal(rows[0].timeline, "30");
  assert.equal(rows[1].initiative, "Incident Response Plan");
  assert.equal(rows[1].investment, "$6K and 4 engineer-weeks, starting after 3 months");
  assert.equal(rows[1].timeline, "90");
  assert.equal(rows[2].initiative, "Inventory, Risk Classification & Coverage Metrics");
  assert.equal(rows[0].metric, "");
  assert.equal(rows[0].impact, "");
  assert.deepEqual(sanitizeRows(rows).slice(0, 3), rows, "imported rows survive sanitizing unchanged");
  assert.equal(rowsFromSimulation(undefined, ["sast"])[0].initiative, "");
  assert.equal(rowsFromSimulation(orbitpay, ["sast"])[0].timeline, "30", "a roadmap saved before start months imports as now");
});

test("every threat sits in exactly one scope category, and the guide's breach routes match the briefing", () => {
  for (const incident of incidents) assert.equal(riskCategories.filter((category) => category.incidents.includes(incident.id)).length, 1, incident.id);
  assert.equal(riskCategories.flatMap((category) => category.incidents).length, incidents.length);
  assert.equal(categoryOf("sqli").id, "code");
  const guide = readFileSync(new URL("../FACILITATOR.md", import.meta.url), "utf8");
  for (const route of breachRoutes.routes) assert.ok(guide.includes(`| ${route.label} | ${route.share}% |`), route.label);
  assert.equal(breachRoutes.routes.reduce((sum, route) => sum + route.share, 0), 66);
  assert.ok(guide.includes(`a third party was involved in ${breachRoutes.thirdParty}% and ransomware in ${breachRoutes.ransomware}%`));
  // The guide's OrbitPay category split comes from the model.
  const register = registerFor(orbitpay, []);
  const total = register.reduce((sum, row) => sum + row.inherent, 0);
  const share = (id) => Math.round((100 * register.filter((row) => categoryOf(row.incident.id).id === id).reduce((sum, row) => sum + row.inherent, 0)) / total);
  assert.deepEqual(["identity", "code", "cloud", "deps", "response", "avail"].map(share), [32, 31, 23, 8, 4, 1]);
});

test("the portfolio's programs are one canonical list, and every DBIR figure agrees with the breach routes", () => {
  assert.deepEqual(programs.map((program) => program.label), ["Application & platform security", "Vulnerability & patch management (vendor, edge)", "Identity & access", "Email & people", "Third-party risk", "Detection & response"]);
  assert.equal(new Set(programs.map((program) => program.id)).size, programs.length);
  const routeIds = breachRoutes.routes.map((route) => route.id);
  // The only figures allowed on screen: the 2026 routes and totals, plus the 2025 edge-device share already in the exploitation note.
  const allowed = new Set([...breachRoutes.routes.map((route) => route.share), breachRoutes.thirdParty, breachRoutes.ransomware, breachRoutes.humanElement, 22]);
  assert.ok(breachRoutes.routes.find((route) => route.id === "exploit").note.includes("22% of exploitation in the 2025 DBIR"));
  for (const program of programs) {
    for (const id of program.routes) {
      assert.ok(routeIds.includes(id), `${program.id}: unknown route ${id}`);
      assert.ok(program.dbir.includes(`${breachRoutes.routes.find((route) => route.id === id).share}%`), `${program.id} shows ${id}`);
    }
    for (const figure of program.dbir.match(/\d+(?=%)/g) || []) assert.ok(allowed.has(Number(figure)), `${program.id}: ${figure}% is not a breach-route value`);
    for (const field of ["label", "covers", "dbir", "status"]) assert.ok(program[field], `${program.id}.${field}`);
  }
  assert.ok(programs.find((program) => program.id === "third").dbir.includes(`${breachRoutes.thirdParty}%`));
  assert.ok(programs.find((program) => program.id === "response").dbir.includes(`${breachRoutes.ransomware}%`));
  assert.equal(programs.filter((program) => program.status === "This mission").map((program) => program.id).join(), "appsec");
});

test("every program has a graded, sourced evidence summary from the fixed set", () => {
  assert.deepEqual(evidenceGrades, ["Strong", "Moderate", "Weak"]);
  for (const { id, evidence } of programs) {
    assert.ok(evidenceGrades.includes(evidence.grade), `${id}: ${evidence.grade}`);
    assert.ok(evidence.summary && evidence.source, id);
  }
});

test("the lens defaults to the game and falls back to it for anything unknown", () => {
  assert.deepEqual(lenses.map((lens) => lens.id), ["appsec", "org"]);
  assert.equal(validLens("org"), "org");
  for (const value of [undefined, null, "", "planned", 3, {}]) assert.equal(validLens(value), "appsec");
});
