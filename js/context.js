// Where Mission 02 sits in a company's wider risk picture. None of this changes the score or the balance.
//
// Breach routes are from the Verizon 2026 Data Breach Investigations Report, checked word for word against the
// report text (Figure 10 and pp.11-20). Values shown only in the report's charts are deliberately left out.

export const breachRoutes = {
  source: "Verizon DBIR 2026",
  population: "breaches, n=20,023",
  routes: [
    { id: "exploit", label: "Exploitation of vulnerabilities", share: 31, scope: "part", note: "Your own web apps are in scope. Vendor products and edge devices are not: VPN and edge devices were 22% of exploitation in the 2025 DBIR." },
    { id: "phishing", label: "Phishing", share: 16, scope: "out", note: "Email and people program." },
    { id: "credentials", label: "Credential abuse", share: 13, scope: "part", note: "Customer logins are in scope (the MFA card). Staff, VPN and SSO credentials belong to the identity program." },
    { id: "pretexting", label: "Pretexting", share: 6, scope: "out", note: "Email and people program." }
  ],
  thirdParty: 48,
  ransomware: 48,
  // Share of 2026 breaches with a human element (n=19,597), from the report text like the two above.
  humanElement: 62
};

// The game's 14 threats grouped by where they sit. Every threat belongs to exactly one group.
export const riskCategories = [
  { id: "code", label: "Your code & design", incidents: ["sqli", "xss", "idor", "privilege_escalation", "design_flaw"] },
  { id: "deps", label: "Dependencies & build", incidents: ["dep_vuln", "malicious_package"] },
  { id: "identity", label: "Customer logins", incidents: ["cred_stuffing", "account_takeover"] },
  { id: "cloud", label: "Secrets & cloud config", incidents: ["secret_leak", "misconfiguration", "container_vuln"] },
  { id: "avail", label: "Availability", incidents: ["ddos"] },
  { id: "response", label: "Detection & response", incidents: ["breach"] }
];

export const categoryOf = (incidentId) => riskCategories.find((category) => category.incidents.includes(incidentId)) || null;

// The lenses on Mission 02's briefing. Only "appsec" plays the game; "org" is a read-only portfolio view,
// so it can never complete the mission or feed Mission 03. The lens lives in state.lens, never in state.sim.
export const lenses = [
  { id: "appsec", label: "Application & platform", status: "This mission" },
  { id: "org", label: "Whole organization", status: "Read-only overview" }
];
export const defaultLens = lenses[0].id;
export const validLens = (id) => (lenses.some((lens) => lens.id === id) ? id : defaultLens);

// Evidence grades describe how strong the evidence is that a program's controls reduce incidents, not how big
// the risk is. A fixed set, so the view and the tests agree.
export const evidenceGrades = ["Strong", "Moderate", "Weak"];

// Marsh 2023 is quoted twice below, and its limits apply to both. Shown once, in the portfolio's note.
export const marshCaveat = "Marsh McLennan 2023 matched its US clients' self-assessments to one year of claims (Nov 2020 to Nov 2021), covers general IT controls, and is a raw correlation. Each control was considered in isolation, so the figures can't be combined or multiplied. \"Lower\" is 1 − 1/signal strength, our arithmetic, not a Marsh figure.";

const share = (id) => breachRoutes.routes.find((route) => route.id === id).share;

// One security portfolio, one canonical list. Every DBIR figure is built from breachRoutes (2026) except the
// 2025 edge-device share, which is already in the exploitation route's note. Each evidence figure is checked
// against the workspace research/ files named in its source; nothing here is company-specific.
export const programs = [
  {
    id: "appsec",
    label: "Application & platform security",
    covers: "Exploited vulnerabilities in your own apps, customer credential abuse, secrets and cloud configuration.",
    routes: ["exploit", "credentials"],
    dbir: `Exploitation ${share("exploit")}% (part) · credential abuse ${share("credentials")}% (part)`,
    evidence: { grade: "Weak", summary: "Detection benchmarks and vendor data. Our research found no study tying SAST, DAST, threat modeling or training to fewer incidents.", source: "Academy research review" },
    status: "This mission"
  },
  {
    id: "vuln",
    label: "Vulnerability & patch management (vendor, edge)",
    covers: "VPNs, firewalls, file-transfer and other vendor products.",
    routes: [],
    dbir: "VPN and edge devices were 22% of exploitation (2025 DBIR)",
    evidence: { grade: "Moderate", summary: "Patching high-severity CVEs within 7 days: claim signal strength 2.19, about 54% lower likelihood.", source: "Marsh McLennan 2023 claims data" },
    status: "Not in the academy yet"
  },
  {
    id: "identity",
    label: "Identity & access",
    covers: "Staff, SSO, VPN and cloud-console credentials, MFA, privileged access.",
    routes: ["credentials"],
    dbir: `Credential abuse ${share("credentials")}%`,
    evidence: { grade: "Strong", summary: "MFA cut account-compromise risk by 99.22%. Vendor data, observational.", source: "Microsoft research (Meyer et al. 2023)" },
    status: "Not in the academy yet"
  },
  {
    id: "people",
    label: "Email & people",
    covers: "Phishing, pretexting, business email compromise.",
    routes: ["phishing", "pretexting"],
    dbir: `Phishing ${share("phishing")}% · pretexting ${share("pretexting")}% · a human element in ${breachRoutes.humanElement}%`,
    evidence: { grade: "Moderate", summary: "Phishing tests at least yearly: claim signal strength 1.76, about 43% lower likelihood.", source: "Marsh McLennan 2023 claims data" },
    status: "Not in the academy yet"
  },
  {
    id: "third",
    label: "Third-party risk",
    covers: "Vendors, hosted platforms, partners.",
    routes: [],
    dbir: `A third party was involved in ${breachRoutes.thirdParty}%`,
    evidence: { grade: "Weak", summary: "Strong data on how often third parties are involved, but our research found no study tying vendor-risk reviews to fewer incidents.", source: "Verizon DBIR 2026; academy research review" },
    status: "Not in the academy yet"
  },
  {
    id: "response",
    label: "Detection & response",
    covers: "Finding and containing what gets through, including ransomware.",
    routes: [],
    dbir: `Ransomware in ${breachRoutes.ransomware}%`,
    evidence: { grade: "Moderate", qualifier: "on cost, not likelihood", summary: "IBM measures what a breach costs once it has happened, never how likely it is.", source: "IBM Cost of a Data Breach 2023–2026" },
    status: "Partly in this mission (Detection, Incident Response)"
  }
];
