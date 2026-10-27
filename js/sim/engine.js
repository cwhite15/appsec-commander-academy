// End-of-year attack simulator: the pure layout and timeline engine.
// Turns a plan into everything the renderer needs (lanes, stacked shield pieces, shots)
// with no DOM and no randomness, so the same plan always plays the same way.
// Every number is read from ../model.js at call time, so retuning weights and cuts
// never needs a change here; nothing in this file hardcodes a game value.

// Namespace import, so the engine still loads if the model drops or adds an optional export
// (missingFoundations / inPlace).
import * as model from "../model.js";

const { resources, initiatives, scenarios, WIN_BAR, strength, runAll } = model;

// Radial layout units: the building sits inside radius 1.0 and the shield starts at 1.15,
// leaving a visible ring of air so an empty lane reads as a gap, not as "building".
export const SHIELD_BASE = 1.15;
// Up to nine foundations can share the base layer, and most of them span every lane, so
// each one is a thin course of bricks. Everything else (tools, and process cards with cuts
// that nothing needs) is as thick as the risk it actually cuts.
export const FOUNDATION_THICKNESS = 0.08;
export const TOOL_BASE_THICKNESS = 0.1;
export const TOOL_CUT_THICKNESS = 0.4;

export function segmentThickness(foundation, cut) {
  return foundation ? FOUNDATION_THICKNESS : TOOL_BASE_THICKNESS + TOOL_CUT_THICKNESS * cut;
}

// Keep the outermost lanes off the horizon so their projectiles stay on screen.
const LANE_MARGIN = (12 * Math.PI) / 180;

// Projectile labels: short enough to sit beside a moving shot. Unknown ids fall back to
// the scenario title, truncated, so a new scenario still renders.
const SHORT_LABELS = {
  dep: "Log4j-style CVE",
  cred: "Credential stuffing",
  secret: "Cloud key leak",
  sqli: "SQL injection",
  logic: "Refund logic abuse",
  php: "PHP2Shell"
};
const SHORT_MAX = 22;

export function shortLabel(scenario) {
  if (SHORT_LABELS[scenario.id]) return SHORT_LABELS[scenario.id];
  const title = scenario.title || scenario.id;
  return title.length <= SHORT_MAX ? title : `${title.slice(0, SHORT_MAX - 1).trimEnd()}…`;
}

// Heaviest first; ties keep the model's scenario order so the result is deterministic.
function byWeightDesc(list) {
  return list
    .map((scenario, order) => ({ scenario, order }))
    .sort((a, b) => b.scenario.weight - a.scenario.weight || a.order - b.order)
    .map((entry) => entry.scenario);
}

// Slot indices (0 = leftmost) ordered from the centre outwards, alternating sides, so the
// heaviest attacks fly straight down the middle and the lighter ones come in from the flanks.
function centreOutSlots(count) {
  const slots = [];
  let left = Math.floor((count - 1) / 2);
  let right = left + 1;
  while (slots.length < count) {
    if (left >= 0) slots.push(left--);
    if (right < count) slots.push(right++);
  }
  return slots;
}

function slotAngle(slot, count) {
  if (count === 1) return Math.PI / 2;
  const span = Math.PI - 2 * LANE_MARGIN;
  return Math.PI - LANE_MARGIN - (slot * span) / (count - 1);
}

// Lanes are returned left to right (angle PI side first), so lane.index is a screen order.
function buildLanes() {
  const count = scenarios.length;
  const slots = centreOutSlots(count);
  const placed = byWeightDesc(scenarios).map((scenario, rank) => ({ scenario, slot: slots[rank] }));
  placed.sort((a, b) => a.slot - b.slot);
  return placed.map(({ scenario, slot }, index) => ({
    index,
    scenarioId: scenario.id,
    title: scenario.title,
    short: shortLabel(scenario),
    likelihood: scenario.likelihood,
    weight: scenario.weight,
    angle: slotAngle(slot, count)
  }));
}

// The scenarios whose `cuts` name this initiative, as lane indices.
function cutLanes(id, laneOf) {
  return scenarios.filter((scenario) => id in scenario.cuts).map((scenario) => laneOf[scenario.id]);
}

function needsOf(id) {
  const item = initiatives.find((entry) => entry.id === id);
  return (item && item.needs) || [];
}

// Every card that needs this one, directly or through a chain (why -> kpis -> detection).
export function downstreamOf(id) {
  const found = new Set();
  const queue = [id];
  while (queue.length) {
    const current = queue.shift();
    for (const item of initiatives) {
      if (!found.has(item.id) && needsOf(item.id).includes(current)) {
        found.add(item.id);
        queue.push(item.id);
      }
    }
  }
  found.delete(id);
  return found;
}

// A piece is drawn under everything it holds up: its own cut lanes plus the cut lanes of
// every card downstream of it (built or not), so its shape is fixed and players learn to read
// it. A card nothing needs just covers its own cut lanes.
function pieceLanes(item, laneOf) {
  const lanes = new Set(cutLanes(item.id, laneOf));
  for (const id of downstreamOf(item.id)) for (const lane of cutLanes(id, laneOf)) lanes.add(lane);
  return [...lanes].sort((a, b) => a - b);
}

// Dependency depth: 0 for a card with no needs, else 1 + the deepest of its needs.
export function dependencyDepth(id, seen = new Set()) {
  if (seen.has(id)) return 0; // guard against a cyclic tuning mistake
  const next = new Set(seen).add(id);
  return needsOf(id).reduce((depth, need) => Math.max(depth, 1 + dependencyDepth(need, next)), 0);
}

// Foundations first (they form the base layer the rest sits on), ordered by quarter, then
// prerequisites before dependants, then the model's initiative order. Then everything else
// by quarter and initiative order.
function dropSequence(plan) {
  const built = initiatives
    .map((item, order) => ({ item, order, quarter: plan[item.id], depth: dependencyDepth(item.id) }))
    .filter((entry) => entry.quarter !== undefined);
  const group = (entry) => (entry.item.foundation ? 0 : 1);
  const depthKey = (entry) => (entry.item.foundation ? entry.depth : 0);
  built.sort((a, b) => group(a) - group(b) || a.quarter - b.quarter || depthKey(a) - depthKey(b) || a.order - b.order);
  return built;
}

// The prerequisites of this card that are not in place for it. Prefers the model's own
// recursive rule (missingFoundations, or inPlace if that is what it exports).
function missingNeeds(plan, id) {
  if (typeof model.missingFoundations === "function") return model.missingFoundations(plan, id);
  if (typeof model.inPlace === "function") return needsOf(id).filter((need) => !model.inPlace(plan, need, plan[id]));
  return [];
}

// Tetris stacking: each piece is rigid, so it lands on the highest top across its lanes and
// leaves voids in the shorter ones. That is the visual cost of a badly sequenced roadmap.
function stackPieces(plan, lanes) {
  const laneOf = Object.fromEntries(lanes.map((lane) => [lane.scenarioId, lane.index]));
  const scenarioOf = Object.fromEntries(scenarios.map((scenario) => [scenario.id, scenario]));
  const tops = lanes.map(() => SHIELD_BASE);
  const pieces = dropSequence(plan).map(({ item, quarter }, dropOrder) => {
    const pieceStrength = strength(plan, item.id);
    const spans = pieceLanes(item, laneOf);
    const inner = spans.reduce((top, lane) => Math.max(top, tops[lane]), SHIELD_BASE);
    const segments = spans.map((lane) => {
      const cut = (scenarioOf[lanes[lane].scenarioId].cuts[item.id] || 0) * pieceStrength;
      const outer = inner + segmentThickness(!!item.foundation, cut);
      tops[lane] = outer;
      return { lane, inner, outer, cut };
    });
    return {
      id: item.id,
      name: item.name,
      component: item.component,
      foundation: !!item.foundation,
      quarter,
      strength: pieceStrength,
      // Weak cut (strength < 1), or a process enabler built without its own prerequisites
      // in place, which has no cuts of its own to show the damage.
      cracked: pieceStrength < 1 || missingNeeds(plan, item.id).length > 0,
      dropOrder,
      segments
    };
  });
  return { pieces, laneTops: tops };
}

// One shot per scenario, heaviest first, so the biggest hits land while attention is high.
// Health starts at the total weight (1 while weights sum to 1, as the model intends), which
// keeps finalHealth equal to runAll().score even if a tuning pass drifts the sum.
function buildShots(plan, lanes) {
  const { results, score, won } = runAll(plan);
  const resultOf = Object.fromEntries(results.map((result) => [result.scenario.id, result]));
  const laneOf = Object.fromEntries(lanes.map((lane) => [lane.scenarioId, lane]));
  let health = scenarios.reduce((sum, scenario) => sum + scenario.weight, 0);
  const shots = byWeightDesc(scenarios).map((scenario) => {
    const { outcome, reduction } = resultOf[scenario.id];
    const damage = scenario.weight * (1 - reduction);
    const healthBefore = health;
    // Clamp only float dust: damage never exceeds weight, so health can't truly go negative.
    health = Math.max(0, healthBefore - damage);
    const lane = laneOf[scenario.id];
    return { lane: lane.index, scenarioId: scenario.id, label: lane.short, outcome, reduction, damage, healthBefore, healthAfter: health };
  });
  return { shots, finalHealth: health, score, won };
}

// plan: { initiativeId: quarterIndex (0-3) }, the same shape model.js uses.
export function buildSimulation(plan) {
  const lanes = buildLanes();
  const { pieces, laneTops } = stackPieces(plan, lanes);
  const { shots, finalHealth, won } = buildShots(plan, lanes);
  return {
    company: resources.company,
    lanes,
    pieces,
    laneTops,
    shots,
    finalHealth,
    // Taken from runAll so the sim and the after-action report can never disagree at the bar.
    won,
    winBar: WIN_BAR
  };
}
