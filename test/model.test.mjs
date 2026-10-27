// Fast unit tests for the game model (js/model.js). The exhaustive balance proof is
// scripts/check.mjs; the known-plan scores below match what that check reports.

import { test } from "node:test";
import assert from "node:assert/strict";
import { components, initiatives, scenarios, resources, WIN_BAR, byId, strength, missingFoundations, spend, fits, runAll } from "../js/model.js";

const EPS = 1e-9;

test("18 cards with unique ids, each with kind, component, ref and does", () => {
  assert.equal(initiatives.length, 18);
  const ids = initiatives.map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length, "card ids are unique");
  const componentIds = new Set(components.map((component) => component.id));
  for (const item of initiatives) {
    assert.ok(["process", "tool"].includes(item.kind), `${item.id} has a kind`);
    assert.ok(componentIds.has(item.component), `${item.id} sits under a known component`);
    assert.ok(item.ref && item.ref.trim(), `${item.id} has a ref`);
    assert.doesNotMatch(item.ref, /TBD/i, `${item.id} ref is not TBD`);
    assert.ok(item.does && item.does.trim(), `${item.id} says what it does`);
  }
});

test("every needs id names a real card", () => {
  for (const item of initiatives) {
    for (const need of item.needs || []) assert.ok(byId[need], `${item.id} needs unknown card ${need}`);
  }
});

test("scenario weights sum to 1 and the win bar is 80%", () => {
  const total = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
  assert.ok(Math.abs(total - 1) < EPS, `weights sum to ${total}`);
  assert.equal(WIN_BAR, 0.8);
});

test("in-place rule is recursive: champions without partners weakens SAST and threat modeling", () => {
  const base = { champions: 0, pipeline: 0, threat_assessment: 0, sast: 1, threat_model: 1 };
  const withPartners = { ...base, partners: 0 };
  assert.equal(strength(withPartners, "sast"), 1);
  assert.equal(strength(withPartners, "threat_model"), 1);

  // Champions itself is built, but its own need (partners) is missing, so it isn't in place
  // for the cards that need it.
  assert.deepEqual(missingFoundations(base, "champions"), ["partners"]);
  assert.deepEqual(missingFoundations(base, "sast"), ["champions"]);
  assert.deepEqual(missingFoundations(base, "threat_model"), ["champions"]);
  assert.ok(strength(base, "sast") < 1);
  assert.ok(strength(base, "threat_model") < 1);
});

test("a prerequisite built after the card isn't in place for it", () => {
  const plan = { inventory: 2, mfa: 1 };
  assert.deepEqual(missingFoundations(plan, "mfa"), ["inventory"]);
  assert.equal(strength(plan, "mfa"), 0.5);
});

test("fits() respects the budget cap", () => {
  // detection $30K + pentest $25K + sca $25K = $80K, over the $70K budget.
  const plan = { detection: 0, pentest: 1 };
  assert.ok(spend(plan).budgetK + byId.sca.costK > resources.budgetK);
  for (let quarter = 0; quarter < resources.quarters.length; quarter++) assert.equal(fits(plan, "sca", quarter), false);
  assert.equal(fits(plan, "mfa", 2), true); // $15K brings it to exactly $70K
});

test("fits() respects each quarter's FTE cap", () => {
  // Three 1-FTE cards fill Q1's 3 FTE cap.
  const plan = { inventory: 0, mfa: 0, secrets: 0 };
  assert.equal(spend(plan).fte[0], resources.fte[0]);
  assert.equal(fits(plan, "why", 0), false);
  assert.equal(fits(plan, "why", 1), true);
});

// Scores confirmed with runAll and matching the balance check's reports.
const KNOWN_PLANS = [
  {
    name: "a winning plan",
    plan: { inventory: 0, mfa: 0, secrets: 0, why: 1, threat_assessment: 1, kpis: 1, partners: 2, champions: 2, metrics_review: 2, threat_model: 2, operating_model: 3, fix_slas: 3, sca: 3 },
    score: 0.886,
    won: true
  },
  {
    name: "the best plan",
    plan: { why: 0, threat_assessment: 0, kpis: 0, partners: 1, operating_model: 1, champions: 1, fix_slas: 1, inventory: 2, metrics_review: 2, threat_model: 2, mfa: 2, pipeline: 3, secrets: 3, sca: 3 },
    score: 0.935,
    won: true
  },
  {
    name: "tools without foundations",
    plan: { sca: 0, mfa: 0, sast: 1 },
    score: 0.160,
    won: false
  }
];

for (const known of KNOWN_PLANS) {
  test(`known plan scores: ${known.name}`, () => {
    const used = spend(known.plan);
    assert.ok(used.budgetK <= resources.budgetK, "plan is within budget");
    used.fte.forEach((fte, quarter) => assert.ok(fte <= resources.fte[quarter] + EPS, `plan fits ${resources.quarters[quarter]} FTE`));
    const { score, won } = runAll(known.plan);
    assert.ok(Math.abs(score - known.score) <= 0.0005, `score ${score} vs ${known.score}`);
    assert.equal(won, known.won);
  });
}
