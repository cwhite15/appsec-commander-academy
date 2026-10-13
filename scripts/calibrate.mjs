// Brute-forces every affordable roadmap for each company and reports difficulty.
// Usage: node scripts/calibrate.mjs [topN]
// "^id" marks an upgrade of a partial control. Full-budget roadmaps are those where nothing else fits.
import { formatImpact, incidentRun, passingReadiness, scenarios, scoreRoadmap } from "../js/simulation.js";
import { difficultyOf, optionLabel } from "./roadmaps.mjs";

const topN = Number(process.argv[2] || 4);
const pct = (share) => `${(100 * share).toFixed(1)}%`;

for (const scenario of scenarios) {
  const { roadmaps, winners, best, bestWithoutFoundations, fullCount, fullPassShare, options } = difficultyOf(scenario);
  const dayOne = scoreRoadmap(scenario, []);
  console.log(`${scenario.name}: day one ${dayOne.dayOne}% (inherent ${formatImpact(dayOne.loss.inherent)}, current ${formatImpact(dayOne.loss.current)})  best ${best.readiness}%  best without foundations ${bestWithoutFoundations.readiness}%  full-budget pass ${pct(fullPassShare)} of ${fullCount}  winners ${winners.length} of ${roadmaps.length} affordable at ${passingReadiness}%`);
  console.log(`   run (biggest threats): ${incidentRun(scenario, "inherent").map((incident) => incident.id).join(", ")}`);
  console.log(`   run (biggest gaps today): ${incidentRun(scenario, "current").map((incident) => incident.id).join(", ")}`);
  for (const roadmap of roadmaps.slice(0, topN)) console.log(`   ${roadmap.readiness}% ${roadmap.picked.map(optionLabel).join(" + ")}  $${roadmap.budget}K / ${roadmap.weeks} EW`);
  const frequency = options
    .map((option) => [optionLabel(option), winners.filter((roadmap) => roadmap.ids.includes(option.id)).length])
    .sort((a, b) => b[1] - a[1]);
  console.log(`   in winners: ${frequency.map(([label, count]) => `${label} ${winners.length ? Math.round((100 * count) / winners.length) : 0}%`).join(", ")}`);
}
