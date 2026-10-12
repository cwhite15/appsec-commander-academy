// Brute-forces every affordable roadmap for each company and reports difficulty.
// Usage: node scripts/calibrate.mjs [topN]
import { formatImpact, initiatives, passingReadiness, runSimulation, scenarios, totals } from "../js/simulation.js";

const topN = Number(process.argv[2] || 4);
const ids = initiatives.map((initiative) => initiative.id);
const subsets = ids.reduce((all, id) => all.concat(all.map((set) => [...set, id])), [[]]);

for (const scenario of scenarios) {
  const affordable = subsets.filter((set) => {
    const spent = totals(scenario, set);
    return spent.budget <= scenario.budget && spent.weeks <= scenario.engineerWeeks;
  });
  const scored = affordable
    .map((set) => ({ set, result: runSimulation(scenario, set), spent: totals(scenario, set) }))
    .sort((a, b) => b.result.readiness - a.result.readiness || a.set.length - b.set.length);
  const passing = scored.filter((item) => item.result.passed).length;
  console.log(`${scenario.name}: ${passing}/${affordable.length} affordable roadmaps pass at ${passingReadiness}% (${((100 * passing) / affordable.length).toFixed(1)}%), best ${scored[0].result.readiness}%`);
  for (const { set, result, spent } of scored.slice(0, topN)) {
    console.log(`  ${String(result.readiness).padStart(3)}%  ${set.join(" + ").padEnd(42)} loss ${formatImpact(result.financialImpact).padEnd(6)} cost $${spent.budget}K / ${spent.weeks} EW  [${result.results.map((item) => item.outcome[0]).join("")}]`);
  }
}
