// Searches every company's roadmaps and reports difficulty (takes a few seconds).
// Usage: node scripts/calibrate.mjs [topN]
// "^id" marks an upgrade of a partial control; "@n" is the start month.
import { formatImpact, incidentRun, passingReadiness, scenarios, scoreRoadmap } from "../js/simulation.js";
import { difficultyOf, fits, foundationIds, optionLabel, planLabel, proveBestWithoutFoundations, score } from "./roadmaps.mjs";

const topN = Number(process.argv[2] || 3);

for (const scenario of scenarios) {
  const { ctx, sets, winners, best } = difficultyOf(scenario);
  const dayOne = scoreRoadmap(scenario, []);
  const proof = proveBestWithoutFoundations(ctx);
  console.log(`${scenario.name}: day one ${dayOne.dayOne}% (inherent ${formatImpact(dayOne.loss.inherent)}, current ${formatImpact(dayOne.loss.current)})  best found ${best.score.toFixed(1)}%  winning sets found ${winners.length} of ${sets} at ${passingReadiness}%`);
  console.log(`   proof: without a foundation the best possible is ${proof.score.toFixed(2)}% (${proof.sets} sets, ${proof.schedules} schedules checked) ${planLabel(scenario, proof.plan)}`);
  console.log(`   run (biggest threats): ${incidentRun(scenario, "inherent").map((incident) => incident.id).join(", ")}`);
  console.log(`   run (biggest gaps today): ${incidentRun(scenario, "current").map((incident) => incident.id).join(", ")}`);
  for (const item of winners.slice(0, topN)) console.log(`   ${item.score.toFixed(1)}% (instant ${item.bound.toFixed(1)}) ${planLabel(scenario, item.plan)}`);
  // Sequencing: the best set with tools first and foundations as late as they fit.
  const deferred = (id) => foundationIds.has(id) || id === "detection";
  const plan = new Map();
  for (const id of best.ids.filter((id) => !deferred(id))) plan.set(id, ctx.starts.find((start) => fits(ctx, new Map([...plan, [id, start]]))));
  for (const id of best.ids.filter(deferred)) plan.set(id, [...ctx.starts].reverse().find((start) => fits(ctx, new Map([...plan, [id, start]]))));
  const allNow = new Map(best.ids.map((id) => [id, 0]));
  console.log(`   best set, tools first and foundations late: ${[...plan.values()].includes(undefined) ? "infeasible" : `${score(ctx, plan).toFixed(1)}%`}; everything at month 0: ${fits(ctx, allNow) ? `${score(ctx, allNow).toFixed(1)}%` : "over capacity"}`);
  const frequency = ctx.options.map((id) => [optionLabel(scenario, id), winners.filter((item) => item.ids.includes(id)).length]).sort((a, b) => b[1] - a[1]);
  console.log(`   in winners: ${frequency.map(([label, count]) => `${label} ${winners.length ? Math.round((100 * count) / winners.length) : 0}%`).join(", ")}`);
}
