import test from "node:test";
import assert from "node:assert/strict";
import { checkAnswer, descriptionBlocks, protocols, totalCommands } from "../js/protocols.js";
import { assessIncident, canActivate, controlStatus, costOf, deliveredFor, expectedLoss, findScenario, foundationFactor, formatImpact, groups, helpfulInitiatives, impactOf, incidentRun, incidents, initiatives, levelsFor, mitigationFor, optionCost, passingReadiness, penalties, registerFor, runSimulation, sanitizeSelection, scenarios, scoreRoadmap, strengthenOptions, tiers, totals, validRunMode } from "../js/simulation.js";
import { difficultyOf } from "../scripts/roadmaps.mjs";
import { checkMapAnswer, checkpoint, isRowComplete, maxFieldLength, rankRows, readyToLock, rowsFromSimulation, sanitizeRows } from "../js/roadmap.js";

const orbitpay = findScenario("orbitpay");
const medisecure = findScenario("medisecure");
const retailrush = findScenario("retailrush");
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < 1e-9, `${label ?? ""} ${actual} != ${expected}`);
// A company with nothing in place, to test the mechanics in isolation.
const blank = { id: "blank", headcount: 100, months: 12, budget: 1000, engineerWeeks: 1000, impactMultiplier: 1, posture: {}, riskRegister: {} };

// Every affordable roadmap at every company, enumerated once and shared by the difficulty tests.
const difficulty = Object.fromEntries(scenarios.map((scenario) => [scenario.id, difficultyOf(scenario)]));

// The facilitator guide's example roadmaps and their readiness.
const examples = {
  orbitpay: [[["inventory", "vuln_mgmt", "mfa", "sca", "secrets", "container", "dast", "pentest", "ir"], 75], [["inventory", "secure_defaults", "mfa", "detection", "ir"], 66]],
  medisecure: [[["inventory", "vuln_mgmt", "sca", "rbac", "container", "detection", "ir"], 74], [["vuln_mgmt", "sca", "container", "detection", "ir"], 69]],
  retailrush: [[["inventory", "vuln_mgmt", "sca", "mfa", "waf", "detection", "ir"], 77], [["inventory", "vuln_mgmt", "sca", "waf", "ir"], 69]]
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
    for (const need of initiative.needs) assert.ok(need in penalties, `${initiative.id} needs ${need}`);
    for (const key of ["setupK", "monthlyK", "setupWeeks", "monthlyWeeks"]) assert.ok(initiative[key] >= 0, `${initiative.id}.${key}`);
    if (initiative.foundation) assert.deepEqual([initiative.mitigates, initiative.needs], [{}, []], `${initiative.id} is a pure foundation`);
  }
  assert.deepEqual(initiatives.find((initiative) => initiative.id === "ir").needs, ["detection"], "IR depends on detection");
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
    assert.equal("incidentIds" in scenario, false);
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
  assert.equal(loss.target, loss.current, "no roadmap yet");
  const totals = scenarios.map((scenario) => expectedLoss(registerFor(scenario))).map((item) => [Math.round(item.inherent), Math.round(item.current)]);
  assert.deepEqual(totals, [[893, 706], [755, 558], [1813, 1368]]);
});

test("readiness is the share of inherent expected loss removed, and the bar is 66%", () => {
  assert.equal(passingReadiness, 66);
  assert.deepEqual(tiers.map((tier) => tier.min), [66, 55, 40, 0]);
  const [ids] = examples.medisecure[0];
  const score = scoreRoadmap(medisecure, ids);
  assert.equal(score.readiness, Math.round(100 * (1 - score.loss.target / score.loss.inherent)));
  assert.equal(score.passed, true);
  assert.equal(score.tier.label, "Mission success");
  assert.ok(score.loss.target < score.loss.current && score.loss.current < score.loss.inherent);
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
    for (const [ids] of [...cases, [[]]]) {
      const scenario = findScenario(id);
      const inherent = runSimulation(scenario, ids, "inherent");
      const current = runSimulation(scenario, ids, "current");
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
  // IR depends on detection, the one chain. Foundations don't boost each other.
  const ir = initiatives.find((initiative) => initiative.id === "ir");
  near(deliveredFor(ir, "breach_response", { ir: 1 }), 0.3);
  near(deliveredFor(ir, "breach_response", { ir: 1, detection: 0.5 }), 0.45);
  near(deliveredFor(ir, "breach_response", { ir: 1, detection: 1 }), 0.6);
  near(deliveredFor(ir, "ddos", { ir: 1, detection: 1 }), 0.15, "containment on every other incident");
  for (const foundation of initiatives.filter((initiative) => initiative.foundation)) assert.equal(foundationFactor(foundation, {}), 1);
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
  near(controlStatus(retailrush, ["vuln_mgmt"], "sast").delivered, sast.delivered * 2);
  const pentest = controlStatus(medisecure, [], "pentest");
  near(controlStatus(medisecure, ["vuln_mgmt"], "pentest").delivered, pentest.delivered * 2, "fixing findings makes the existing pen test pay off");
  const coaching = strengthenOptions(retailrush, [], "code_injection");
  assert.equal(coaching.foundations[0].initiative.id, "vuln_mgmt");
  assert.deepEqual(coaching.foundations[0].hampers.map((item) => item.id), ["sast", "pentest"]);
});

test("controls in place are free, partial ones run at half strength, and upgrades cost half", () => {
  assert.deepEqual(costOf(initiatives.find((initiative) => initiative.id === "sast"), orbitpay), { budget: 11, weeks: 6 });
  assert.deepEqual(optionCost(orbitpay, "sast"), { budget: 6, weeks: 3 }, "dollars and weeks round separately");
  assert.deepEqual(costOf(initiatives.find((initiative) => initiative.id === "mfa"), retailrush), { budget: 27, weeks: 17 });
  assert.deepEqual(optionCost(retailrush, "mfa"), { budget: 14, weeks: 9 });
  assert.deepEqual(optionCost(medisecure, "pentest"), { budget: 0, weeks: 0 });
  assert.equal(canActivate(medisecure, [], "pentest"), false, "in-place controls can't be bought again");
  assert.deepEqual(levelsFor(medisecure, []), { data_protection: 1, pentest: 1, ir: 0.5, inventory: 0.5, training: 0.5, rbac: 0.5, detection: 0.5 });
  assert.equal(levelsFor(medisecure, ["ir"]).ir, 1);
  assert.deepEqual(totals(orbitpay, ["sast", "inventory"]), { budget: 6 + 4, weeks: 3 + 8 });
});

test("resource limits are enforced, including on restored selections", () => {
  assert.equal(canActivate(medisecure, ["sca"], "sca"), false);
  assert.equal(canActivate(medisecure, [], "bogus"), false);
  const restored = sanitizeSelection(medisecure, ["sca", "bogus", "sca", "pentest", "vuln_mgmt", "container", "secrets", "dast", "rbac", "detection", "ir", "mfa"]);
  assert.deepEqual(restored, ["sca", "vuln_mgmt", "container", "secrets", "dast"]);
  const spent = totals(medisecure, restored);
  assert.ok(spent.budget <= medisecure.budget && spent.weeks <= medisecure.engineerWeeks);
  assert.deepEqual(sanitizeSelection(medisecure, "not an array"), []);
  assert.deepEqual(sanitizeSelection(undefined, ["sca"]), []);
});

test("an incident's outcome reflects the posture, the roadmap, and the foundations behind them", () => {
  const sqli = incidents.find((incident) => incident.id === "sqli");
  const before = assessIncident(sqli, retailrush, []);
  assert.equal(before.potential, 500);
  assert.equal(before.outcome, "contained");
  assert.deepEqual(before.contributors.slice(0, 2).map((item) => item.initiative.id), ["sast", "pentest"]);
  assert.ok(before.contributors[0].effectiveness < before.contributors[0].rated);
  const after = assessIncident(sqli, retailrush, ["vuln_mgmt", "champions", "training"]);
  assert.ok(after.mitigation > before.mitigation && after.impact < before.impact);
  assert.equal(after.impact % 10, 0);
  assert.equal(assessIncident(sqli, blank, []).outcome, "breached");
});

test("scoring follows dollars: dropping a control against a bigger risk costs more", () => {
  const [best] = examples.medisecure[0];
  const without = (id) => scoreRoadmap(medisecure, best.filter((item) => item !== id)).readiness;
  assert.ok(without("sca") < without("rbac"), "MediSecure's #1 risk is dependency CVEs");
});

test("each company is hard but fair across every affordable roadmap", () => {
  for (const scenario of scenarios) {
    const { best, bestWithoutFoundations, winners, fullPassShare } = difficulty[scenario.id];
    assert.ok(best.readiness >= passingReadiness + 8, `${scenario.id} best ${best.readiness}`);
    assert.ok(bestWithoutFoundations.readiness < passingReadiness, `${scenario.id} wins without foundations at ${bestWithoutFoundations.readiness}`);
    assert.ok(fullPassShare >= 0.02 && fullPassShare <= 0.1, `${scenario.id} full-budget pass share ${fullPassShare}`);
    assert.ok(winners.length >= 50, `${scenario.id} has ${winners.length} winners`);
    assert.equal(runSimulation(scenario, []).passed, false);
  }
  assert.deepEqual(scenarios.map((scenario) => difficulty[scenario.id].best.readiness), [75, 74, 77]);
});

test("every control wins somewhere, and no company can afford everything", () => {
  for (const initiative of initiatives) {
    assert.ok(scenarios.some((scenario) => difficulty[scenario.id].winners.some((roadmap) => roadmap.ids.includes(initiative.id))), `${initiative.id} never appears in a winning roadmap`);
  }
  for (const scenario of scenarios) {
    const spent = totals(scenario, difficulty[scenario.id].options.map((option) => option.id));
    assert.ok(spent.budget > scenario.budget || spent.weeks > scenario.engineerWeeks, scenario.id);
  }
});

test("the facilitator guide's example roadmaps are affordable and pass", () => {
  for (const [id, cases] of Object.entries(examples)) {
    const scenario = findScenario(id);
    for (const [ids, readiness] of cases) {
      assert.deepEqual(sanitizeSelection(scenario, ids), ids, `${id} roadmap exceeds resources`);
      assert.equal(scoreRoadmap(scenario, ids).readiness, readiness, `${id}: ${ids.join(" + ")}`);
    }
  }
  const tools = ["sast", "sca", "secrets", "mfa", "waf", "container"];
  assert.equal(scoreRoadmap(orbitpay, tools).readiness, 40, "upgrading every free tool without foundations");
  assert.equal(scoreRoadmap(orbitpay, [...tools, "inventory", "vuln_mgmt"]).readiness, 64);
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

test("simulator roadmaps seed the map, with upgrades and foundations as their own rows", () => {
  const rows = rowsFromSimulation(orbitpay, ["sast", "ir", "inventory", "waf"]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].initiative, "Upgrade existing SAST Pipeline Scanning");
  assert.equal(rows[0].investment, "$6K and 3 engineer-weeks over 6 months");
  assert.equal(rows[1].initiative, "Incident Response Plan");
  assert.equal(rows[1].investment, "$7K and 5 engineer-weeks over 6 months");
  assert.equal(rows[2].initiative, "Inventory, Risk Classification & Coverage Metrics");
  assert.equal(rows[0].metric, "");
  assert.equal(rows[0].impact, "");
  assert.deepEqual(sanitizeRows(rows).slice(0, 3), rows, "imported rows survive sanitizing unchanged");
  assert.equal(rowsFromSimulation(undefined, ["sast"])[0].initiative, "");
});
