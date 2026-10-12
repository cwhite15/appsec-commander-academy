// Mission 02 content. Scenarios, initiatives, and incidents are carried over from
// the Base44 "Roadmap Simulator" page. Unlike the original, each scenario faces a
// fixed incident deck drawn from its threat profile, so reading the intel and
// investing against it is what wins the mission, not a lucky shuffle.
//
// Each scenario is a separate company played on its own; nothing carries between them.
// Within a scenario, an initiative costs a one-time setup plus a monthly run cost over
// that company's timeline, scaled by its size (headcount / 100), so a longer or larger
// engagement pays proportionally more. Budgets are program dollars for the whole
// timeline, excluding salaries; capacity is the engineer-weeks the company's staffing
// can put toward roadmap work.

// A roadmap passes when it prevents at least this share of the company's projected loss.
// No control is perfect, so even the best affordable roadmaps leave roughly 25-35% behind.
export const passingReadiness = 60;
export const baselineHeadcount = 100;

export const scenarios = [
  {
    id: "orbitpay",
    name: "OrbitPay",
    tagline: "Fintech Startup · SOC 2 Type II in 6 Months",
    description: "A 120-person fintech processing payments. Microservices on AWS. No dedicated security team until now. The SOC 2 Type II observation window opens in 6 months.",
    headcount: 120,
    months: 6,
    budget: 90,
    engineerWeeks: 36,
    staffing: "You, the first AppSec hire, plus borrowed platform engineering time",
    impactMultiplier: 1.3,
    impactNote: "Payments and PII raise fraud losses and PCI exposure.",
    threat: "High transaction volume, PII handling, cloud-native architecture.",
    incidentIds: ["secret_leak", "sqli", "cred_stuffing", "idor", "container_vuln"]
  },
  {
    id: "medisecure",
    name: "MediSecure",
    tagline: "Healthcare SaaS · HIPAA Through a Migration",
    description: "An 80-person health-tech company migrating from monolith to microservices over the next year. Handles protected health information (PHI). The HIPAA risk assessment is due when the migration lands.",
    headcount: 80,
    months: 12,
    budget: 80,
    engineerWeeks: 26,
    staffing: "A half-time security engineer shared with compliance, plus two champions",
    impactMultiplier: 1.5,
    impactNote: "PHI raises breach notification costs and HIPAA penalties.",
    threat: "PHI exposure risk, regulated industry, architecture in transition.",
    incidentIds: ["dep_vuln", "idor", "secret_leak", "container_vuln", "breach"]
  },
  {
    id: "retailrush",
    name: "RetailRush",
    tagline: "E-Commerce · Re-platform Before Peak",
    description: "A 200-person e-commerce platform replacing a legacy codebase over 18 months, with two peak shopping seasons along the way. High traffic, high stakes.",
    headcount: 200,
    months: 18,
    budget: 350,
    engineerWeeks: 90,
    staffing: "A two-person AppSec team, about 60% of it free for roadmap work",
    impactMultiplier: 1.0,
    impactNote: "Impact is driven by downtime and lost revenue at scale.",
    threat: "Legacy code, traffic spikes, revenue-critical uptime.",
    incidentIds: ["ddos", "dep_vuln", "sqli", "cred_stuffing", "breach"]
  }
];

// setupK / monthlyK: program dollars ($K) for a 100-person company.
// setupWeeks / monthlyWeeks: engineer-weeks for a 100-person company.
// mitigates: share of an incident's loss the initiative removes, by threat category.
// Layered controls combine as 1 - (1 - a)(1 - b): each catches part of what the others miss.
// containsAll: incident response does not prevent attacks, but it limits the loss from every incident.
export const initiatives = [
  { id: "sast", name: "SAST Pipeline Scanning", category: "Code Scanning", setupK: 5, monthlyK: 3, setupWeeks: 4, monthlyWeeks: 0.5, mitigates: { code_injection: 0.7, xss: 0.6 }, description: "Automated static analysis in your CI/CD pipeline to catch vulnerabilities before deploy." },
  { id: "sca", name: "Dependency Scanning (SCA)", category: "Dependencies", setupK: 2, monthlyK: 2, setupWeeks: 2, monthlyWeeks: 0.3, mitigates: { dependency_vuln: 0.8 }, description: "Scan third-party dependencies for known CVEs and auto-generate fix pull requests." },
  { id: "secrets", name: "Secrets Management Vault", category: "Secrets", setupK: 10, monthlyK: 1.5, setupWeeks: 6, monthlyWeeks: 0.3, mitigates: { secret_leak: 0.85 }, description: "Centralized secrets vault with rotation. Eliminates hardcoded credentials." },
  { id: "mfa", name: "MFA & Auth Hardening", category: "Authentication", setupK: 5, monthlyK: 1, setupWeeks: 6, monthlyWeeks: 0.2, mitigates: { credential_stuffing: 0.85, account_takeover: 0.8 }, description: "Multi-factor authentication and session hardening across all user-facing apps." },
  { id: "threat_modeling", name: "Threat Modeling Program", category: "Design Review", setupK: 5, monthlyK: 0.5, setupWeeks: 3, monthlyWeeks: 1, mitigates: { authz_flaw: 0.4, design_flaw: 0.7 }, description: "Structured threat modeling for high-risk features before code is written." },
  { id: "rbac", name: "RBAC & Authorization Audit", category: "Authorization", setupK: 5, monthlyK: 0, setupWeeks: 8, monthlyWeeks: 0.3, mitigates: { authz_flaw: 0.8, privilege_escalation: 0.7 }, description: "Audit and enforce role-based access controls across all services." },
  { id: "waf", name: "WAF & DDoS Protection", category: "Infrastructure", setupK: 5, monthlyK: 4, setupWeeks: 1, monthlyWeeks: 0.2, mitigates: { ddos: 0.85, credential_stuffing: 0.4, code_injection: 0.3, dependency_vuln: 0.2 }, description: "Web Application Firewall and rate limiting at the edge." },
  { id: "training", name: "Secure Coding Training", category: "Culture", setupK: 3, monthlyK: 1, setupWeeks: 1, monthlyWeeks: 0.3, mitigates: { code_injection: 0.3, xss: 0.3 }, description: "OWASP Top 10 training for all engineers. Builds a security-first culture." },
  { id: "ir", name: "Incident Response Plan", category: "Operations", setupK: 5, monthlyK: 0.3, setupWeeks: 3, monthlyWeeks: 0.2, mitigates: { breach_response: 0.6 }, containsAll: 0.15, description: "Documented IR runbooks, on-call rotation, and tabletop exercises." },
  { id: "container", name: "Container Image Scanning", category: "Infrastructure", setupK: 3, monthlyK: 2.5, setupWeeks: 3, monthlyWeeks: 0.3, mitigates: { container_vuln: 0.8, misconfiguration: 0.6, dependency_vuln: 0.3 }, description: "Scan container images for vulnerabilities and misconfigurations before deployment." }
];

// baseImpactK: cost of the incident ($K) to a 100-person company if nothing stops it:
// response, forensics, fraud, notification, downtime, and lost revenue. Each company
// scales it by its size and its sector's exposure (see impactOf).
export const incidents = [
  { id: "dep_vuln", title: "Dependency Vulnerability Exploited", description: "A vulnerable Log4j-style dependency was exploited in production. Attackers gained initial access through a known CVE that had a patch available for months.", coverageNeeded: "dependency_vuln", severity: "critical", baseImpactK: 400 },
  { id: "secret_leak", title: "API Key Leaked to Public Repo", description: "An engineer accidentally pushed an AWS access key to a public GitHub repository. It was scraped by bots within minutes.", coverageNeeded: "secret_leak", severity: "high", baseImpactK: 150 },
  { id: "cred_stuffing", title: "Credential Stuffing Attack", description: "Attackers are using leaked passwords from another breach to attempt logins across your user base. Thousands of attempts per minute.", coverageNeeded: "credential_stuffing", severity: "high", baseImpactK: 200 },
  { id: "idor", title: "Broken Access Control (IDOR)", description: "A bug bounty researcher found that any user could access other users' transaction history by changing a URL parameter.", coverageNeeded: "authz_flaw", severity: "critical", baseImpactK: 100 },
  { id: "container_vuln", title: "Vulnerable Container Deployed", description: "A container image with an unpatched kernel vulnerability was deployed to production without scanning.", coverageNeeded: "container_vuln", severity: "medium", baseImpactK: 60 },
  { id: "ddos", title: "DDoS Traffic Spike", description: "Your platform is receiving 50x normal traffic. Legitimate users are being locked out during peak hours.", coverageNeeded: "ddos", severity: "medium", baseImpactK: 150 },
  { id: "sqli", title: "SQL Injection in Payment Endpoint", description: "A penetration test discovered a SQL injection vulnerability in a critical payment endpoint. Data exfiltration is possible.", coverageNeeded: "code_injection", severity: "critical", baseImpactK: 250 },
  { id: "breach", title: "Suspected Data Breach", description: "Anomalous database queries detected at 3 AM. You need to determine scope and respond immediately.", coverageNeeded: "breach_response", severity: "high", baseImpactK: 500 }
];

export const tiers = [
  { min: 60, label: "Mission success", desc: "Your roadmap withstood the storm. The board is impressed." },
  { min: 45, label: "Partial success", desc: "You survived, but with battle damage. Key gaps remain." },
  { min: 30, label: "Compromised", desc: "Critical gaps led to significant impact. Time to reassess." },
  { min: 0, label: "Mission failure", desc: "The roadmap could not defend against the threats." }
];

export const findScenario = (id) => scenarios.find((scenario) => scenario.id === id);
export const findInitiative = (id) => initiatives.find((initiative) => initiative.id === id);
export const formatCoverage = (category) => category.replaceAll("_", " ");

export const companyScale = (scenario) => scenario.headcount / baselineHeadcount;

// One-time setup plus monthly run cost over the scenario's timeline, scaled by company size.
// Setup dollars are fixed; licenses and effort grow with the size of the company.
export function costOf(initiative, scenario) {
  const scale = companyScale(scenario);
  return {
    budget: Math.round(initiative.setupK + initiative.monthlyK * scenario.months * scale),
    weeks: Math.round((initiative.setupWeeks + initiative.monthlyWeeks * scenario.months) * scale)
  };
}

export function totals(scenario, activatedIds) {
  return activatedIds.reduce((sum, id) => {
    const initiative = findInitiative(id);
    if (!initiative) return sum;
    const cost = costOf(initiative, scenario);
    return { budget: sum.budget + cost.budget, weeks: sum.weeks + cost.weeks };
  }, { budget: 0, weeks: 0 });
}

export function effectivenessOf(initiative, category) {
  return initiative.mitigates[category] ?? initiative.containsAll ?? 0;
}

// Share of an incident's loss removed by the whole roadmap, layering every control that applies.
export function mitigationFor(activatedIds, category) {
  const remaining = activatedIds.reduce((left, id) => {
    const initiative = findInitiative(id);
    return initiative ? left * (1 - effectivenessOf(initiative, category)) : left;
  }, 1);
  return 1 - remaining;
}

// Every category the roadmap touches, with its layered mitigation, strongest first.
export function coverageFor(activatedIds) {
  const categories = new Set(activatedIds.flatMap((id) => Object.keys(findInitiative(id)?.mitigates || {})));
  return [...categories]
    .map((category) => ({ category, mitigation: mitigationFor(activatedIds, category) }))
    .sort((a, b) => b.mitigation - a.mitigation);
}

export function canActivate(scenario, activatedIds, initiativeId) {
  const initiative = findInitiative(initiativeId);
  if (!scenario || !initiative || activatedIds.includes(initiativeId)) return false;
  const spent = totals(scenario, [...activatedIds, initiativeId]);
  return spent.budget <= scenario.budget && spent.weeks <= scenario.engineerWeeks;
}

// Rebuilds a selection one item at a time so restored state can never exceed the scenario's resources.
export function sanitizeSelection(scenario, ids) {
  if (!scenario || !Array.isArray(ids)) return [];
  return ids.reduce((kept, id) => (canActivate(scenario, kept, id) ? [...kept, id] : kept), []);
}

export function incidentDeck(scenario) {
  return scenario.incidentIds.map((id) => incidents.find((incident) => incident.id === id));
}

// Initiatives that reduce this threat, most effective first. Response-only help is listed last.
export function helpfulInitiatives(category) {
  return initiatives
    .map((initiative) => ({ initiative, effectiveness: effectivenessOf(initiative, category), direct: category in initiative.mitigates }))
    .filter((item) => item.effectiveness > 0)
    .sort((a, b) => (b.direct - a.direct) || (b.effectiveness - a.effectiveness));
}

export const formatPercent = (share) => `${Math.round(share * 100)}%`;

// An incident's cost to this company: baseline x company size x sector exposure, rounded to $10K.
export function impactOf(incident, scenario) {
  return Math.round((incident.baseImpactK * companyScale(scenario) * scenario.impactMultiplier) / 10) * 10;
}

export function formatImpact(amountK) {
  return amountK >= 1000 ? `$${(amountK / 1000).toFixed(1)}M` : `$${amountK}K`;
}

export function deckExposure(scenario) {
  return incidentDeck(scenario).reduce((sum, incident) => sum + impactOf(incident, scenario), 0);
}

export function outcomeFor(mitigation) {
  if (mitigation >= 0.75) return "neutralized";
  if (mitigation >= 0.3) return "contained";
  return "breached";
}

export function assessIncident(incident, activatedIds, scenario) {
  const potential = impactOf(incident, scenario);
  const mitigation = mitigationFor(activatedIds, incident.coverageNeeded);
  const contributors = activatedIds
    .map((id) => findInitiative(id))
    .filter((initiative) => initiative && effectivenessOf(initiative, incident.coverageNeeded) > 0)
    .map((initiative) => ({ initiative, effectiveness: effectivenessOf(initiative, incident.coverageNeeded) }));
  const impact = Math.round((potential * (1 - mitigation)) / 10) * 10;
  return { incident, potential, mitigation, contributors, impact, outcome: outcomeFor(mitigation), defended: outcomeFor(mitigation) === "neutralized" };
}

// Readiness is the share of the company's projected loss across the whole deck that the roadmap prevented.
export function scoreResults(results, exposure) {
  const financialImpact = results.reduce((sum, result) => sum + result.impact, 0);
  const readiness = exposure > 0 ? Math.max(0, Math.round(100 * (1 - financialImpact / exposure))) : 100;
  return {
    readiness,
    exposure,
    financialImpact,
    prevented: results.reduce((sum, result) => sum + result.potential - result.impact, 0),
    defendedCount: results.filter((result) => result.outcome === "neutralized").length,
    containedCount: results.filter((result) => result.outcome === "contained").length,
    breachedCount: results.filter((result) => result.outcome === "breached").length,
    tier: tiers.find((tier) => readiness >= tier.min),
    passed: readiness >= passingReadiness
  };
}

export function runSimulation(scenario, activatedIds) {
  const results = incidentDeck(scenario).map((incident) => assessIncident(incident, activatedIds, scenario));
  return { results, ...scoreResults(results, deckExposure(scenario)) };
}
