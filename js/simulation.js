// Mission 02 content. Scenarios, initiatives, and incidents started from the Base44
// "Roadmap Simulator" page and were redesigned for SAINTCON 2026 (see docs/design/).
//
// Each scenario is a separate company played on its own; nothing carries between them.
// Every company has a risk register: a likelihood for each of the 14 threats within its
// timeline. Expected loss (EL) is likelihood × impact, summed over the whole register:
//   inherent EL: no controls at all
//   current EL:  the controls the company already has (its starting posture)
//   target EL:   after the attendee's roadmap
//
// Time to value: each funded control starts in a chosen month and ramps up to full strength
// over its rampMonths. Expected loss is spread evenly over the timeline, and each month is
// mitigated by whatever has ramped up by then. The target blends the loss during the timeline
// with the risk handed over at the end, so both quick wins and lasting capability count.
// Readiness is the share of inherent EL the company's controls remove, so what it already
// has counts toward the score.
//
// Costs: an initiative costs a one-time setup plus a monthly run cost from its start to the end
// of the timeline, scaled by the company's size (headcount / 100). Budgets are program dollars
// for the whole timeline, excluding salaries. Capacity is the engineer-weeks the company's
// staffing can put toward roadmap work, split across phases: time not spent in a phase is gone.
// Controls already in place cost nothing. Partial controls run for free at half strength, and
// upgrading one to full costs half of its full cost.

// A roadmap passes when the company's controls remove at least this share of inherent expected loss.
export const passingReadiness = 62;
export const baselineHeadcount = 100;
export const runLength = 5;

// When a funded control can start: month 0, 3, 6, or 12, where that falls inside the timeline.
export const phaseStarts = [0, 3, 6, 12];
// The score weighs the loss during the timeline and the risk handed over at the end equally.
export const scoreWeights = { during: 0.5, handover: 0.5 };
// An upgraded partial control ramps from 50% to full over this share of the control's ramp time.
export const upgradeRampShare = 0.5;

export const likelihoodDefinition = "Likelihood is the chance this incident happens at full impact within the company's timeline, not the chance that the weakness exists.";

// Foundations make other controls work instead of stopping incidents themselves. Each control
// is rated assuming its foundations are in place; each missing one takes away this share of
// what the control delivers. A partial foundation takes away half of its penalty. Detection
// is a regular control that Incident Response depends on: a plan nobody triggers is a document.
export const penalties = { vuln_mgmt: 0.5, inventory: 0.35, champions: 0.25, training: 0.15, detection: 0.5 };

// OWASP SAMM v2 business functions, used to group the build screen.
export const groups = [
  { id: "governance", name: "Governance", summary: "Foundations: people, skills, and knowing what you have" },
  { id: "design", name: "Design", summary: "Stop flaws before code is written" },
  { id: "implementation", name: "Implementation", summary: "Build and ship safely" },
  { id: "verification", name: "Verification", summary: "Find what got through" },
  { id: "operations", name: "Operations", summary: "Protect, detect, and respond in production" }
];

export const scenarios = [
  {
    id: "orbitpay",
    name: "OrbitPay",
    tagline: "Fintech Startup · SOC 2 Type II in 6 Months",
    description: "A 120-person fintech processing payments. Microservices on AWS. No dedicated security team until now. The SOC 2 Type II observation window opens in 6 months.",
    headcount: 120,
    months: 6,
    budget: 90,
    engineerWeeks: 48,
    staffing: "You, the first AppSec hire, plus most of a platform engineer on loan",
    impactMultiplier: 1.3,
    newCodeShare: 0.6,
    impactNote: "Payments and PII raise fraud losses and PCI exposure.",
    threat: "High transaction volume, PII handling, cloud-native architecture.",
    postureStory: "120 people, mostly engineers, so free tools are everywhere. But there's no coordination between teams, no tracking, and no definition of what security requires.",
    posture: {
      sast: { state: "partial", note: "CodeQL or Semgrep CE on some repos" },
      sca: { state: "partial", note: "Dependabot alerts, nobody assigned" },
      secrets: { state: "partial", note: "GitHub secret scanning; some teams use AWS Secrets Manager, others .env files" },
      mfa: { state: "partial", note: "Staff only; customers have none" },
      waf: { state: "partial", note: "CDN free tier" },
      container: { state: "partial", note: "Basic registry image scanning" }
    },
    riskRegister: { cred_stuffing: 0.6, secret_leak: 0.55, sqli: 0.35, account_takeover: 0.35, idor: 0.45, misconfiguration: 0.15, container_vuln: 0.4, dep_vuln: 0.06, breach: 0.05, design_flaw: 0.08, privilege_escalation: 0.08, xss: 0.1, ddos: 0.05, malicious_package: 0.08 }
  },
  {
    id: "medisecure",
    name: "MediSecure",
    tagline: "Healthcare SaaS · HIPAA Through a Migration",
    description: "An 80-person health-tech company migrating from monolith to microservices over the next year. Handles protected health information (PHI). The HIPAA risk assessment is due when the migration lands.",
    headcount: 80,
    months: 12,
    budget: 80,
    engineerWeeks: 34,
    staffing: "A half-time security engineer shared with compliance, plus two champions",
    impactMultiplier: 1.5,
    newCodeShare: 0.5,
    impactNote: "PHI raises breach notification costs and HIPAA penalties.",
    threat: "PHI exposure risk, regulated industry, architecture in transition.",
    postureStory: "An annual internal audit against its HIPAA policy proves compliance to leadership, so everything the policy names exists on paper. Pen test findings sit unfixed.",
    posture: {
      data_protection: { state: "in", note: "Encryption at rest and in transit" },
      pentest: { state: "in", note: "Annual, because customers and auditors expect it; findings sit unfixed" },
      ir: { state: "partial", note: "On paper, never exercised" },
      inventory: { state: "partial", note: "HIPAA risk analysis of ePHI systems, not a service inventory" },
      training: { state: "partial", note: "Annual HIPAA awareness, not secure coding" },
      rbac: { state: "partial", note: "Annual user-access review, not service authorization" },
      detection: { state: "partial", note: "Audit logs reviewed for the audit, not monitored" }
    },
    riskRegister: { dep_vuln: 0.45, breach: 0.2, idor: 0.5, secret_leak: 0.4, privilege_escalation: 0.3, misconfiguration: 0.25, container_vuln: 0.4, design_flaw: 0.12, account_takeover: 0.08, cred_stuffing: 0.08, xss: 0.08, sqli: 0.05, ddos: 0.03, malicious_package: 0.08 }
  },
  {
    id: "retailrush",
    name: "RetailRush",
    tagline: "E-Commerce · Re-platform Before Peak",
    description: "A 200-person e-commerce platform replacing a legacy codebase over 18 months, with two peak shopping seasons along the way. High traffic, high stakes.",
    headcount: 200,
    months: 18,
    budget: 250,
    engineerWeeks: 105,
    staffing: "A two-person AppSec team, about 70% of it free for roadmap work",
    impactMultiplier: 1.0,
    newCodeShare: 0.7,
    impactNote: "Impact is driven by downtime and lost revenue at scale.",
    threat: "Legacy code, traffic spikes, revenue-critical uptime, and a re-platform that rebuilds checkout, promotions, and refunds.",
    postureStory: "Plenty of spend, little effect. Several partial controls are also PCI DSS findings waiting to happen.",
    posture: {
      sast: { state: "in", note: "Bought two years ago, now shelfware" },
      pentest: { state: "in", note: "Annual, for PCI" },
      waf: { state: "partial", note: "Log-only mode" },
      detection: { state: "partial", note: "Logs collected, nobody watches" },
      mfa: { state: "partial", note: "Admins only" },
      data_protection: { state: "partial", note: "Processor tokenizes cards; customer PII is not" },
      training: { state: "partial", note: "Annual awareness, not secure coding" }
    },
    riskRegister: { dep_vuln: 0.5, cred_stuffing: 0.7, sqli: 0.4, ddos: 0.65, breach: 0.2, xss: 0.3, account_takeover: 0.25, design_flaw: 0.35, secret_leak: 0.15, misconfiguration: 0.12, container_vuln: 0.2, idor: 0.15, privilege_escalation: 0.05, malicious_package: 0.12 }
  }
];

// setupK / monthlyK: program dollars ($K) for a 100-person company (about 50 engineers).
// setupWeeks / monthlyWeeks: engineer-weeks for a 100-person company.
// mitigates: share of an incident's loss the initiative removes, by threat, with its foundations in place.
// containsAll: detection and response don't prevent attacks, but they limit the loss from every incident.
// needs: foundations (or, for IR, detection) the initiative depends on. See penalties.
// short: the name used in on-screen lists such as "Missing: Vulnerability Management (−50%)".
// rampMonths: months from start to full strength. helpsShipped: false means it only protects new code (see shippedFactor).
// Layered controls combine as 1 - (1 - a)(1 - b): each catches part of what the others miss.
export const initiatives = [
  { id: "training", name: "Secure Coding Training", short: "Secure Coding Training", group: "governance", foundation: true, setupK: 0, monthlyK: 1, setupWeeks: 1, monthlyWeeks: 0.5, mitigates: {}, needs: [], rampMonths: 3, description: "Secure coding training for every engineer, counting learner time. Developers who understand a finding fix it right and use the paved road." },
  { id: "champions", name: "Security Champions Program", short: "Security Champions", group: "governance", foundation: true, setupK: 0, monthlyK: 0.8, setupWeeks: 3, monthlyWeeks: 0.6, mitigates: {}, needs: [], rampMonths: 4, description: "An embedded champion in each team with protected time to triage findings, run threat models, and own fixes." },
  { id: "inventory", name: "Inventory, Risk Classification & Coverage Metrics", short: "Inventory", group: "governance", foundation: true, setupK: 0, monthlyK: 0.5, setupWeeks: 5, monthlyWeeks: 0.3, mitigates: {}, needs: [], rampMonths: 2, description: "Know every app, API, and data store, rank them by risk, and measure which controls actually cover each one." },
  { id: "threat_modeling", name: "Threat Modeling & Security Requirements", short: "Threat Modeling", group: "design", setupK: 5, monthlyK: 0.5, setupWeeks: 3, monthlyWeeks: 0.5, mitigates: { design_flaw: 0.7, authz_flaw: 0.4, privilege_escalation: 0.3 }, needs: ["champions"], rampMonths: 6, helpsShipped: false, description: "Threat model high-risk features and write their security requirements before code is written." },
  { id: "secure_defaults", name: "Secure Defaults & Paved Roads", short: "Secure Defaults", group: "design", setupK: 0, monthlyK: 0, setupWeeks: 6, monthlyWeeks: 0.5, mitigates: { code_injection: 0.75, xss: 0.75, authz_flaw: 0.5, misconfiguration: 0.3, secret_leak: 0.3 }, needs: ["champions", "training"], rampMonths: 6, helpsShipped: false, description: "Hardened frameworks and templates that make the secure way the easy way: auto-escaping, parameterized queries, authorization middleware." },
  { id: "mfa", name: "MFA & Auth Hardening", short: "MFA", group: "design", setupK: 5, monthlyK: 0.6, setupWeeks: 5, monthlyWeeks: 0.2, mitigates: { credential_stuffing: 0.85, account_takeover: 0.8 }, needs: ["inventory"], rampMonths: 3, helpsShipped: true, description: "Enforce MFA, rate-limit login and reset flows, and harden sessions and tokens across every user-facing app." },
  { id: "sca", name: "SCA & Supply Chain Integrity", short: "SCA", group: "implementation", setupK: 0, monthlyK: 1.25, setupWeeks: 2, monthlyWeeks: 0.3, mitigates: { dependency_vuln: 0.8, supply_chain: 0.6 }, needs: ["vuln_mgmt"], rampMonths: 1, helpsShipped: true, description: "Scan dependencies for known CVEs with auto-fix pull requests, pin versions, keep an SBOM, and block known-malicious packages." },
  { id: "secrets", name: "Secrets Management & Push Protection", short: "Secrets Management", group: "implementation", setupK: 0, monthlyK: 1.8, setupWeeks: 8, monthlyWeeks: 0.3, mitigates: { secret_leak: 0.85 }, needs: ["inventory"], rampMonths: 4, helpsShipped: "partly", description: "One secrets manager with rotation, plus push protection that blocks credentials before they reach a repository." },
  { id: "vuln_mgmt", name: "Vulnerability Management & SLAs", short: "Vulnerability Management", group: "implementation", foundation: true, setupK: 0, monthlyK: 1, setupWeeks: 4, monthlyWeeks: 0.5, mitigates: {}, needs: [], rampMonths: 2, description: "Triage, an owner, and a fix SLA for every finding from every source. Without it, findings become backlog, not fixes." },
  { id: "sast", name: "SAST Pipeline Scanning", short: "SAST", group: "verification", setupK: 0, monthlyK: 1.5, setupWeeks: 3, monthlyWeeks: 0.4, mitigates: { code_injection: 0.7, xss: 0.6 }, needs: ["vuln_mgmt", "champions", "training"], rampMonths: 3, helpsShipped: true, description: "Static analysis on every pull request, tuned to keep false positives low." },
  { id: "dast", name: "DAST & API Security Testing", short: "DAST", group: "verification", setupK: 0, monthlyK: 2.25, setupWeeks: 3, monthlyWeeks: 0.4, mitigates: { xss: 0.5, code_injection: 0.4, authz_flaw: 0.3, misconfiguration: 0.3 }, needs: ["vuln_mgmt", "training"], rampMonths: 2, helpsShipped: true, description: "Automated dynamic and API testing against running staging environments." },
  { id: "pentest", name: "Pen Testing, Bug Bounty & VDP", short: "Pen Testing", group: "verification", setupK: 25, monthlyK: 0.8, setupWeeks: 2, monthlyWeeks: 0.3, mitigates: { authz_flaw: 0.5, privilege_escalation: 0.5, design_flaw: 0.4, code_injection: 0.4, account_takeover: 0.3 }, needs: ["vuln_mgmt", "champions"], rampMonths: 2, helpsShipped: true, description: "An expert pen test plus a vulnerability disclosure program or bug bounty, to find the logic and access-control flaws scanners miss." },
  { id: "rbac", name: "RBAC & Authorization Audit", short: "RBAC Audit", group: "verification", setupK: 2, monthlyK: 0, setupWeeks: 8, monthlyWeeks: 0.3, mitigates: { authz_flaw: 0.8, privilege_escalation: 0.7 }, needs: ["inventory", "champions"], rampMonths: 4, helpsShipped: true, description: "Audit and enforce role-based and object-level authorization in every service." },
  { id: "waf", name: "WAF, Bot & DDoS Protection", short: "WAF", group: "operations", setupK: 0, monthlyK: 0.75, setupWeeks: 1.5, monthlyWeeks: 0.2, mitigates: { ddos: 0.85, credential_stuffing: 0.4, code_injection: 0.3, dependency_vuln: 0.2 }, needs: ["inventory"], rampMonths: 1, helpsShipped: true, description: "A web application firewall in blocking mode, bot management, rate limiting, and DDoS protection at the edge." },
  { id: "container", name: "Container & Cloud Posture", short: "Cloud Posture", group: "operations", setupK: 0, monthlyK: 2, setupWeeks: 3, monthlyWeeks: 0.4, mitigates: { container_vuln: 0.8, misconfiguration: 0.75, dependency_vuln: 0.3 }, needs: ["vuln_mgmt", "inventory"], rampMonths: 2, helpsShipped: true, description: "Scan images, IaC, and deployment manifests before deploy, and watch cloud configuration for drift (CSPM)." },
  { id: "data_protection", name: "Data Protection", short: "Data Protection", group: "operations", setupK: 0, monthlyK: 1, setupWeeks: 8, monthlyWeeks: 0.2, mitigates: { breach_response: 0.25, code_injection: 0.2, authz_flaw: 0.2, privilege_escalation: 0.2, secret_leak: 0.15 }, needs: ["inventory"], rampMonths: 4, helpsShipped: true, description: "Encrypt sensitive data, tokenize what you can, and stop collecting what you don't need, so a breach exposes less." },
  { id: "detection", name: "Security Logging, Monitoring & Detection", short: "Detection", group: "operations", setupK: 0, monthlyK: 2.5, setupWeeks: 6, monthlyWeeks: 0.5, mitigates: { breach_response: 0.4, credential_stuffing: 0.2, account_takeover: 0.2 }, containsAll: 0.1, needs: ["inventory"], rampMonths: 3, helpsShipped: true, description: "Centralized security logs with alerts that someone actually watches, so attacks are caught early." },
  { id: "ir", name: "Incident Response Plan", short: "Incident Response", group: "operations", setupK: 5, monthlyK: 0.3, setupWeeks: 3, monthlyWeeks: 0.2, mitigates: { breach_response: 0.6 }, containsAll: 0.15, needs: ["detection"], rampMonths: 2, helpsShipped: true, description: "Documented runbooks, on-call, and tabletop exercises. Limits the loss once something is detected." }
];

// baseImpactK: cost of the incident ($K) to a 100-person company if nothing stops it:
// response, forensics, fraud, notification, downtime, and lost revenue. Each company
// scales it by its size and its sector's exposure (see impactOf).
export const incidents = [
  { id: "dep_vuln", title: "Dependency Vulnerability Exploited", description: "A vulnerable Log4j-style dependency was exploited in production. Attackers gained initial access through a known CVE that had a patch available for months.", coverageNeeded: "dependency_vuln", severity: "critical", baseImpactK: 400 },
  { id: "secret_leak", title: "API Key Leaked to Public Repo", description: "An engineer accidentally pushed an AWS access key to a public GitHub repository. It was scraped by bots within minutes.", coverageNeeded: "secret_leak", severity: "high", baseImpactK: 150 },
  { id: "cred_stuffing", title: "Credential Stuffing Attack", description: "Attackers are using leaked passwords from another breach to attempt logins across your user base. Thousands of attempts per minute.", coverageNeeded: "credential_stuffing", severity: "high", baseImpactK: 200 },
  { id: "idor", title: "Broken Access Control (IDOR)", description: "A bug bounty researcher found that any user could access other users' records by changing an ID in the request.", coverageNeeded: "authz_flaw", severity: "critical", baseImpactK: 100 },
  { id: "container_vuln", title: "Vulnerable Container Deployed", description: "A container image with an unpatched kernel vulnerability was deployed to production without scanning.", coverageNeeded: "container_vuln", severity: "medium", baseImpactK: 60 },
  { id: "ddos", title: "DDoS Traffic Spike", description: "Your platform is receiving 50x normal traffic. Legitimate users are being locked out during peak hours.", coverageNeeded: "ddos", severity: "medium", baseImpactK: 150 },
  { id: "sqli", title: "SQL Injection in Payment Endpoint", description: "A penetration test discovered a SQL injection vulnerability in a critical payment endpoint. Data exfiltration is possible.", coverageNeeded: "code_injection", severity: "critical", baseImpactK: 250 },
  { id: "breach", title: "Suspected Data Breach", description: "Anomalous database queries detected at 3 AM. You need to determine scope and respond immediately.", coverageNeeded: "breach_response", severity: "high", baseImpactK: 500 },
  { id: "xss", title: "Stored XSS in Support Console", description: "A customer pasted a script into a support ticket. When an agent opened it, the script ran in the agent's session and quietly exported customer records.", coverageNeeded: "xss", severity: "high", baseImpactK: 120 },
  { id: "account_takeover", title: "Account Takeover via Password Reset", description: "Attackers abused a password-reset flow with no rate limit and long-lived tokens to take over customer accounts, then changed their email and payout details.", coverageNeeded: "account_takeover", severity: "high", baseImpactK: 180 },
  { id: "design_flaw", title: "Business Logic Flaw in a New Feature", description: "A feature shipped without anyone asking how it could be abused. Replaying one request let a user apply the same credit, refund, or approval over and over.", coverageNeeded: "design_flaw", severity: "high", baseImpactK: 200 },
  { id: "privilege_escalation", title: "Privilege Escalation to Admin", description: "A profile-update API accepted a role field it never meant to expose. A regular user set themselves to admin and could see every customer's data.", coverageNeeded: "privilege_escalation", severity: "critical", baseImpactK: 220 },
  { id: "misconfiguration", title: "Production Debug Endpoint Exposed", description: "A deployment manifest shipped with a debug endpoint and the cluster dashboard open to the internet. Scanners found it within a day.", coverageNeeded: "misconfiguration", severity: "high", baseImpactK: 180 },
  { id: "malicious_package", title: "Malicious Package in the Build", description: "A typosquatted dependency ran its install script in CI and sent the build's cloud credentials to an attacker.", coverageNeeded: "supply_chain", severity: "critical", baseImpactK: 300 }
];

// How the five incidents in the run are picked. Neither mode changes the score.
export const runModes = [
  { id: "inherent", label: "Biggest threats", summary: "The five largest risks before any controls", checks: "Tests whether your roadmap covers the threats that matter most to this company." },
  { id: "current", label: "Biggest gaps today", summary: "The five largest risks left by what the company already has", checks: "Tests whether your roadmap closes the holes the company's existing controls leave." }
];

export const tiers = [
  { min: 62, label: "Mission success", desc: "Your roadmap withstood the storm. The board is impressed." },
  { min: 50, label: "Partial success", desc: "You survived, but with battle damage. Key gaps remain." },
  { min: 35, label: "Compromised", desc: "Critical gaps led to significant impact. Time to reassess." },
  { min: 0, label: "Mission failure", desc: "The roadmap could not defend against the threats." }
];

const threatLabels = {
  dependency_vuln: "dependency CVEs", secret_leak: "secret leaks", credential_stuffing: "credential stuffing", authz_flaw: "broken access control",
  container_vuln: "vulnerable containers", ddos: "DDoS", code_injection: "injection", breach_response: "data breach", xss: "XSS",
  account_takeover: "account takeover", design_flaw: "logic flaws", privilege_escalation: "privilege escalation", misconfiguration: "misconfiguration", supply_chain: "malicious packages"
};

export const findScenario = (id) => scenarios.find((scenario) => scenario.id === id);
export const findInitiative = (id) => initiatives.find((initiative) => initiative.id === id);
export const findIncident = (id) => incidents.find((incident) => incident.id === id);
export const formatCoverage = (category) => threatLabels[category] || category.replaceAll("_", " ");
export const formatPercent = (share) => `${Math.round(share * 100)}%`;
export const validRunMode = (mode) => (runModes.some((item) => item.id === mode) ? mode : runModes[0].id);

export const companyScale = (scenario) => scenario.headcount / baselineHeadcount;

/* Posture, phases, and cost */

// "in", "partial", or null for a control the company does not have.
export const postureOf = (scenario, id) => scenario?.posture[id]?.state || null;

// The start choices that fall inside this company's timeline, and the phases they open.
// Capacity is the company's engineer-weeks split across phases in proportion to their length.
export const startsFor = (scenario) => phaseStarts.filter((start) => start < scenario.months);

export function phasesFor(scenario) {
  const starts = startsFor(scenario);
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? scenario.months;
    return { start, end, capacity: (scenario.engineerWeeks * (end - start)) / scenario.months };
  });
}

// A roadmap is the controls the attendee funds or upgrades, in the order chosen, and the month each one starts.
export function toRoadmap(value) {
  if (Array.isArray(value)) return { activated: value, starts: {} };
  return { activated: Array.isArray(value?.activated) ? value.activated : [], starts: value?.starts && typeof value.starts === "object" ? value.starts : {} };
}
export const startOf = (roadmap, id) => roadmap.starts[id] ?? 0;

// Full cost from month 0, scaled by company size: one-time setup plus the monthly run cost.
export function costOf(initiative, scenario) {
  const scale = companyScale(scenario);
  return {
    budget: Math.round(initiative.setupK + initiative.monthlyK * scenario.months * scale),
    weeks: Math.round((initiative.setupWeeks + initiative.monthlyWeeks * scenario.months) * scale)
  };
}

// What funding this initiative from `start` costs this company: nothing if it is in place, half if it is partial.
// A later start pays fewer months of run cost. Setup effort lands in the start phase; run effort in every month after.
export function optionCost(scenario, id, start = 0) {
  const initiative = findInitiative(id);
  const posture = postureOf(scenario, id);
  const phases = phasesFor(scenario);
  if (!initiative || posture === "in") return { budget: 0, weeks: 0, phaseWeeks: phases.map(() => 0) };
  const share = posture === "partial" ? 0.5 : 1;
  const scale = companyScale(scenario);
  const full = Math.round(initiative.setupK + initiative.monthlyK * (scenario.months - start) * scale);
  const phaseWeeks = phases.map((phase) => share * scale * ((phase.start === start ? initiative.setupWeeks : 0) + initiative.monthlyWeeks * Math.max(0, phase.end - Math.max(phase.start, start))));
  return { budget: share < 1 ? Math.round(full / 2) : full, weeks: phaseWeeks.reduce((sum, weeks) => sum + weeks, 0), phaseWeeks };
}

export function totals(scenario, roadmapInput) {
  const roadmap = toRoadmap(roadmapInput);
  return roadmap.activated.reduce((sum, id) => {
    const cost = optionCost(scenario, id, startOf(roadmap, id));
    return { budget: sum.budget + cost.budget, weeks: sum.weeks + cost.weeks, phaseWeeks: sum.phaseWeeks.map((weeks, index) => weeks + cost.phaseWeeks[index]) };
  }, { budget: 0, weeks: 0, phaseWeeks: phasesFor(scenario).map(() => 0) });
}

const tolerance = 1e-9;
export function withinResources(scenario, roadmap) {
  const spent = totals(scenario, roadmap);
  return spent.budget <= scenario.budget && phasesFor(scenario).every((phase, index) => spent.phaseWeeks[index] <= phase.capacity + tolerance);
}

// Whether this control can be funded (or moved) to start in this month. In-place controls are already running.
export function canPlace(scenario, roadmapInput, id, start) {
  const roadmap = toRoadmap(roadmapInput);
  if (!scenario || !findInitiative(id) || postureOf(scenario, id) === "in" || !startsFor(scenario).includes(start)) return false;
  const activated = roadmap.activated.includes(id) ? roadmap.activated : [...roadmap.activated, id];
  return withinResources(scenario, { activated, starts: { ...roadmap.starts, [id]: start } });
}

// The earliest start that still fits, or null when nothing does.
export function earliestStart(scenario, roadmap, id) {
  return startsFor(scenario).find((start) => canPlace(scenario, roadmap, id, start)) ?? null;
}

// Rebuilds a roadmap one control at a time so restored state can never exceed the scenario's resources.
// A stored start that is invalid or no longer fits moves to the earliest start that does.
export function sanitizeRoadmap(scenario, saved) {
  const clean = { activated: [], starts: {} };
  if (!scenario) return clean;
  const roadmap = toRoadmap(saved);
  for (const id of roadmap.activated) {
    if (typeof id !== "string" || clean.activated.includes(id)) continue;
    const preferred = roadmap.starts[id];
    const start = canPlace(scenario, clean, id, preferred) ? preferred : earliestStart(scenario, clean, id);
    if (start === null) continue;
    clean.activated.push(id);
    clean.starts[id] = start;
  }
  return clean;
}

/* Effectiveness over time */

const clamp = (share) => Math.max(0, Math.min(1, share));

// Strength of each control at full ramp: 1 in place or funded, 0.5 partial.
export function levelsFor(scenario, activatedIds = []) {
  const levels = {};
  for (const [id, item] of Object.entries(scenario.posture)) levels[id] = item.state === "in" ? 1 : 0.5;
  for (const id of activatedIds) if (findInitiative(id)) levels[id] = 1;
  return levels;
}

// Strength of a control in month m, sampled mid-month. Funded controls ramp linearly to full over rampMonths;
// an upgrade ramps from 50% to full over a share of that, because part of the work is already done.
export function levelAt(scenario, roadmap, id, month) {
  const posture = postureOf(scenario, id);
  if (posture === "in") return 1;
  const funded = roadmap.activated.includes(id);
  const elapsed = month + 0.5 - startOf(roadmap, id);
  const ramp = findInitiative(id).rampMonths;
  if (posture === "partial") return funded ? 0.5 + 0.5 * clamp(elapsed / (ramp * upgradeRampShare)) : 0.5;
  return funded ? clamp(elapsed / ramp) : 0;
}

export function levelsAt(scenario, roadmapInput, month) {
  const roadmap = toRoadmap(roadmapInput);
  const levels = {};
  for (const initiative of initiatives) {
    const level = levelAt(scenario, roadmap, initiative.id, month);
    if (level > 0) levels[initiative.id] = level;
  }
  return levels;
}

// The month a control reaches full strength (it may be after the timeline ends).
export function fullStrengthMonth(scenario, roadmap, id) {
  const ramp = findInitiative(id).rampMonths * (postureOf(scenario, id) === "partial" ? upgradeRampShare : 1);
  return startOf(roadmap, id) + ramp;
}

export function effectivenessOf(initiative, category) {
  return initiative.mitigates[category] ?? initiative.containsAll ?? 0;
}

// Threat modeling and secure defaults only protect code written after they start. Logic flaws are
// exempt: the logic-flaw incident is, by definition, a new feature.
export function shippedFactor(scenario, initiative, category) {
  return scenario && initiative.helpsShipped === false && category !== "design_flaw" ? scenario.newCodeShare : 1;
}

// Foundations this initiative needs that are missing or partial, with the share each one takes away.
export function missingFoundations(initiative, levels) {
  return initiative.needs
    .map((id) => ({ initiative: findInitiative(id), penalty: penalties[id] * (1 - (levels[id] || 0)) }))
    .filter((item) => item.penalty > 0);
}

// Share of its rating the initiative keeps, given its foundations.
export function foundationFactor(initiative, levels) {
  return initiative.needs.reduce((factor, id) => factor * (1 - penalties[id] * (1 - (levels[id] || 0))), 1);
}

export function deliveredFor(initiative, category, levels, scenario) {
  return effectivenessOf(initiative, category) * (levels[initiative.id] || 0) * foundationFactor(initiative, levels) * shippedFactor(scenario, initiative, category);
}

// Share of a threat's loss removed by every control running at these strengths, layered.
export function mitigationFor(levels, category, scenario) {
  return 1 - initiatives.reduce((left, initiative) => (levels[initiative.id] ? left * (1 - deliveredFor(initiative, category, levels, scenario)) : left), 1);
}

// What a control card shows: its posture, its start, and how much of its rating it delivers by the end of the timeline.
export function controlStatus(scenario, roadmapInput, id) {
  const roadmap = toRoadmap(roadmapInput);
  const initiative = findInitiative(id);
  const levels = levelsAt(scenario, roadmap, scenario.months - 1);
  const level = levels[id] || 0;
  const [category, rated] = Object.entries(initiative.mitigates).sort((a, b) => b[1] - a[1])[0] || [null, 0];
  const funded = roadmap.activated.includes(id);
  return {
    initiative,
    posture: postureOf(scenario, id),
    note: scenario.posture[id]?.note || "",
    funded,
    start: funded ? startOf(roadmap, id) : null,
    fullBy: funded ? fullStrengthMonth(scenario, roadmap, id) : null,
    level,
    category,
    rated,
    factor: foundationFactor(initiative, levels),
    delivered: category ? deliveredFor(initiative, category, levels, scenario) : 0,
    missing: missingFoundations(initiative, levels)
  };
}

// Initiatives that lean on this foundation (or on detection, for IR).
export function supportedBy(foundationId) {
  return initiatives.filter((initiative) => initiative.needs.includes(foundationId));
}

// Initiatives that reduce this threat, most effective first. Containment-only help is listed last.
export function helpfulInitiatives(category) {
  return initiatives
    .map((initiative) => ({ initiative, effectiveness: effectivenessOf(initiative, category), direct: category in initiative.mitigates }))
    .filter((item) => item.effectiveness > 0)
    .sort((a, b) => (b.direct - a.direct) || (b.effectiveness - a.effectiveness));
}

// What would cut this threat further by the end of the timeline: direct controls not yet at full strength,
// and the missing foundations holding back the controls that already address it.
export function strengthenOptions(scenario, roadmapInput, category) {
  const roadmap = toRoadmap(roadmapInput);
  const levels = levelsAt(scenario, roadmap, scenario.months - 1);
  const controls = helpfulInitiatives(category)
    .filter((item) => item.direct && (levels[item.initiative.id] || 0) < 1)
    .slice(0, 2)
    .map((item) => ({ ...item, upgrade: postureOf(scenario, item.initiative.id) === "partial", ramping: roadmap.activated.includes(item.initiative.id) }));
  const foundations = new Map();
  for (const initiative of initiatives) {
    if (!levels[initiative.id] || effectivenessOf(initiative, category) <= 0) continue;
    for (const { initiative: foundation, penalty } of missingFoundations(initiative, levels)) {
      const entry = foundations.get(foundation.id) || { initiative: foundation, penalty, upgrade: postureOf(scenario, foundation.id) === "partial", hampers: [] };
      entry.hampers.push(initiative);
      foundations.set(foundation.id, entry);
    }
  }
  return { controls, foundations: [...foundations.values()].sort((a, b) => (b.penalty - a.penalty) || (b.hampers.length - a.hampers.length)) };
}

/* Risk register and scoring */

// An incident's cost to this company: baseline x company size x sector exposure, rounded to $10K.
export function impactOf(incident, scenario) {
  return Math.round((incident.baseImpactK * companyScale(scenario) * scenario.impactMultiplier) / 10) * 10;
}

export function formatImpact(amountK) {
  const rounded = Math.round(amountK);
  return rounded >= 1000 ? `$${(rounded / 1000).toFixed(1)}M` : `$${rounded}K`;
}

const byLoss = (key) => (a, b) => (b[key] - a[key]) || (b.impact - a.impact) || a.incident.id.localeCompare(b.incident.id);

// Every threat with its likelihood, impact, and expected loss: inherent, current (starting posture),
// during (spread evenly over the timeline, each month mitigated by what had ramped up by then),
// handover (the run rate in the last month), and target (the scored blend of during and handover).
export function registerFor(scenario, roadmapInput) {
  const roadmap = toRoadmap(roadmapInput);
  const today = levelsFor(scenario);
  const months = Array.from({ length: scenario.months }, (_, month) => levelsAt(scenario, roadmap, month));
  return incidents.map((incident) => {
    const category = incident.coverageNeeded;
    const likelihood = scenario.riskRegister[incident.id];
    const impact = impactOf(incident, scenario);
    const inherent = likelihood * impact;
    const left = months.map((levels) => 1 - mitigationFor(levels, category, scenario));
    const current = inherent * (1 - mitigationFor(today, category, scenario));
    const during = (inherent * left.reduce((sum, share) => sum + share, 0)) / scenario.months;
    const handover = inherent * left[left.length - 1];
    const target = scoreWeights.during * during + scoreWeights.handover * handover;
    return { incident, likelihood, impact, inherent, current, during, handover, target, currentMitigation: 1 - current / inherent, targetMitigation: 1 - target / inherent };
  }).sort(byLoss("inherent"));
}

export function expectedLoss(register) {
  const keys = ["inherent", "current", "during", "handover", "target"];
  return register.reduce((sum, row) => Object.fromEntries(keys.map((key) => [key, sum[key] + row[key]])), Object.fromEntries(keys.map((key) => [key, 0])));
}

const readinessOf = (loss, key) => Math.max(0, Math.round(100 * (1 - loss[key] / loss.inherent)));

// Readiness is the share of inherent expected loss, across the whole register, that the company's controls
// remove: half for the loss avoided during the timeline, half for the risk handed over at the end.
export function scoreRoadmap(scenario, roadmap) {
  const loss = expectedLoss(registerFor(scenario, roadmap));
  const readiness = readinessOf(loss, "target");
  return { readiness, dayOne: readinessOf(loss, "current"), during: readinessOf(loss, "during"), handover: readinessOf(loss, "handover"), loss, tier: tiers.find((tier) => readiness >= tier.min), passed: readiness >= passingReadiness };
}

// "One possible year": the five incidents with the largest expected loss, before controls or after the starting posture.
// The attendee's roadmap never changes which five are picked.
export function incidentRun(scenario, mode = "inherent") {
  const key = validRunMode(mode) === "current" ? "current" : "inherent";
  return registerFor(scenario).sort(byLoss(key)).slice(0, runLength).map((row) => row.incident);
}

// The month each incident in the run lands: spread evenly across the timeline, in run order.
export const landingMonth = (scenario, index) => Math.floor(((index + 0.5) * scenario.months) / runLength);

export function outcomeFor(mitigation) {
  if (mitigation >= 0.75) return "neutralized";
  if (mitigation >= 0.3) return "contained";
  return "breached";
}

// An incident is met by whatever had ramped up by the month it lands.
export function assessIncident(incident, scenario, roadmapInput, month) {
  const roadmap = toRoadmap(roadmapInput);
  const levels = levelsAt(scenario, roadmap, month);
  const category = incident.coverageNeeded;
  const potential = impactOf(incident, scenario);
  const mitigation = mitigationFor(levels, category, scenario);
  const contributors = initiatives
    .filter((initiative) => levels[initiative.id] && effectivenessOf(initiative, category) > 0)
    .map((initiative) => {
      const started = roadmap.activated.includes(initiative.id) && month >= startOf(roadmap, initiative.id);
      return {
        initiative,
        rated: effectivenessOf(initiative, category),
        effectiveness: deliveredFor(initiative, category, levels, scenario),
        level: levels[initiative.id],
        funded: started,
        ramping: started && levels[initiative.id] < 1,
        missing: missingFoundations(initiative, levels)
      };
    })
    .sort((a, b) => b.effectiveness - a.effectiveness);
  // Funded controls and upgrades that would help but hadn't started yet.
  const notStarted = roadmap.activated
    .map((id) => findInitiative(id))
    .filter((initiative) => initiative && month < startOf(roadmap, initiative.id) && effectivenessOf(initiative, category) > 0)
    .map((initiative) => ({ initiative, start: startOf(roadmap, initiative.id), upgrade: postureOf(scenario, initiative.id) === "partial" }));
  const impact = Math.round((potential * (1 - mitigation)) / 10) * 10;
  const outcome = outcomeFor(mitigation);
  return { incident, month, potential, mitigation, contributors, notStarted, impact, outcome, defended: outcome === "neutralized" };
}

// Totals for the incidents assessed so far in a run.
export function summarizeRun(results) {
  const exposure = results.reduce((sum, result) => sum + result.potential, 0);
  const financialImpact = results.reduce((sum, result) => sum + result.impact, 0);
  return {
    exposure,
    financialImpact,
    prevented: exposure - financialImpact,
    defendedCount: results.filter((result) => result.outcome === "neutralized").length,
    containedCount: results.filter((result) => result.outcome === "contained").length,
    breachedCount: results.filter((result) => result.outcome === "breached").length
  };
}

export function runSimulation(scenario, roadmap, mode = "inherent") {
  const results = incidentRun(scenario, mode).map((incident, index) => assessIncident(incident, scenario, roadmap, landingMonth(scenario, index)));
  return { results, ...summarizeRun(results), ...scoreRoadmap(scenario, roadmap) };
}
