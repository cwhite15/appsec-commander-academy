// Tests for the attack-simulation engine (js/sim/engine.js). Run: npm test
// Expectations are derived from model.js at run time, never hardcoded, so retuning
// weights and cuts doesn't break them.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as model from "../js/model.js";
import { buildSimulation, SHIELD_BASE, FOUNDATION_THICKNESS, TOOL_BASE_THICKNESS, TOOL_CUT_THICKNESS } from "../js/sim/engine.js";

const { initiatives, scenarios, resources, WIN_BAR, strength, judge, runAll, fits } = model;
const byId = Object.fromEntries(initiatives.map((item) => [item.id, item]));
const needsOf = (id) => byId[id].needs || [];

const EPS = 1e-9;
const QUARTERS = resources.quarters.length;

// Seeded PRNG (mulberry32) so a failure reproduces exactly.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Random feasible plan: visit initiatives in a shuffled order and keep each random pick
// only if the model's fits() accepts it, so budget and per-quarter FTE always hold.
function randomPlan(next) {
  const order = initiatives.map((item) => item.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const keep = 0.3 + 0.6 * next();
  const plan = {};
  for (const id of order) {
    if (next() > keep) continue;
    const quarter = Math.floor(next() * QUARTERS);
    if (fits(plan, id, quarter)) plan[id] = quarter;
  }
  return plan;
}

// Greedy plan builder for hand-made cases: adds what fits, in the order given.
function greedy(picks) {
  const plan = {};
  for (const [id, quarter] of picks) if (fits(plan, id, quarter)) plan[id] = quarter;
  return plan;
}

// Independent dependency depth: longest chain of needs above a card.
function depthOf(id) {
  return needsOf(id).reduce((depth, need) => Math.max(depth, 1 + depthOf(need)), 0);
}
const topoOrder = initiatives.map((item) => item.id).sort((a, b) => depthOf(a) - depthOf(b));

// Sensible: every card placed no earlier than all its needs, and only if all its needs made
// it into the plan, so every prerequisite is in place (recursively) by construction.
function sensiblePlan() {
  const plan = {};
  for (const id of topoOrder) {
    if (!needsOf(id).every((need) => plan[need] !== undefined)) continue;
    const earliest = Math.max(0, ...needsOf(id).map((need) => plan[need]));
    for (let quarter = earliest; quarter < QUARTERS; quarter++) {
      if (fits(plan, id, quarter)) { plan[id] = quarter; break; }
    }
  }
  return plan;
}

const handPlans = {
  empty: {},
  foundationsOnly: greedy(initiatives.filter((item) => item.foundation).map((item, i) => [item.id, i % QUARTERS])),
  sensible: sensiblePlan(),
  // Dependants first in Q1, their prerequisites in Q4, so several pieces are cracked.
  backwards: greedy([
    ...initiatives.filter((item) => needsOf(item.id).length).map((item) => [item.id, 0]),
    ...initiatives.filter((item) => !needsOf(item.id).length).map((item) => [item.id, QUARTERS - 1])
  ])
};

function randomPlans(count, seed) {
  const next = rng(seed);
  return Array.from({ length: count }, () => randomPlan(next));
}

const allPlans = [...Object.values(handPlans), ...randomPlans(2000, 2026)];

// Every card downstream of `id` (needs it directly or through a chain), recomputed here
// independently of the engine.
function downstream(id) {
  const out = new Set();
  let frontier = [id];
  while (frontier.length) {
    frontier = initiatives.filter((item) => !out.has(item.id) && needsOf(item.id).some((need) => frontier.includes(need))).map((item) => item.id);
    for (const next of frontier) out.add(next);
  }
  out.delete(id);
  return out;
}

// The lanes a piece should cover: its own cut lanes plus those of everything downstream.
function expectedScenarioIds(item) {
  const cards = [item.id, ...downstream(item.id)];
  return scenarios.filter((s) => cards.some((id) => id in s.cuts)).map((s) => s.id).sort();
}

// Independent "in place" rule: built no later than `quarter`, and its own needs in place for it.
function inPlaceFor(plan, need, quarter) {
  return plan[need] !== undefined && plan[need] <= quarter && needsOf(need).every((n) => inPlaceFor(plan, n, plan[need]));
}

test("random plans are feasible and varied", () => {
  const sizes = new Set(allPlans.map((plan) => Object.keys(plan).length));
  assert.ok(sizes.size >= 5, "random generator should produce plans of many sizes");
  assert.ok(allPlans.some((plan) => runAll(plan).won), "some plan should win");
  assert.ok(allPlans.some((plan) => !runAll(plan).won), "some plan should lose");
  assert.ok(allPlans.some((plan) => buildSimulation(plan).pieces.some((piece) => piece.cracked)), "some plan should crack a piece");
});

test("finalHealth equals runAll(plan).score, and won/winBar agree", () => {
  for (const plan of allPlans) {
    const sim = buildSimulation(plan);
    const run = runAll(plan);
    assert.ok(Math.abs(sim.finalHealth - run.score) < EPS, `finalHealth ${sim.finalHealth} vs score ${run.score} for ${JSON.stringify(plan)}`);
    assert.equal(sim.won, run.won);
    assert.equal(sim.won, sim.finalHealth >= WIN_BAR - EPS);
    assert.equal(sim.winBar, WIN_BAR);
    assert.equal(sim.company, resources.company);
  }
});

test("shots: one per scenario, descending weight, chained health, never below 0", () => {
  for (const plan of allPlans) {
    const sim = buildSimulation(plan);
    assert.equal(sim.shots.length, scenarios.length);
    assert.deepEqual(new Set(sim.shots.map((shot) => shot.scenarioId)), new Set(scenarios.map((s) => s.id)));
    const total = scenarios.reduce((sum, s) => sum + s.weight, 0);
    assert.ok(Math.abs(sim.shots[0].healthBefore - total) < EPS);
    sim.shots.forEach((shot, i) => {
      const scenario = scenarios.find((s) => s.id === shot.scenarioId);
      const lane = sim.lanes[shot.lane];
      if (i > 0) {
        assert.ok(scenarios.find((s) => s.id === sim.shots[i - 1].scenarioId).weight >= scenario.weight, "descending weight");
        assert.equal(shot.healthBefore, sim.shots[i - 1].healthAfter, "health chains");
      }
      const verdict = judge(plan, scenario);
      assert.equal(shot.outcome, verdict.outcome);
      assert.ok(Math.abs(shot.reduction - verdict.reduction) < EPS);
      assert.ok(Math.abs(shot.damage - scenario.weight * (1 - verdict.reduction)) < EPS);
      assert.ok(Math.abs(shot.healthAfter - (shot.healthBefore - shot.damage)) < EPS);
      assert.ok(shot.healthAfter >= 0 && shot.healthBefore >= 0);
      assert.equal(lane.scenarioId, shot.scenarioId);
      assert.equal(shot.label, lane.short);
    });
    assert.equal(sim.finalHealth, sim.shots.at(-1).healthAfter);
  }
});

test("lanes: one per scenario, distinct angles in (0, PI), heaviest nearest the middle", () => {
  const { lanes } = buildSimulation({});
  assert.equal(lanes.length, scenarios.length);
  assert.deepEqual(lanes.map((lane) => lane.scenarioId).sort(), scenarios.map((s) => s.id).sort());
  lanes.forEach((lane, i) => {
    const scenario = scenarios.find((s) => s.id === lane.scenarioId);
    assert.equal(lane.index, i);
    assert.equal(lane.title, scenario.title);
    assert.equal(lane.weight, scenario.weight);
    assert.equal(lane.likelihood, scenario.likelihood);
    assert.ok(lane.angle > 0 && lane.angle < Math.PI, `angle ${lane.angle}`);
    assert.ok(typeof lane.short === "string" && lane.short.length > 0 && lane.short.length <= 22);
  });
  assert.equal(new Set(lanes.map((lane) => lane.angle.toFixed(9))).size, lanes.length, "distinct angles");
  // index runs left to right on screen
  for (let i = 1; i < lanes.length; i++) assert.ok(lanes[i].angle < lanes[i - 1].angle);
  const fromMiddle = (lane) => Math.abs(lane.angle - Math.PI / 2);
  const heaviest = lanes.reduce((best, lane) => (lane.weight > best.weight ? lane : best));
  for (const lane of lanes) assert.ok(fromMiddle(heaviest) <= fromMiddle(lane) + EPS, `${heaviest.scenarioId} nearest PI/2`);
  // Lighter lanes never sit closer to the middle than heavier ones.
  for (const a of lanes) for (const b of lanes) {
    if (a.weight > b.weight) assert.ok(fromMiddle(a) <= fromMiddle(b) + EPS, `${a.scenarioId} inside ${b.scenarioId}`);
  }
});

test("lanes do not depend on the plan", () => {
  const base = buildSimulation({}).lanes;
  for (const plan of allPlans.slice(0, 50)) assert.deepEqual(buildSimulation(plan).lanes, base);
});

test("pieces: only built initiatives, covering exactly the expected lanes", () => {
  for (const plan of allPlans) {
    const sim = buildSimulation(plan);
    assert.deepEqual(sim.pieces.map((piece) => piece.id).sort(), Object.keys(plan).sort());
    for (const piece of sim.pieces) {
      const item = initiatives.find((i) => i.id === piece.id);
      assert.equal(piece.name, item.name);
      assert.equal(piece.component, item.component);
      assert.equal(piece.foundation, !!item.foundation);
      assert.equal(piece.quarter, plan[piece.id]);
      const got = piece.segments.map((seg) => sim.lanes[seg.lane].scenarioId).sort();
      assert.deepEqual(got, expectedScenarioIds(item), `${piece.id} lanes`);
      assert.equal(new Set(piece.segments.map((seg) => seg.lane)).size, piece.segments.length, "no duplicate lanes");
      for (const seg of piece.segments) {
        const scenario = scenarios.find((s) => s.id === sim.lanes[seg.lane].scenarioId);
        assert.ok(Math.abs(seg.cut - (scenario.cuts[piece.id] || 0) * piece.strength) < EPS);
      }
    }
  }
});

test("lane shapes: foundations hold up everything downstream of them", () => {
  const all = buildSimulation(Object.fromEntries(initiatives.map((item) => [item.id, 0])));
  for (const piece of all.pieces) {
    const lanes = new Set(piece.segments.map((seg) => seg.lane));
    for (const id of downstream(piece.id)) {
      const other = all.pieces.find((p) => p.id === id);
      for (const seg of other.segments) assert.ok(lanes.has(seg.lane), `${piece.id} spans ${id}'s lane ${seg.lane}`);
    }
  }
  // A card that cuts every lane makes everything upstream of it span the whole wall.
  for (const item of initiatives) {
    if (!scenarios.every((s) => item.id in s.cuts)) continue;
    for (const upstream of initiatives.filter((u) => downstream(u.id).has(item.id))) {
      assert.equal(all.pieces.find((p) => p.id === upstream.id).segments.length, scenarios.length, `${upstream.id} spans all lanes`);
    }
  }
});

test("drop order: foundations by quarter then depth, then the rest by quarter, model order breaks ties", () => {
  const rank = Object.fromEntries(initiatives.map((item, i) => [item.id, i]));
  const key = (p) => [p.foundation ? 0 : 1, p.quarter, p.foundation ? depthOf(p.id) : 0, rank[p.id]];
  for (const plan of allPlans) {
    const { pieces } = buildSimulation(plan);
    pieces.forEach((piece, i) => {
      assert.equal(piece.dropOrder, i);
      if (i === 0) return;
      const [a, b] = [key(pieces[i - 1]), key(piece)];
      const cmp = a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3];
      assert.ok(cmp < 0, `${pieces[i - 1].id} before ${piece.id}`);
    });
  }
  // Same-quarter foundations: prerequisites always drop before their dependants.
  const allQ0 = buildSimulation(Object.fromEntries(initiatives.map((item) => [item.id, 0])));
  const pos = Object.fromEntries(allQ0.pieces.map((p) => [p.id, p.dropOrder]));
  for (const item of initiatives.filter((i) => i.foundation)) {
    for (const need of needsOf(item.id)) if (byId[need].foundation) assert.ok(pos[need] < pos[item.id], `${need} before ${item.id}`);
  }
});

test("tetris stacking: one shared inner per piece, on top of every lane it spans", () => {
  for (const plan of allPlans) {
    const sim = buildSimulation(plan);
    const tops = sim.lanes.map(() => SHIELD_BASE);
    for (const piece of sim.pieces) {
      const inners = new Set(piece.segments.map((seg) => seg.inner));
      assert.ok(inners.size <= 1, `${piece.id} shares one inner`);
      for (const seg of piece.segments) {
        assert.ok(seg.inner >= tops[seg.lane] - EPS, `${piece.id} rests on lane ${seg.lane}`);
        assert.ok(seg.outer > seg.inner);
        const thickness = piece.foundation ? FOUNDATION_THICKNESS : TOOL_BASE_THICKNESS + TOOL_CUT_THICKNESS * seg.cut;
        assert.ok(Math.abs(seg.outer - seg.inner - thickness) < EPS, "thickness");
      }
      // A rigid piece lands on the highest of its lanes, not above it.
      if (piece.segments.length) {
        const highest = Math.max(...piece.segments.map((seg) => tops[seg.lane]));
        assert.ok(Math.abs(piece.segments[0].inner - highest) < EPS);
      }
      for (const seg of piece.segments) tops[seg.lane] = seg.outer;
    }
    assert.equal(sim.laneTops.length, sim.lanes.length);
    sim.laneTops.forEach((top, lane) => {
      const outers = sim.pieces.flatMap((piece) => piece.segments.filter((seg) => seg.lane === lane).map((seg) => seg.outer));
      assert.ok(Math.abs(top - Math.max(SHIELD_BASE, ...outers)) < EPS, `laneTops[${lane}]`);
    });
  }
});

test("the empty plan leaves every lane open", () => {
  const sim = buildSimulation({});
  assert.equal(sim.pieces.length, 0);
  assert.deepEqual(sim.laneTops, sim.lanes.map(() => SHIELD_BASE));
  assert.ok(sim.shots.every((shot) => shot.outcome === "unprotected"));
  assert.ok(Math.abs(sim.finalHealth) < EPS);
  assert.equal(sim.won, false);
});

test("thickness constants keep a full base layer thin", () => {
  assert.ok(FOUNDATION_THICKNESS >= 0.08 && FOUNDATION_THICKNESS <= 0.1);
  assert.equal(TOOL_BASE_THICKNESS, 0.1);
  assert.equal(TOOL_CUT_THICKNESS, 0.4);
  for (const plan of allPlans) for (const top of buildSimulation(plan).laneTops) assert.ok(top <= 3.5, `laneTop ${top} keeps the renderer's scale sensible`);
});

test("cracked iff strength < 1 or a prerequisite is not in place", () => {
  let cracked = 0;
  let enablerCracks = 0;
  for (const plan of allPlans) {
    for (const piece of buildSimulation(plan).pieces) {
      assert.equal(piece.strength, strength(plan, piece.id));
      const notInPlace = needsOf(piece.id).some((need) => !inPlaceFor(plan, need, plan[piece.id]));
      assert.equal(piece.cracked, piece.strength < 1 || notInPlace, `${piece.id} in ${JSON.stringify(plan)}`);
      if (piece.cracked) cracked++;
      if (piece.cracked && piece.foundation && notInPlace) enablerCracks++;
    }
  }
  assert.ok(cracked > 0);
  if (initiatives.some((item) => item.foundation && needsOf(item.id).length)) assert.ok(enablerCracks > 0, "some process enabler cracks");
  assert.ok(buildSimulation(handPlans.backwards).pieces.some((piece) => piece.cracked));
  assert.ok(buildSimulation(handPlans.sensible).pieces.length > 0);
  assert.ok(buildSimulation(handPlans.sensible).pieces.every((piece) => !piece.cracked));
});

test("deterministic: same plan, same simulation", () => {
  for (const plan of allPlans.slice(0, 100)) assert.deepEqual(buildSimulation(plan), buildSimulation({ ...plan }));
});
