// D (time to value) prototype, built on the C model in js/simulation.js. Kept as the record of how the
// scoring options were compared; the shipped implementation and search are js/simulation.js and scripts/roadmaps.mjs.
// Each funded control gets a start phase; it ramps linearly to full strength over its rampMonths.
// Expected loss is spread evenly over the timeline's months, and each month is mitigated by
// whatever has ramped up by then. Capacity is engineer-weeks per phase; dollars stay a total.
//
// Exhaustive search over phases is out of reach (OrbitPay alone is 3^18 plans), so this:
//   1. enumerates every subset of controls that could fit at its cheapest (latest) start,
//   2. keeps subsets whose instant, C-style score could still clear the bar (an upper bound:
//      ramping only lowers a score),
//   3. schedules each one: greedy earliest-fit in several orders, then hill-climbs single moves.
// So "winners" and "best" are lower bounds on what a perfect scheduler would find.
//
// Env: PHASES=half (two choices: now or halfway), SCORE=window|exit|blend:W (default window), BAR (default 55), SHIPPED=on|off,
//      UPRAMP (share of ramp an upgrade takes, default 0.5), ONLY=<company>, TOP=<n>
import { initiatives, penalties, postureOf, registerFor, scenarios } from "../../../js/simulation.js";
import { difficultyOf } from "../../../scripts/roadmaps.mjs";

const SCORE = process.env.SCORE || "window";
const BAR = Number(process.env.BAR || 55);
const SHIPPED = process.env.SHIPPED !== "off";
const UPRAMP = Number(process.env.UPRAMP || 0.5);
const TOP = Number(process.env.TOP || 3);

// Share of each company's in-window exposure that sits in code written during the window.
// Controls that only help new code (threat modeling, secure defaults) are scaled by it.
// Design flaws are exempt: the logic-flaw card is, by definition, a new feature.
const newCodeShare = { orbitpay: 0.6, medisecure: 0.5, retailrush: 0.7 };

const phaseStarts = [0, 3, 6, 12];
const phaseLabel = new Proxy({ 0: "now" }, { get: (labels, start) => labels[start] ?? `m${start}` });
const clamp = (x) => Math.max(0, Math.min(1, x));
const byId = Object.fromEntries(initiatives.map((initiative) => [initiative.id, initiative]));
const foundationIds = new Set(initiatives.filter((initiative) => initiative.foundation).map((initiative) => initiative.id));

function context(scenario) {
  const M = scenario.months;
  const starts = process.env.PHASES === "half" ? [0, M / 2] : phaseStarts.filter((start) => start < M);
  const bounds = [...starts, M];
  const phases = starts.map((start, index) => ({ start, end: bounds[index + 1] }));
  const scale = scenario.headcount / 100;
  const perMonth = scenario.engineerWeeks / M;
  const capacity = phases.map((phase) => perMonth * (phase.end - phase.start));
  const threats = registerFor(scenario).map((row) => ({ category: row.incident.coverageNeeded, monthly: row.inherent / M, inherent: row.inherent }));
  const inherent = threats.reduce((sum, threat) => sum + threat.inherent, 0);
  const options = initiatives.filter((initiative) => postureOf(scenario, initiative.id) !== "in").map((initiative) => initiative.id);
  return { scenario, M, starts, phases, scale, capacity, threats, inherent, options, share: SHIPPED ? newCodeShare[scenario.id] : 1 };
}

// Dollars and per-phase engineer-weeks for funding (or upgrading) a control from `start`.
function costAt(ctx, id, start) {
  const initiative = byId[id];
  const half = postureOf(ctx.scenario, id) === "partial" ? 0.5 : 1;
  const dollars = half * (initiative.setupK + initiative.monthlyK * (ctx.M - start) * ctx.scale);
  const weeks = ctx.phases.map((phase) => {
    const months = Math.max(0, phase.end - Math.max(phase.start, start));
    return half * ((phase.start === start ? initiative.setupWeeks * ctx.scale : 0) + initiative.monthlyWeeks * months * ctx.scale);
  });
  return { dollars, weeks };
}

function feasible(ctx, plan) {
  let dollars = 0;
  const weeks = ctx.phases.map(() => 0);
  for (const [id, start] of plan) {
    const cost = costAt(ctx, id, start);
    dollars += cost.dollars;
    cost.weeks.forEach((value, index) => { weeks[index] += value; });
  }
  return dollars <= ctx.scenario.budget + 1e-9 && weeks.every((value, index) => value <= ctx.capacity[index] + 1e-9);
}

// Strength of a control in month m (sampled mid-month).
function levelAt(ctx, id, plan, m) {
  const posture = postureOf(ctx.scenario, id);
  const ramp = byId[id].rampMonths;
  const t = m + 0.5;
  if (posture === "in") return 1;
  const start = plan.get(id);
  if (posture === "partial") return start === undefined ? 0.5 : 0.5 + 0.5 * clamp((t - start) / (ramp * UPRAMP));
  return start === undefined ? 0 : clamp((t - start) / ramp);
}

// Monthly residual expected loss, summed (window) and the last month's run rate (exit).
function evaluate(ctx, plan) {
  let window = 0;
  let exit = 0;
  for (let m = 0; m < ctx.M; m += 1) {
    const levels = {};
    for (const initiative of initiatives) {
      const level = levelAt(ctx, initiative.id, plan, m);
      if (level > 0) levels[initiative.id] = level;
    }
    const running = Object.keys(levels).map((id) => {
      const initiative = byId[id];
      const factor = initiative.needs.reduce((f, need) => f * (1 - penalties[need] * (1 - (levels[need] || 0))), 1);
      return { initiative, strength: levels[id] * factor };
    });
    let month = 0;
    for (const threat of ctx.threats) {
      let left = 1;
      for (const { initiative, strength } of running) {
        const rated = initiative.mitigates[threat.category] ?? initiative.containsAll ?? 0;
        if (!rated) continue;
        const shipped = initiative.helpsShipped === false && threat.category !== "design_flaw" ? ctx.share : 1;
        left *= 1 - rated * strength * shipped;
      }
      month += threat.monthly * left;
    }
    window += month;
    if (m === ctx.M - 1) exit = month * ctx.M;
  }
  const windowScore = 100 * (1 - window / ctx.inherent);
  const exitScore = 100 * (1 - exit / ctx.inherent);
  if (SCORE === "exit") return exitScore;
  if (SCORE.startsWith("blend")) {
    const w = Number(SCORE.split(":")[1] || 0.5);
    return w * windowScore + (1 - w) * exitScore;
  }
  return windowScore;
}

// Instant, full-strength score (the C model): an upper bound on any schedule of the same set.
function instant(ctx, ids) {
  const levels = {};
  for (const [id, state] of Object.entries(ctx.scenario.posture)) levels[id] = state.state === "in" ? 1 : 0.5;
  for (const id of ids) levels[id] = 1;
  let residual = 0;
  for (const threat of ctx.threats) {
    let left = 1;
    for (const id of Object.keys(levels)) {
      const initiative = byId[id];
      const rated = initiative.mitigates[threat.category] ?? initiative.containsAll ?? 0;
      if (!rated) continue;
      const factor = initiative.needs.reduce((f, need) => f * (1 - penalties[need] * (1 - (levels[need] || 0))), 1);
      left *= 1 - rated * levels[id] * factor;
    }
    residual += threat.inherent * left;
  }
  return 100 * (1 - residual / ctx.inherent);
}

// Greedy earliest-fit: place each control in the earliest phase that still fits.
function greedy(ctx, order) {
  const plan = new Map();
  for (const id of order) {
    const start = ctx.starts.find((candidate) => feasible(ctx, new Map([...plan, [id, candidate]])));
    if (start === undefined) return null;
    plan.set(id, start);
  }
  return plan;
}

function schedule(ctx, ids) {
  const value = Object.fromEntries(ids.map((id) => [id, instant(ctx, ids) - instant(ctx, ids.filter((other) => other !== id))]));
  const rank = (id) => (foundationIds.has(id) ? 2 : id === "detection" ? 1 : 0);
  const orders = [
    [...ids].sort((a, b) => rank(b) - rank(a) || value[b] - value[a]),
    [...ids].sort((a, b) => value[b] - value[a]),
    [...ids].sort((a, b) => byId[a].rampMonths - byId[b].rampMonths || value[b] - value[a]).reverse(),
    [...ids].sort((a, b) => costAt(ctx, a, 0).weeks[0] - costAt(ctx, b, 0).weeks[0])
  ];
  let best = null;
  for (const order of orders) {
    const plan = greedy(ctx, order);
    if (!plan) continue;
    const score = evaluate(ctx, plan);
    if (!best || score > best.score) best = { plan, score };
  }
  if (!best) return null;
  for (let improved = true; improved;) {
    improved = false;
    for (const id of ids) {
      for (const start of ctx.starts) {
        if (best.plan.get(id) === start) continue;
        const plan = new Map(best.plan).set(id, start);
        if (!feasible(ctx, plan)) continue;
        const score = evaluate(ctx, plan);
        if (score > best.score + 1e-9) { best = { plan, score }; improved = true; }
      }
    }
  }
  return best;
}

// Every subset that fits at its cheapest start (latest phase) in dollars and total weeks.
function subsets(ctx) {
  const latest = ctx.starts[ctx.starts.length - 1];
  const cheapest = ctx.options.map((id) => {
    const cost = costAt(ctx, id, latest);
    return { id, dollars: cost.dollars, weeks: cost.weeks.reduce((a, b) => a + b, 0) };
  });
  const out = [];
  const visit = (index, picked, dollars, weeks) => {
    if (index === cheapest.length) { out.push(picked); return; }
    visit(index + 1, picked, dollars, weeks);
    const option = cheapest[index];
    if (dollars + option.dollars <= ctx.scenario.budget && weeks + option.weeks <= ctx.scenario.engineerWeeks) visit(index + 1, [...picked, option.id], dollars + option.dollars, weeks + option.weeks);
  };
  visit(0, [], 0, 0);
  return out;
}

const label = (ctx, id) => `${postureOf(ctx.scenario, id) === "partial" ? "^" : ""}${id}`;
const show = (ctx, plan) => [...plan].sort((a, b) => a[1] - b[1]).map(([id, start]) => `${label(ctx, id)}@${phaseLabel[start]}`).join(" ");

for (const scenario of scenarios) {
  if (process.env.ONLY && process.env.ONLY !== scenario.id) continue;
  const ctx = context(scenario);
  const all = subsets(ctx);
  const dayOne = evaluate(ctx, new Map());
  const candidates = all.map((ids) => ({ ids, bound: instant(ctx, ids) })).filter((item) => item.bound >= BAR - 0.5 || !item.ids.some((id) => foundationIds.has(id)));
  const scheduled = candidates
    .filter((item) => item.bound >= BAR - 0.5 || item.bound >= 50)
    .map((item) => ({ ...item, best: schedule(ctx, item.ids) }))
    .filter((item) => item.best);
  scheduled.sort((a, b) => b.best.score - a.best.score);
  const winners = scheduled.filter((item) => Math.round(item.best.score) >= BAR);
  const noFoundation = scheduled.find((item) => !item.ids.some((id) => foundationIds.has(id)));
  const freq = ctx.options.map((id) => [label(ctx, id), winners.filter((item) => item.ids.includes(id)).length]).sort((a, b) => b[1] - a[1]);
  console.log(`${scenario.name} (${ctx.M} mo, phases ${ctx.starts.join("/")}, capacity ${ctx.capacity.map((c) => c.toFixed(1)).join(" / ")} EW): day one ${dayOne.toFixed(1)}%  best ${scheduled[0]?.best.score.toFixed(1)}% (instant ${scheduled[0]?.bound.toFixed(1)}%)  best without foundations ${noFoundation ? noFoundation.best.score.toFixed(1) : "n/a"}%  winners ≥${BAR}: ${winners.length} of ${all.length} subsets`);
  if (noFoundation) console.log(`   best without foundations: ${noFoundation.best.score.toFixed(1)}% ${show(ctx, noFoundation.best.plan)}`);
  for (const item of scheduled.slice(0, TOP)) console.log(`   ${item.best.score.toFixed(1)}% (instant ${item.bound.toFixed(1)})  ${show(ctx, item.best.plan)}`);
  if (winners.length) console.log(`   in winners: ${freq.map(([id, count]) => `${id} ${Math.round((100 * count) / winners.length)}%`).join(", ")}`);
  // How much does sequencing matter? The best set from scripts/roadmaps.mjs, scheduled well vs. foundations last.
  const cBest = difficultyOf(scenario).best.ids;
  const good = schedule(ctx, cBest);
  // A plausible bad sequence: tools first at the earliest phase that fits, then foundations (and detection) as late as they fit.
  const toolsFirst = (ids) => {
    const plan = new Map();
    const deferred = (id) => foundationIds.has(id) || id === "detection";
    for (const id of ids.filter((id) => !deferred(id))) {
      const start = ctx.starts.find((candidate) => feasible(ctx, new Map([...plan, [id, candidate]])));
      if (start === undefined) return null;
      plan.set(id, start);
    }
    for (const id of ids.filter(deferred)) {
      const start = [...ctx.starts].reverse().find((candidate) => feasible(ctx, new Map([...plan, [id, candidate]])));
      if (start === undefined) return null;
      plan.set(id, start);
    }
    return plan;
  };
  const describe = (plan) => (plan ? `${evaluate(ctx, plan).toFixed(1)}% ${show(ctx, plan)}` : "infeasible");
  const allNow = new Map(cBest.map((id) => [id, 0]));
  console.log(`   search's best set (${instant(ctx, cBest).toFixed(1)}% instant): best schedule ${good ? `${good.score.toFixed(1)}% ${show(ctx, good.plan)}` : "infeasible"}`);
  console.log(`      tools first, foundations late: ${describe(toolsFirst(cBest))}; everything now: ${feasible(ctx, allNow) ? evaluate(ctx, allNow).toFixed(1) + "%" : "over capacity"}`);
  if (scheduled[0]) console.log(`      best set, tools first, foundations late: ${describe(toolsFirst(scheduled[0].ids))}`);
}

// PROVE=<threshold>: exhaustively schedule every no-foundation subset whose instant score reaches the
// threshold, and report the true best score without funding a foundation.
if (process.env.PROVE) {
  const threshold = Number(process.env.PROVE);
  for (const scenario of scenarios) {
    if (process.env.ONLY && process.env.ONLY !== scenario.id) continue;
    const ctx = context(scenario);
    const candidates = subsets(ctx).filter((ids) => !ids.some((id) => foundationIds.has(id)) && instant(ctx, ids) >= threshold);
    let best = { score: -1 };
    let plans = 0;
    for (const ids of candidates) {
      const visit = (index, plan) => {
        if (index === ids.length) {
          plans += 1;
          const score = evaluate(ctx, plan);
          if (score > best.score) best = { score, plan: new Map(plan) };
          return;
        }
        for (const start of ctx.starts) {
          plan.set(ids[index], start);
          if (feasible(ctx, plan)) visit(index + 1, plan);
          plan.delete(ids[index]);
        }
      };
      visit(0, new Map());
    }
    console.log(`PROOF ${scenario.name}: ${candidates.length} no-foundation subsets with instant ≥ ${threshold}, ${plans} feasible schedules; true best ${best.score.toFixed(2)}% ${best.plan ? show(ctx, best.plan) : ""}`);
  }
}
