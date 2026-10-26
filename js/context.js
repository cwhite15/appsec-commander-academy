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
  ransomware: 48
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
