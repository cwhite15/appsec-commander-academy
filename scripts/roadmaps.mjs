// Searches a company's roadmaps with the real model. Shared by scripts/calibrate.mjs and the tests.
//
// Every control choice also needs a start month, so exhaustive search is out of reach
// (OrbitPay alone has 3^18 plans). Instead:
//   1. enumerate every set of controls that fits at its cheapest (latest) start,
//   2. bound each set by its instant score (everything at full strength from month 0):
//      ramping only lowers a score, so a set whose bound misses the bar can never pass,
//   3. schedule each promising set: greedy earliest-fit in several orders, then hill-climb single moves.
// "best" and "winners" are therefore lower bounds. proveBestWithout() is exact: it tries every
// start for every set that could get close.
import { foundationFactor, initiatives, optionCost, passingReadiness, postureOf, registerFor, scoreWeights, shippedFactor, startsFor, phasesFor, upgradeRampShare } from "../js/simulation.js";

export const foundationIds = new Set(initiatives.filter((initiative) => initiative.foundation).map((initiative) => initiative.id));
const byId = Object.fromEntries(initiatives.map((initiative) => [initiative.id, initiative]));
const clamp = (share) => Math.max(0, Math.min(1, share));

export const optionLabel = (scenario, id) => `${postureOf(scenario, id) === "partial" ? "^" : ""}${id}`;
export const planLabel = (scenario, plan) => [...plan].sort((a, b) => a[1] - b[1]).map(([id, start]) => `${optionLabel(scenario, id)}@${start}`).join(" ");
export const toRoadmapObject = (plan) => ({ activated: [...plan.keys()], starts: Object.fromEntries(plan) });

// A fast scorer equivalent to scoreRoadmap(...).readiness (unrounded), for search. The tests check the two agree.
export function searchContext(scenario) {
  const months = scenario.months;
  const starts = startsFor(scenario);
  const phases = phasesFor(scenario);
  const threats = registerFor(scenario).map((row) => ({ category: row.incident.coverageNeeded, inherent: row.inherent }));
  const inherent = threats.reduce((sum, threat) => sum + threat.inherent, 0);
  const options = initiatives.filter((initiative) => postureOf(scenario, initiative.id) !== "in").map((initiative) => initiative.id);
  const cost = Object.fromEntries(options.map((id) => [id, Object.fromEntries(starts.map((start) => [start, optionCost(scenario, id, start)]))]));
  return { scenario, months, starts, phases, threats, inherent, options, cost };
}

export function fits(ctx, plan) {
  let budget = 0;
  const weeks = ctx.phases.map(() => 0);
  for (const [id, start] of plan) {
    const cost = ctx.cost[id][start];
    budget += cost.budget;
    cost.phaseWeeks.forEach((value, index) => { weeks[index] += value; });
  }
  return budget <= ctx.scenario.budget && weeks.every((value, index) => value <= ctx.phases[index].capacity + 1e-9);
}

function levelAt(ctx, plan, id, month) {
  const posture = postureOf(ctx.scenario, id);
  if (posture === "in") return 1;
  const start = plan.get(id);
  const elapsed = month + 0.5 - (start ?? 0);
  const ramp = byId[id].rampMonths;
  if (posture === "partial") return start === undefined ? 0.5 : 0.5 + 0.5 * clamp(elapsed / (ramp * upgradeRampShare));
  return start === undefined ? 0 : clamp(elapsed / ramp);
}

function residual(ctx, levels) {
  const running = initiatives.filter((initiative) => levels[initiative.id]).map((initiative) => ({ initiative, strength: levels[initiative.id] * foundationFactor(initiative, levels) }));
  return ctx.threats.map((threat) => running.reduce((left, { initiative, strength }) => {
    const rated = initiative.mitigates[threat.category] ?? initiative.containsAll ?? 0;
    return rated ? left * (1 - rated * strength * shippedFactor(ctx.scenario, initiative, threat.category)) : left;
  }, 1));
}

export function score(ctx, plan) {
  const during = ctx.threats.map(() => 0);
  let last = null;
  for (let month = 0; month < ctx.months; month += 1) {
    const levels = {};
    for (const initiative of initiatives) {
      const level = levelAt(ctx, plan, initiative.id, month);
      if (level > 0) levels[initiative.id] = level;
    }
    last = residual(ctx, levels);
    last.forEach((left, index) => { during[index] += left / ctx.months; });
  }
  const target = ctx.threats.reduce((sum, threat, index) => sum + threat.inherent * (scoreWeights.during * during[index] + scoreWeights.handover * last[index]), 0);
  return 100 * (1 - target / ctx.inherent);
}

// Everything at full strength from month 0: an upper bound on any schedule of the same set.
export function instantScore(ctx, ids) {
  const levels = {};
  for (const [id, item] of Object.entries(ctx.scenario.posture)) levels[id] = item.state === "in" ? 1 : 0.5;
  for (const id of ids) levels[id] = 1;
  const left = residual(ctx, levels);
  return 100 * (1 - ctx.threats.reduce((sum, threat, index) => sum + threat.inherent * left[index], 0) / ctx.inherent);
}

// Every set that fits at its cheapest start, in dollars and in total engineer-weeks.
export function candidateSets(ctx) {
  const latest = ctx.starts[ctx.starts.length - 1];
  const cheapest = ctx.options.map((id) => ({ id, budget: ctx.cost[id][latest].budget, weeks: ctx.cost[id][latest].weeks }));
  const sets = [];
  const visit = (index, picked, budget, weeks) => {
    if (index === cheapest.length) { sets.push(picked); return; }
    visit(index + 1, picked, budget, weeks);
    const option = cheapest[index];
    if (budget + option.budget <= ctx.scenario.budget && weeks + option.weeks <= ctx.scenario.engineerWeeks + 1e-9) visit(index + 1, [...picked, option.id], budget + option.budget, weeks + option.weeks);
  };
  visit(0, [], 0, 0);
  return sets;
}

function greedy(ctx, order) {
  const plan = new Map();
  for (const id of order) {
    const start = ctx.starts.find((candidate) => fits(ctx, new Map([...plan, [id, candidate]])));
    if (start === undefined) return null;
    plan.set(id, start);
  }
  return plan;
}

// A good schedule for this set of controls (not guaranteed optimal).
export function schedule(ctx, ids) {
  const whole = instantScore(ctx, ids);
  const value = Object.fromEntries(ids.map((id) => [id, whole - instantScore(ctx, ids.filter((other) => other !== id))]));
  const rank = (id) => (foundationIds.has(id) ? 2 : id === "detection" ? 1 : 0);
  const orders = [
    [...ids].sort((a, b) => rank(b) - rank(a) || value[b] - value[a]),
    [...ids].sort((a, b) => value[b] - value[a]),
    [...ids].sort((a, b) => byId[b].rampMonths - byId[a].rampMonths || value[b] - value[a]),
    [...ids].sort((a, b) => ctx.cost[a][0].phaseWeeks[0] - ctx.cost[b][0].phaseWeeks[0])
  ];
  let best = null;
  for (const order of orders) {
    const plan = greedy(ctx, order);
    if (!plan) continue;
    const result = score(ctx, plan);
    if (!best || result > best.score) best = { plan, score: result };
  }
  if (!best) return null;
  for (let improved = true; improved;) {
    improved = false;
    for (const id of ids) {
      for (const start of ctx.starts) {
        if (best.plan.get(id) === start) continue;
        const plan = new Map(best.plan).set(id, start);
        if (!fits(ctx, plan)) continue;
        const result = score(ctx, plan);
        if (result > best.score + 1e-9) { best = { plan, score: result }; improved = true; }
      }
    }
  }
  return best;
}

// The exact best score over every schedule of every set the filter accepts whose instant score reaches `floor`.
export function proveBest(ctx, accept, floor) {
  const sets = candidateSets(ctx).filter((ids) => accept(ids) && instantScore(ctx, ids) >= floor);
  let best = { score: -Infinity, plan: null };
  let schedules = 0;
  for (const ids of sets) {
    const plan = new Map();
    const visit = (index) => {
      if (index === ids.length) {
        schedules += 1;
        const result = score(ctx, plan);
        if (result > best.score) best = { score: result, plan: new Map(plan) };
        return;
      }
      for (const start of ctx.starts) {
        plan.set(ids[index], start);
        if (fits(ctx, plan)) visit(index + 1);
        plan.delete(ids[index]);
      }
    };
    visit(0);
  }
  return { ...best, sets: sets.length, schedules };
}

// No roadmap that skips every foundation can reach the bar: the exact best over every set that could get within half a point.
export const proveBestWithoutFoundations = (ctx) => proveBest(ctx, (ids) => !ids.some((id) => foundationIds.has(id)), passingReadiness - 0.5);

export function difficultyOf(scenario) {
  const ctx = searchContext(scenario);
  const sets = candidateSets(ctx);
  const scheduled = sets
    .map((ids) => ({ ids, bound: instantScore(ctx, ids) }))
    .filter((item) => item.bound >= passingReadiness - 0.5)
    .map((item) => ({ ...item, ...schedule(ctx, item.ids) }))
    .filter((item) => item.plan)
    .sort((a, b) => b.score - a.score);
  const winners = scheduled.filter((item) => Math.round(item.score) >= passingReadiness);
  return { ctx, sets: sets.length, scheduled, winners, best: scheduled[0] };
}
