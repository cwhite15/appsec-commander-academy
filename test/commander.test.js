import test from "node:test";
import assert from "node:assert/strict";
import { checkAnswer, descriptionBlocks, protocols, totalCommands } from "../js/protocols.js";
import { assessIncident, canActivate, costOf, coverageFor, deckExposure, formatImpact, helpfulInitiatives, impactOf, incidentDeck, mitigationFor, incidents, initiatives, passingReadiness, runSimulation, sanitizeSelection, scenarios, totals } from "../js/simulation.js";
import { checkMapAnswer, checkpoint, isRowComplete, maxFieldLength, rankRows, readyToLock, rowsFromSimulation, sanitizeRows } from "../js/roadmap.js";

const subsets = (items) => items.reduce((all, item) => all.concat(all.map((set) => [...set, item])), [[]]);

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

test("every incident is coverable and every scenario deck is valid", () => {
  for (const incident of incidents) assert.ok(helpfulInitiatives(incident.coverageNeeded).some((item) => item.direct), incident.id);
  for (const initiative of initiatives) {
    for (const share of Object.values(initiative.mitigates)) assert.ok(share > 0 && share < 1, `${initiative.id} must be partial`);
  }
  for (const scenario of scenarios) {
    assert.equal(scenario.incidentIds.length, 5);
    assert.equal(new Set(scenario.incidentIds).size, 5);
    assert.ok(incidentDeck(scenario).every(Boolean));
  }
});

test("each scenario can be won within its resources, but not by funding nothing", () => {
  for (const scenario of scenarios) {
    const affordable = subsets(initiatives.map((initiative) => initiative.id)).filter((ids) => {
      const spent = totals(scenario, ids);
      return spent.budget <= scenario.budget && spent.weeks <= scenario.engineerWeeks;
    });
    assert.ok(affordable.some((ids) => runSimulation(scenario, ids).passed), `${scenario.id} is unwinnable`);
    assert.equal(runSimulation(scenario, []).passed, false);
  }
});

test("no scenario can afford every initiative", () => {
  const all = initiatives.map((initiative) => initiative.id);
  for (const scenario of scenarios) {
    const spent = totals(scenario, all);
    assert.ok(spent.budget > scenario.budget || spent.weeks > scenario.engineerWeeks, scenario.id);
  }
});

test("readiness is the share of projected loss prevented, and the bar is 60%", () => {
  const medisecure = scenarios.find((scenario) => scenario.id === "medisecure");
  const result = runSimulation(medisecure, ["sca", "rbac", "secrets", "ir"]);
  assert.equal(passingReadiness, 60);
  assert.equal(result.exposure, deckExposure(medisecure));
  assert.equal(result.exposure, 1450);
  assert.equal(result.financialImpact, 420);
  assert.equal(result.prevented, 1030);
  assert.equal(result.readiness, 71);
  assert.equal(result.passed, true);
  assert.deepEqual(result.results.map((item) => item.outcome), ["neutralized", "neutralized", "neutralized", "breached", "contained"]);
  assert.equal(runSimulation(medisecure, []).readiness, 0);
});

test("layered controls combine without exceeding 100%, and response limits rather than prevents", () => {
  assert.ok(Math.abs(mitigationFor(["sast", "training"], "code_injection") - 0.79) < 1e-9);
  assert.ok(Math.abs(mitigationFor(["sast", "training", "waf"], "code_injection") - 0.853) < 1e-9);
  assert.equal(mitigationFor(["secrets"], "credential_stuffing"), 0);
  assert.ok(Math.abs(mitigationFor(["ir"], "ddos") - 0.15) < 1e-9);
  assert.ok(Math.abs(mitigationFor(["ir"], "breach_response") - 0.6) < 1e-9);
  const orbitpay = scenarios.find((scenario) => scenario.id === "orbitpay");
  const sqli = incidents.find((incident) => incident.id === "sqli");
  const layered = assessIncident(sqli, ["sast", "training"], orbitpay);
  assert.equal(layered.outcome, "neutralized");
  assert.deepEqual(layered.contributors.map((item) => item.initiative.id), ["sast", "training"]);
  assert.equal(layered.impact, 80);
  assert.equal(assessIncident(sqli, ["training"], orbitpay).outcome, "contained");
  assert.equal(assessIncident(sqli, [], orbitpay).outcome, "breached");
});

test("scoring follows dollars: a costlier gap scores worse than a cheaper one", () => {
  const medisecure = scenarios.find((scenario) => scenario.id === "medisecure");
  const skipResponse = runSimulation(medisecure, ["sca", "rbac", "secrets", "container"]);
  const skipAuthz = runSimulation(medisecure, ["sca", "secrets", "ir", "container"]);
  assert.ok(skipResponse.financialImpact > skipAuthz.financialImpact);
  assert.ok(skipResponse.readiness < skipAuthz.readiness);
});

test("resource limits are enforced, including on restored selections", () => {
  const medisecure = scenarios.find((scenario) => scenario.id === "medisecure");
  assert.equal(canActivate(medisecure, ["sca", "rbac", "secrets", "ir"], "container"), false);
  assert.equal(canActivate(medisecure, ["sca"], "sca"), false);
  assert.deepEqual(sanitizeSelection(medisecure, ["sca", "bogus", "sca", "rbac", "secrets", "ir", "container"]), ["sca", "rbac", "secrets", "ir"]);
  assert.deepEqual(coverageFor(["sast", "training"]).map((item) => item.category), ["code_injection", "xss"]);
  assert.ok(Math.abs(coverageFor(["sast", "training"])[1].mitigation - 0.72) < 1e-9);
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

test("simulator initiatives seed the map without inventing metrics or priorities", () => {
  const rows = rowsFromSimulation(scenarios.find((scenario) => scenario.id === "orbitpay"), ["sast", "ir", "sca", "waf"]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].initiative, "SAST Pipeline Scanning");
  assert.equal(rows[0].metric, "");
  assert.equal(rows[0].impact, "");
  assert.equal(rows[0].investment, "$27K and 8 engineer-weeks over 6 months");
  assert.equal(rowsFromSimulation(undefined, ["sast"])[0].initiative, "");
});

test("the facilitator guide's example roadmaps are affordable and pass", () => {
  const examples = {
    orbitpay: [["sast", "secrets", "mfa", "container"], 68],
    medisecure: [["sca", "rbac", "secrets", "ir"], 71],
    retailrush: [["sca", "mfa", "waf", "training", "ir"], 74]
  };
  for (const [id, [ids, readiness]] of Object.entries(examples)) {
    const scenario = scenarios.find((item) => item.id === id);
    assert.deepEqual(sanitizeSelection(scenario, ids), ids, `${id} roadmap exceeds resources`);
    assert.equal(runSimulation(scenario, ids).readiness, readiness, id);
  }
  const orbitpay = scenarios.find((scenario) => scenario.id === "orbitpay");
  assert.equal(runSimulation(orbitpay, ["secrets", "training", "rbac", "container"]).passed, false, "coverage without MFA or SAST should not hold at OrbitPay");
});

test("every scenario is hard but fair: a small share of affordable roadmaps pass", () => {
  for (const scenario of scenarios) {
    const affordable = subsets(initiatives.map((initiative) => initiative.id)).filter((ids) => {
      const spent = totals(scenario, ids);
      return spent.budget <= scenario.budget && spent.weeks <= scenario.engineerWeeks;
    });
    const share = affordable.filter((ids) => runSimulation(scenario, ids).passed).length / affordable.length;
    assert.ok(share >= 0.03 && share <= 0.15, `${scenario.id} pass share ${share}`);
  }
});

test("scenarios use 6, 12, and 18 month timelines measured in engineer-weeks", () => {
  assert.deepEqual(scenarios.map((scenario) => scenario.months), [6, 12, 18]);
  for (const scenario of scenarios) {
    assert.ok(Number.isInteger(scenario.engineerWeeks) && scenario.engineerWeeks > 0, scenario.id);
    assert.ok(scenario.staffing.length > 0, scenario.id);
    assert.equal("engineerHours" in scenario, false);
  }
});

test("initiative costs are setup plus monthly run, scaled by the company's own size", () => {
  const sast = initiatives.find((initiative) => initiative.id === "sast");
  const company = (headcount, months) => ({ headcount, months });
  assert.deepEqual(costOf(sast, company(100, 12)), { budget: 41, weeks: 10 });
  assert.ok(costOf(sast, company(100, 18)).budget > costOf(sast, company(100, 6)).budget);
  assert.ok(costOf(sast, company(200, 12)).weeks > costOf(sast, company(100, 12)).weeks);
  for (const initiative of initiatives) {
    for (const key of ["setupK", "monthlyK", "setupWeeks", "monthlyWeeks"]) assert.ok(initiative[key] >= 0, `${initiative.id}.${key}`);
  }
});

test("each scenario stands alone with resources sized to its own company", () => {
  for (const scenario of scenarios) {
    const scale = scenario.headcount / 100;
    const budgetPerMonth = scenario.budget / scenario.months / scale;
    const weeksPerMonth = scenario.engineerWeeks / scenario.months / scale;
    assert.ok(budgetPerMonth >= 6 && budgetPerMonth <= 15, `${scenario.id} budget rate ${budgetPerMonth}`);
    assert.ok(weeksPerMonth >= 2 && weeksPerMonth <= 5, `${scenario.id} capacity rate ${weeksPerMonth}`);
  }
});

test("incident impact scales with company size and sector exposure", () => {
  const byId = (id) => scenarios.find((scenario) => scenario.id === id);
  const breach = incidents.find((incident) => incident.id === "breach");
  assert.equal(impactOf(breach, byId("orbitpay")), 780);
  assert.equal(impactOf(breach, byId("medisecure")), 600);
  assert.equal(impactOf(breach, byId("retailrush")), 1000);
  for (const scenario of scenarios) {
    for (const incident of incidents) assert.equal(impactOf(incident, scenario) % 10, 0);
    const unprotected = runSimulation(scenario, []).financialImpact;
    assert.ok(unprotected > scenario.budget, `${scenario.id}: doing nothing should cost more than the program`);
  }
  assert.equal(formatImpact(780), "$780K");
  assert.equal(formatImpact(1000), "$1.0M");
  assert.equal(formatImpact(1250), "$1.3M");
});
