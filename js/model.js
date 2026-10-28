// Mission Commander path: the whole game model. Pure data and functions, shared by
// the UI (js/app.js), the attack simulation (js/sim/engine.js) and the balance check
// (scripts/check.mjs).
// Every number here is an ILLUSTRATIVE GAME VALUE, not industry data.

export const components = [
  { id: "define", number: "01", title: "Define", line: "Know your why, and know what you have.", detail: "Name your program's top goal: cutting breach risk, earning customer trust, or meeting a compliance mandate. Find every app and API, even forgotten ones. Then agree with Engineering and Product which matter most, and what an attacker would target first." },
  { id: "evaluate", number: "02", title: "Evaluate", line: "Know how your team works, and scale its expertise.", detail: "Find where security work lands today: a gatekeeper, experts on call, or self-service tools and training. Most teams mix all three. Then scale with security champions. Champion programs fail from lack of protected time, not lack of interest." },
  { id: "integrate", number: "03", title: "Integrate", line: "Build security into how code ships, and fix what matters first.", detail: "Threat model new features, put checks in the pipeline engineers already use, and build protections like MFA into the product. Set fix deadlines by what's exposed and has a public exploit, not severity alone. A scanner without a fix process just grows the backlog." },
  { id: "measure", number: "04", title: "Measure", line: "Track what drives action, and prove your defenses work.", detail: "Track coverage and time to fix, not raw finding counts, and commit publicly to improving one or two. Then check your defenses for real: pen tests find flaws scanners miss, and detection helps you see what gets through." }
];

export const resources = {
  company: "OrbitPay",
  blurb: "A 120-person fintech. You have one year, a fixed budget, and a small security team.",
  budgetK: 70,
  fte: [3, 3, 3, 3],
  quarters: ["Q1", "Q2", "Q3", "Q4"]
};

// Cards are either process work ("process": people and decisions) or a tool ("tool").
// A card with `needs` works at full strength only if every card it needs is in place:
// built in the same quarter or earlier, with its own needs in place too (recursively).
// Each need that isn't in place halves the card, and a card below full strength can't
// stop an attack outright. `foundation: true` marks a card that other cards need.
export const initiatives = [
  { id: "why", component: "define", kind: "process", foundation: true, name: "Define your why", costK: 0, fte: 0.5, does: "Name the one goal your program serves, so every choice has a reason.", ref: "BSIMM SM1.1 · SAMM Strategy & Metrics" },
  { id: "threat_assessment", component: "define", kind: "process", foundation: true, name: "Conduct a high-level threat assessment", costK: 0, fte: 0.5, does: "Rank your crown jewels and what an attacker would go after first.", ref: "BSIMM AM1.3 · SAMM Threat Assessment" },
  { id: "inventory", component: "define", kind: "process", foundation: true, name: "Build your application inventory", costK: 0, fte: 1, does: "Find every app and API, even forgotten ones, and rank them by impact.", ref: "BSIMM CMVM2.3 · SAMM Threat Assessment" },
  { id: "partners", component: "define", kind: "process", foundation: true, name: "Meet with key partners", costK: 0, fte: 0.5, does: "Meet Product, Engineering and Risk to learn their goals and friction.", ref: "BSIMM SM2.7 · SAMM Strategy & Metrics" },
  { id: "operating_model", component: "evaluate", kind: "process", foundation: true, name: "Define your operating model", costK: 0, fte: 0.5, does: "Decide who owns security work: gatekeeper, consultants or self-service.", ref: "BSIMM SM1.4 · SAMM Strategy & Metrics" },
  { id: "champions", component: "evaluate", kind: "process", foundation: true, name: "Design a security champions program", costK: 5, fte: 1, needs: ["partners"], does: "A trained champion in each team, with time their manager protects.", ref: "BSIMM SM2.3 · SAMM Education & Guidance" },
  { id: "training", component: "evaluate", kind: "tool", name: "Secure coding training", costK: 20, fte: 0.5, does: "Teach developers to write and fix code safely.", ref: "BSIMM T1.7 · SAMM Education & Guidance" },
  { id: "pipeline", component: "integrate", kind: "process", foundation: true, name: "Map your code delivery pipeline", costK: 0, fte: 0.5, does: "Learn how code gets from a laptop to production, step by step.", ref: "BSIMM SM3.4 · SAMM Secure Build" },
  { id: "fix_slas", component: "integrate", kind: "process", foundation: true, name: "Define your remediation process & SLAs", costK: 0, fte: 1, needs: ["operating_model"], does: "Every finding gets an owner, and the riskiest get a fix deadline.", ref: "BSIMM CMVM1.3 · SAMM Defect Management" },
  { id: "threat_model", component: "integrate", kind: "process", name: "Shift left with threat modeling", costK: 5, fte: 0.5, needs: ["champions", "threat_assessment"], does: "Ask how a new feature could be abused before it's built.", ref: "BSIMM AA1.2 · SAMM Threat Assessment" },
  { id: "sca", component: "integrate", kind: "tool", name: "Dependency scanning (SCA)", costK: 25, fte: 0.5, needs: ["fix_slas", "pipeline"], does: "Flag vulnerable open-source packages in every build.", ref: "BSIMM SR1.5 · SAMM Secure Build" },
  { id: "sast", component: "integrate", kind: "tool", name: "Code scanning (SAST)", costK: 20, fte: 1, needs: ["champions", "pipeline"], does: "Catch injection bugs in every pull request.", ref: "BSIMM CR1.4 · SAMM Security Testing" },
  { id: "secrets", component: "integrate", kind: "tool", name: "Secrets vault & push protection", costK: 20, fte: 1, needs: ["inventory"], does: "Block keys from reaching a repo, and rotate the rest.", ref: "BSIMM SE3.9 · SAMM Secure Deployment" },
  { id: "mfa", component: "integrate", kind: "tool", name: "MFA & login hardening", costK: 15, fte: 1, needs: ["inventory"], does: "MFA and rate limits on every customer login.", ref: "BSIMM SFD1.1 · SAMM Security Requirements" },
  { id: "kpis", component: "measure", kind: "process", foundation: true, name: "Define your KPIs", costK: 0, fte: 0.5, needs: ["why"], does: "Pick a few metrics that show progress toward your why.", ref: "BSIMM SM3.3 · SAMM Strategy & Metrics" },
  { id: "metrics_review", component: "measure", kind: "process", name: "Review metrics with partners", costK: 0, fte: 0.5, needs: ["kpis", "partners"], does: "Review metrics with partners and adopt one they care about.", ref: "BSIMM SM2.1 · SAMM Strategy & Metrics" },
  { id: "pentest", component: "measure", kind: "tool", name: "Pen test & bug bounty", costK: 25, fte: 0.5, needs: ["fix_slas", "threat_assessment"], does: "Experts find the logic flaws scanners miss.", ref: "BSIMM PT1.1 · SAMM Security Testing" },
  { id: "detection", component: "measure", kind: "tool", name: "Detection & response", costK: 30, fte: 0.5, needs: ["kpis"], does: "Alerts someone watches, and a tested response plan.", ref: "BSIMM CMVM1.1 · SAMM Incident Management" }
];

// Six attacks, all landing at the end of the year. `stops` is the control that can
// prevent it outright; `cuts` lists how much each control reduces the risk.
// `weight` is how much the attack counts toward the program score (sums to 1).
// Likelihood order loosely follows DBIR 2026 (exploited vulnerabilities are the top way
// in; credential abuse is common). Weights and cuts are illustrative game values.
// kpis and metrics_review cut every attack a little: trusted numbers mean faster fixes.
export const scenarios = [
  { id: "dep", title: "Log4j-style dependency exploited", story: "Attackers exploit a known CVE in an open-source library that had a patch for months.", stops: "sca", cuts: { sca: 0.9, fix_slas: 0.3, detection: 0.35, kpis: 0.25, metrics_review: 0.15 }, weight: 0.2, likelihood: "Likely" },
  { id: "php", title: "PHP2Shell hits a forgotten server", story: "Inspired by PHP2Shell (October 2026): a critical flaw in PHP itself is attacked within days of the patch. You patch every server on your list, but an old PHP microsite nobody listed gets popped.", stops: "inventory", cuts: { inventory: 0.9, fix_slas: 0.5, detection: 0.35, kpis: 0.25, metrics_review: 0.15 }, weight: 0.22, likelihood: "Likely" },
  { id: "cred", title: "Credential stuffing", story: "Leaked passwords from another site are tried against every customer login.", stops: "mfa", cuts: { mfa: 0.9, detection: 0.35, kpis: 0.25, metrics_review: 0.15 }, weight: 0.18, likelihood: "Likely" },
  { id: "sqli", title: "SQL injection in checkout", story: "A new checkout endpoint builds a query from user input.", stops: "sast", cuts: { sast: 0.85, pentest: 0.5, training: 0.4, threat_model: 0.2, champions: 0.2, detection: 0.3, kpis: 0.25, metrics_review: 0.15 }, weight: 0.16, likelihood: "Possible" },
  { id: "secret", title: "Cloud key pushed to a public repo", story: "A developer pushes a cloud access key to GitHub. Bots find it in minutes.", stops: "secrets", cuts: { secrets: 0.95, training: 0.3, detection: 0.35, kpis: 0.25, metrics_review: 0.15 }, weight: 0.12, likelihood: "Less likely" },
  { id: "logic", title: "Refund logic abused", story: "Replaying one request lets a user claim the same refund over and over.", stops: "threat_model", cuts: { threat_model: 0.7, pentest: 0.6, training: 0.2, champions: 0.2, detection: 0.3, kpis: 0.25, metrics_review: 0.15 }, weight: 0.12, likelihood: "Less likely" }
];

// The program wins when the weighted risk reduction reaches this bar.
export const WIN_BAR = 0.8;

export const byId = Object.fromEntries(initiatives.map((item) => [item.id, item]));

// plan: { initiativeId: quarterIndex (0-3) }. Every attack lands at the end of the year,
// so anything built is live; quarters matter for FTE caps and for sequencing.
export function liveBy(plan, id) {
  return plan[id] !== undefined;
}

// Is card `id` in place for a card built in `quarter`? It must be built in that quarter or
// earlier, and each of its own needs must be in place for it (the same rule, recursively).
// With `quarter` undefined, only "built, with its own needs in place" is checked.
export function inPlace(plan, id, quarter) {
  const built = plan[id];
  if (built === undefined || (quarter !== undefined && built > quarter)) return false;
  return (byId[id].needs || []).every((need) => inPlace(plan, need, built));
}

// The direct needs of `id` that aren't in place for it.
export function missingFoundations(plan, id) {
  const quarter = plan[id];
  return (byId[id].needs || []).filter((need) => !inPlace(plan, need, quarter));
}

export function strength(plan, id) {
  if (!liveBy(plan, id)) return 0;
  return Math.pow(0.5, missingFoundations(plan, id).length);
}

export function spend(plan) {
  const used = { budgetK: 0, fte: [0, 0, 0, 0] };
  for (const [id, quarter] of Object.entries(plan)) {
    used.budgetK += byId[id].costK;
    used.fte[quarter] += byId[id].fte;
  }
  return used;
}

export function fits(plan, id, quarter) {
  const trial = { ...plan, [id]: quarter };
  const used = spend(trial);
  return used.budgetK <= resources.budgetK && used.fte[quarter] <= resources.fte[quarter] + 1e-9;
}

export function judge(plan, scenario) {
  const contributions = Object.entries(scenario.cuts)
    .map(([id, cut]) => ({ id, cut: cut * strength(plan, id), full: cut }))
    .filter((entry) => entry.cut > 0);
  const stopperFull = strength(plan, scenario.stops) === 1;
  const reduction = stopperFull ? 1 : 1 - contributions.reduce((left, entry) => left * (1 - entry.cut), 1);
  const outcome = stopperFull ? "prevented" : reduction > 1e-9 ? "reduced" : "unprotected";
  const stopperLive = liveBy(plan, scenario.stops);
  const stopperMissing = stopperLive ? missingFoundations(plan, scenario.stops) : [];
  return { scenario, outcome, reduction, contributions, stopperLive, stopperMissing };
}

export function runAll(plan) {
  const results = scenarios.map((scenario) => judge(plan, scenario));
  const score = results.reduce((sum, result) => sum + result.scenario.weight * result.reduction, 0);
  return { results, score, won: score >= WIN_BAR - 1e-9 };
}
