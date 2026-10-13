// Enumerates every affordable roadmap for a company, scored with the real model.
// Shared by scripts/calibrate.mjs and the difficulty tests.
import { foundationFactor, initiatives, optionCost, passingReadiness, postureOf, registerFor } from "../js/simulation.js";

export const foundationIds = new Set(initiatives.filter((initiative) => initiative.foundation).map((initiative) => initiative.id));

// What the attendee can choose at this company: every control that isn't already in place.
export function optionsFor(scenario) {
  return initiatives
    .filter((initiative) => postureOf(scenario, initiative.id) !== "in")
    .map((initiative) => ({ id: initiative.id, upgrade: postureOf(scenario, initiative.id) === "partial", ...optionCost(scenario, initiative.id) }));
}

export const optionLabel = (option) => (option.upgrade ? `^${option.id}` : option.id);

// A fast scorer equivalent to scoreRoadmap().readiness, for brute force.
function scorer(scenario) {
  const rows = registerFor(scenario).map((row) => ({ category: row.incident.coverageNeeded, inherent: row.inherent }));
  const total = rows.reduce((sum, row) => sum + row.inherent, 0);
  return (levels) => {
    const running = initiatives.filter((initiative) => levels[initiative.id]).map((initiative) => ({ initiative, strength: levels[initiative.id] * foundationFactor(initiative, levels) }));
    const residual = rows.reduce((sum, row) => sum + row.inherent * running.reduce((left, { initiative, strength }) => left * (1 - (initiative.mitigates[row.category] ?? initiative.containsAll ?? 0) * strength), 1), 0);
    return Math.max(0, Math.round(100 * (1 - residual / total)));
  };
}

// Every affordable roadmap: { ids, picked, readiness, budget, weeks, full, foundation }.
// full: nothing else fits. foundation: funds or upgrades at least one foundation.
export function enumerateRoadmaps(scenario) {
  const options = optionsFor(scenario);
  const score = scorer(scenario);
  const start = {};
  for (const [id, item] of Object.entries(scenario.posture)) start[id] = item.state === "in" ? 1 : 0.5;
  const roadmaps = [];
  const visit = (index, picked, budget, weeks) => {
    if (index === options.length) {
      const full = options.every((option) => picked.includes(option) || budget + option.budget > scenario.budget || weeks + option.weeks > scenario.engineerWeeks);
      const levels = { ...start };
      for (const option of picked) levels[option.id] = 1;
      roadmaps.push({ ids: picked.map((option) => option.id), picked, readiness: score(levels), budget, weeks, full, foundation: picked.some((option) => foundationIds.has(option.id)) });
      return;
    }
    const option = options[index];
    visit(index + 1, picked, budget, weeks);
    if (budget + option.budget <= scenario.budget && weeks + option.weeks <= scenario.engineerWeeks) visit(index + 1, [...picked, option], budget + option.budget, weeks + option.weeks);
  };
  visit(0, [], 0, 0);
  return roadmaps.sort((a, b) => b.readiness - a.readiness || a.weeks - b.weeks || a.budget - b.budget);
}

export function difficultyOf(scenario) {
  const roadmaps = enumerateRoadmaps(scenario);
  const winners = roadmaps.filter((roadmap) => roadmap.readiness >= passingReadiness);
  const full = roadmaps.filter((roadmap) => roadmap.full);
  return {
    roadmaps,
    winners,
    best: roadmaps[0],
    bestWithoutFoundations: roadmaps.find((roadmap) => !roadmap.foundation),
    fullCount: full.length,
    fullPassShare: full.filter((roadmap) => roadmap.readiness >= passingReadiness).length / full.length,
    options: optionsFor(scenario)
  };
}
