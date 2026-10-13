# Control catalog draft for review (before C)

Status: **review round complete (2026-10-12).** The catalog is approved as drafted, plus the Threat Modeling effort change. Starting posture is revised and approved, and the 66% bar and staffing wording are approved. Next step: final calibration and implementation on the `risk-register` branch. The mechanics and costs below were prototyped by brute-forcing every affordable roadmap against the C draft risk registers (see section 6). The framework mappings, cost benchmarks, and effectiveness evidence come from three research passes against primary sources where possible.

Summary:

- **18 controls:**
  - 8 kept
  - 2 expanded (Secrets, Container → Cloud posture), plus Threat Modeling absorbs security requirements
  - 7 new
  - 1 converted: Training becomes a foundation
- **4 of them are foundations** that make other controls work instead of stopping incidents themselves: Vulnerability Management, Security Champions, Secure Coding Training, and Inventory & Coverage Metrics.
- **Grouped by the 5 OWASP SAMM business functions** on the build screen, and mapped to BSIMM16 and SAMM v2 (both verified from primary sources).
- **Costs re-benchmarked** against 2025–26 pricing. The big shift: SaaS tools rarely charge setup fees, so setup is engineer time, and **engineer-weeks, not dollars, become the binding constraint**.

## 1. How foundations work

Every control's effectiveness is rated **assuming its foundations are in place**. Each control lists the foundations it depends on, and each missing foundation takes away a fixed share of what the control delivers:

> **delivered = rated × (1 − penalty) for each foundation the control needs that isn't funded**

| Foundation | Penalty when missing | Evidence (section 5) |
|---|---|---|
| **Vulnerability Management & SLAs** | **−50%** | Cobalt 2025: only 48% of pentest findings are ever resolved. Veracode 2025: leaders fix more than 10% of flaws a month, laggards less than 1%. |
| **Inventory, Risk Classification & Coverage Metrics** | **−35%** | IBM 2024: 35% of breaches involved shadow data. Only 12–19% of orgs are very confident in their API inventory (vendor survey). |
| **Security Champions** | **−25%** | Correlational only (BSIMM satellite data). Modeled as adoption and ownership, not a direct control. |
| **Secure Coding Training** | **−15%** | Weak and mostly vendor evidence. Modeled as fix quality and paved-road adoption, not a direct control. |
| **Detection** (a regular control) | **−50%**, applies to IR only | An IR plan nobody triggers is a document. |

Example: SAST is rated 70% against code injection and needs Vulnerability Management, Champions, and Training.

| Funded | SAST delivers |
|---|---|
| all three | 70% |
| no Training | 60% |
| no Champions | 53% |
| no Vulnerability Management | 35% |
| none | 22% |

A program with no foundations at all gets roughly 25–45% of what it paid for. The research agent's evidence-based range was 35–45% when both of the two main foundations are missing.

Rules:

- **Foundations don't boost each other.** There are no chains, except IR → Detection.
- **On screen,** each funded card shows *"Delivering 35% of 70%. Missing: Vulnerability Management (−50%)."* That line is the lesson.

Why weighted rather than "half value without foundations": both versions were prototyped.

| Version | How much foundations are worth (best roadmap vs. best with no foundations), OrbitPay / MediSecure / RetailRush | Problem |
|---|---|---|
| Equal share, 50% floor | 5 / 15 / 9 points | Simpler, but treats a missing inventory like a missing fix process, which the evidence doesn't support |
| Pure evidence weights | 1 / 11 / 5 points | The lesson disappears at OrbitPay. Its crown jewels (credential stuffing, account takeover, secret leak) are covered by MFA and Secrets, which don't produce findings. |
| **Recommended:** evidence weights, plus MFA needs Inventory, Inventory −35%, Champions −25% | **8 / 13 / 10 points** | Foundations matter everywhere, and every penalty has a cited anchor |

MFA depends on Inventory because MFA's real-world gap is coverage: the forgotten admin panel or legacy app that never got enforced. Microsoft's 99% risk reduction applies where MFA is actually enforced.

### Which foundation supports which control

| Foundation | Supports | Why |
|---|---|---|
| **Vulnerability Management & SLAs** | SAST, SCA, Cloud posture, DAST, Pen test / bounty | Everything that produces *findings*. Without triage, ownership, and SLAs, findings become backlog, not fixes. |
| **Security Champions** | SAST, Threat modeling, RBAC audit, Pen test / bounty, Secure defaults | Work that needs an embedded owner in each team: triage, running threat models, fixing authorization in their own services, adopting the paved road. |
| **Secure Coding Training** | SAST, DAST, Secure defaults | Developers who understand the finding fix it correctly, and know to use the paved road. |
| **Inventory, Risk Classification & Coverage Metrics** | MFA, Secrets, RBAC audit, WAF, Cloud posture, Data protection, Detection | Estate-wide controls. You can't enforce, protect, monitor, or classify what you don't know exists. |
| **Detection** (a regular control) | Incident Response | IR only limits loss once something is detected. |

## 2. The catalog, by SAMM business function

"Status" compares with today's 10 controls. Ramp months and "helps shipped code" are captured now for D; C ignores them.

### Governance

| Control | Status | Type | Effect | BSIMM16 | SAMM v2 | Ramp (D) |
|---|---|---|---|---|---|---|
| **Secure Coding Training** | Converted | Foundation | Boosts SAST, DAST, Secure defaults | T1.1, T1.7, T2.9 | Education & Guidance / Training and Awareness | 3 |
| **Security Champions Program** | New | Foundation | Boosts SAST, Threat modeling, RBAC, Pen test, Secure defaults | SM2.3, T2.5, T3.6 | Education & Guidance / Organization and Culture | 4 |
| **Inventory, Risk Classification & Coverage Metrics** | New | Foundation | Boosts MFA, Secrets, RBAC, WAF, Cloud, Data protection, Detection | SM3.1, AA1.4, CMVM2.3 | Threat Assessment / Application Risk Profile + Strategy & Metrics / Measure and Improve | 2 |

### Design

| Control | Status | Mitigates (rated) | Needs | BSIMM16 | SAMM v2 | Ramp (D) | Helps shipped code (D) |
|---|---|---|---|---|---|---|---|
| **Threat Modeling & Security Requirements** | Expanded | Design flaw 70%, IDOR/authz 40%, Privilege escalation 30% | Champions | AA1.2, AM2.1, SR1.3 | Threat Assessment / Threat Modeling + Security Requirements / Software Requirements | 6 | No (new designs) |
| **Secure Defaults & Paved Roads** | New | Code injection 75%, XSS 75%, IDOR/authz 50%, Misconfiguration 30%, Secret leak 30% | Champions, Training | SFD1.1, SFD2.1, SFD3.2 | Secure Architecture / Architecture Design + Technology Management | 6 | No (new or migrated code) |
| **MFA & Auth Hardening** | Kept | Credential stuffing 85%, Account takeover 80% | Inventory | SFD1.1, SR1.1, AA1.1 | Security Requirements / Software Requirements | 3 | Yes |

### Implementation

| Control | Status | Mitigates (rated) | Needs | BSIMM16 | SAMM v2 | Ramp (D) | Helps shipped code (D) |
|---|---|---|---|---|---|---|---|
| **SCA & Supply Chain Integrity** | Expanded (adds SBOM, pinning, malicious-package detection) | Dependency CVE 80%, **Malicious package 60%** (new threat) | Vuln mgmt | SR1.5, SR2.7, SE3.6 | Secure Build / Software Dependencies | 1 | Yes |
| **Secrets Management & Push Protection** | Expanded (adds push-blocking secret scanning) | Secret leak 85% | Inventory | SE3.9, SFD1.1 | Secure Deployment / Secret Management | 4 | Partly (rotation) |
| **Vulnerability Management & SLAs** | New | Foundation: boosts SAST, SCA, Cloud, DAST, Pen test | none | CMVM1.3, PT1.2, CMVM3.1 | Defect Management / Defect Tracking (level 3: enforce an SLA) | 2 | n/a |

### Verification

| Control | Status | Mitigates (rated) | Needs | BSIMM16 | SAMM v2 | Ramp (D) | Helps shipped code (D) |
|---|---|---|---|---|---|---|---|
| **SAST Pipeline Scanning** | Kept | Code injection 70%, XSS 60% | Vuln mgmt, Champions, Training | CR1.4, CR2.6, CR1.5 | Security Testing / Scalable Baseline | 3 | Yes |
| **DAST & API Security Testing** | New | XSS 50%, Code injection 40%, IDOR/authz 30%, Misconfiguration 30% | Vuln mgmt, Training | ST1.4, ST2.6, ST2.5 | Security Testing / Scalable Baseline | 2 | Yes |
| **Pen Testing, Bug Bounty & VDP** | New | IDOR/authz 50%, Privilege escalation 50%, Design flaw 40%, Code injection 40%, Account takeover 30% | Vuln mgmt, Champions | PT1.1, PT2.3, CMVM3.4, CMVM2.4 | Security Testing / Deep Understanding | 2 | Yes |
| **RBAC & Authorization Audit** | Kept | IDOR/authz 80%, Privilege escalation 70% | Inventory, Champions | AA1.1, SFD2.1, ST1.3 | Requirements-driven Testing / Control Verification | 4 | Yes |

### Operations

| Control | Status | Mitigates (rated) | Needs | BSIMM16 | SAMM v2 | Ramp (D) | Helps shipped code (D) |
|---|---|---|---|---|---|---|---|
| **WAF, Bot & DDoS Protection** | Kept (adds bot management) | DDoS 85%, Credential stuffing 40%, Code injection 30%, Dependency CVE 20% | Inventory | SE1.1, SE1.2 | Environment Management / Configuration Hardening | 1 | Yes |
| **Container & Cloud Posture** | Expanded (adds IaC scanning and CSPM) | Vulnerable container 80%, **Misconfiguration 75%** (was 60%), Dependency CVE 30% | Vuln mgmt, Inventory | SE1.3, SE2.7, CMVM3.5 | Environment Management / Configuration Hardening | 2 | Yes |
| **Data Protection** (tokenization, encryption, minimization) | New: limits impact | Breach 25%, Code injection 20%, IDOR/authz 20%, Privilege escalation 20%, Secret leak 15% (lowered: IBM 2025 puts encryption at about −$208K, or about 5% of breach cost; tokenization and minimization do more where the data is actually removed) | Inventory | CP2.1, CP1.2, AM1.2 | Operational Management / Data Protection | 4 | Yes |
| **Security Logging, Monitoring & Detection** | New: limits impact | Breach 40%, Credential stuffing 20%, Account takeover 20%, **10% on every incident** | Inventory | SE1.1, SE3.3, CMVM1.2 | Incident Management / Incident Detection | 3 | Yes |
| **Incident Response Plan** | Kept | Breach 60%, **15% on every incident** | **Detection** | CMVM1.1, CMVM1.4, CMVM3.3 | Incident Management / Incident Response | 2 | Yes |

Framework honesty notes, for the facilitator guide:

- **Not named by either framework:** MFA, WAF/bot/DDoS, and tokenization. Both are process models, so these map to general practices. Push-blocking secret scanning is also absent; SAMM's Secret Management stream is the closest fit.
- **Remediation SLAs:** BSIMM has no activity for internal remediation SLAs (its SLA activities are about vendor contracts). SAMM does have one (Defect Management, level 3).
- **Recheck in 2027:** BSIMM17 is likely around February 2027, and activity IDs sometimes move.

## 3. Costs (benchmarked)

Baseline is per 100 people (about 50 engineers), scaled by headcount as today. Setup dollars are now mostly $0. The exceptions:

| Control | Setup $ | What it pays for |
|---|---|---|
| MFA | $5K | Hardware keys |
| Threat modeling | $5K | Coaching |
| Incident Response | $5K | Tabletop facilitation |
| RBAC audit | $2K | External review |
| Pen test / bounty | $25K | First engagement |

| Control | Setup $K | Monthly $K | Setup EW | Monthly EW | OrbitPay (120 / 6 mo) | MediSecure (80 / 12 mo) | RetailRush (200 / 18 mo) | Was (baseline) |
|---|---|---|---|---|---|---|---|---|
| SAST | 0 | 1.5 | 3 | 0.4 | $11K / 6 EW | $14K / 6 EW | $54K / 20 EW | 5 + 3/mo, 4 + 0.5 EW |
| SCA & supply chain | 0 | 1.25 | 2 | 0.3 | $9K / 5 EW | $12K / 4 EW | $45K / 15 EW | 2 + 2/mo |
| Secrets & push protection | 0 | 1.8 | 8 | 0.3 | $13K / 12 EW | $17K / 9 EW | $65K / 27 EW | 10 + 1.5/mo, 6 EW |
| MFA & auth hardening | 5 | 0.6 | 5 | 0.2 | $9K / 7 EW | $11K / 6 EW | $27K / 17 EW | 5 + 1/mo, 6 EW |
| Threat modeling & requirements | 5 | 0.5 | 3 | **0.5** | $9K / 7 EW | $10K / 7 EW | $23K / 24 EW | monthly EW 1.0 → 0.5 (high-risk features only; approved 2026-10-12) |
| Secure defaults & paved roads | 0 | 0 | 10 | 0.5 | $0K / 16 EW | $0K / 13 EW | $0K / 38 EW | new |
| RBAC & authz audit | 2 | 0 | 8 | 0.3 | $2K / 12 EW | $2K / 9 EW | $2K / 27 EW | $5K setup |
| WAF, bot & DDoS | 0 | 0.75 | 1.5 | 0.2 | $5K / 3 EW | $7K / 3 EW | $27K / 10 EW | 5 + **4/mo** (about 10× too high) |
| Container & cloud posture | 0 | 2 | 3 | 0.4 | $14K / 6 EW | $19K / 6 EW | $72K / 20 EW | 3 + 2.5/mo |
| DAST & API testing | 0 | 2.25 | 3 | 0.4 | $16K / 6 EW | $22K / 6 EW | $81K / 20 EW | new |
| Pen test, bounty & VDP | 25 | 0.8 | 2 | 0.3 | $31K / 5 EW | $33K / 4 EW | $54K / 15 EW | new |
| Data protection | 0 | 1 | 8 | 0.2 | $7K / 11 EW | $10K / 8 EW | $36K / 23 EW | new |
| Logging, monitoring & detection | 0 | 2.5 | 6 | 0.5 | $18K / 11 EW | $24K / 10 EW | $90K / 30 EW | new |
| Incident response | 5 | 0.3 | 3 | 0.2 | $7K / 5 EW | $8K / 4 EW | $16K / 13 EW | unchanged |
| Vuln management & SLAs | 0 | 1 | 4 | 0.5 | $7K / 8 EW | $10K / 8 EW | $36K / 26 EW | new |
| Security champions | 0 | 0.8 | 3 | 0.6 | $6K / 8 EW | $8K / 8 EW | $29K / 28 EW | new |
| Secure coding training | 0 | 1 | 1 | 0.5 | $7K / 5 EW | $10K / 6 EW | $36K / 20 EW | 3 + 1/mo, 0.3 EW/mo (now includes learner time) |
| Inventory & coverage metrics | 0 | 0.5 | 5 | 0.3 | $4K / 8 EW | $5K / 7 EW | $18K / 21 EW | new |

Benchmark anchors (2025–26; [P] = published price, [3P] = buyer-reported or aggregator data, [E] = estimate):

- **SAST and SCA:** about $30 per contributor per month (Semgrep, GitHub Code Security) [P]
- **Secret push protection:** $19 per committer per month (GitHub) [P]
- **WAF:** Cloudflare Business about $200/month [3P]
- **CSPM:** Wiz Essential about $24K/year, which also covers container images [3P]
- **DAST:** StackHawk about $25–30K/year [3P]
- **Pen test:** $10–35K per web app or API engagement [3P]
- **Managed VDP:** about $8–12K/year [3P]
- **SIEM/MDR:** $20–40K/year typical [3P]
- **ASPM/vuln management:** $8–15K/year for a bundled tool [E]
- **Training:** $195–325 per learner per year (Security Journey) [P]
- **Champions:** 1 per 8–20 developers at 10–20% time [3P]

## 4. Threat check

Every new control maps onto existing threats, plus **one new threat**:

| New incident | Threat | Severity | Base $K | Covered by | Draft likelihood (OrbitPay / MediSecure / RetailRush) |
|---|---|---|---|---|---|
| **Malicious Package in the Build**: a typosquatted or compromised dependency ran in CI and exfiltrated build secrets | supply_chain | critical | 300 | SCA & supply chain 60%, plus Detection and IR containment | 0.08 / 0.08 / 0.12 |

That makes 14 threats and 14 incident cards: today's 8, plus the 5 from the C draft, plus this one.

## 5. Practitioner evidence for the ratings

Primary sources were read directly unless marked **[secondary]**. Vendor-run studies are labeled.

| Topic | Data point | Source | How it's used |
|---|---|---|---|
| Vuln management | Only **48%** of pentest findings ever get resolved (69% of serious ones). Median time to resolve is 67 days, even though 75% of orgs set a 2-week SLA. | Cobalt State of Pentesting 2025 | The −50% penalty. Note that an SLA on paper isn't the control; ownership and capacity are. |
| Vuln management | Leaders fix **>10%** of flaws a month, laggards **<1%**. 74% of orgs carry security debt older than a year. | Veracode SoSS 2025 | Same scanner, 10× different outcome. Strongest support for a multiplier. |
| Inventory | **35%** of breaches involved shadow data, costing 16% more and taking 26% longer to identify. | IBM Cost of a Data Breach 2024 | The −35% penalty |
| Inventory | Only 12–19% of orgs are "very confident" their API inventory is accurate. | Salt Security, vendor survey | Supports the penalty |
| Champions | No controlled study found. In BSIMM10, 86% of top firms had a champions network vs. 0% of the bottom 10, which is correlational **[secondary]**. A 2023 SAMM case study found champions lacked support. | BSIMM10; Ruhr-Uni Bochum 2023 | Adoption booster, not a loss reducer. The smallest credible penalty. |
| Training | Evidence is weak and vendor-run: flaw half-life of 5 months vs. 12.6 with Veracode Security Labs (correlational). Secure Code Warrior's "53% fewer vulnerabilities" is not peer-reviewed. | Veracode SoSS 2025; SCW | Why training became a foundation (−15%) instead of a direct 30% control |
| Detection | Breaches identified and contained in under 200 days cost $3.87M vs. $5.01M. Breaches found internally cost $4.18M vs. $5.08M when the attacker disclosed them. AI and automation saved $1.9M and 80 days. | IBM 2025 | Detection 40% vs. breach plus 10% containment on everything, as an independent control |
| MFA | MFA cuts compromise risk by **99.2%** (98.6% with leaked credentials). | Microsoft Research, Meyer et al. 2023 | 85% is deliberately conservative, accounting for coverage gaps and phishable factors (hence the inventory dependency) |
| Credential stuffing | A median **19%** of daily authentication attempts are credential stuffing. Stolen credentials were the initial vector in 22% of breaches. | Verizon DBIR 2025 | Backs the high stuffing likelihoods in the registers |
| Humans vs. tools | Missing access control is the #2 pentest finding. Scanners "completely overlooked" logic-flaw classes. No published split of human- vs. tool-found criticals. | Cobalt 2025; Doupé et al., DIMVA 2010 | Pen test is the strongest control against authz and design flaws. Don't quote a percentage split on stage. |
| Secure defaults | Memory-safety bugs fell from 76% to 24% of Android vulnerabilities (2019–2024). Google's safe-coding frameworks "nearly eliminated" XSS and SQLi. | Google Security Blog 2024; Kern, CACM 2024 | Supports 75% class elimination where *adopted*. Adoption is why it needs Champions and Training. |
| Data protection | Encryption is worth about −$208K per breach. Tokenization reduces PCI scope only if the PAN can't be retrieved. | IBM 2025; PCI SSC Tokenization Guidelines | Ratings lowered from 40% to 25% vs. breach |
| Supply chain | 704K malicious packages identified since 2019, up 156% year over year (Oct 2024); 845K by Q2 2025. 86% of codebases contain vulnerable open source; 64% of components are transitive. xz utils (CVE-2024-3094) was caught by chance. | Sonatype 2024/2025; Black Duck OSSRA 2025 | Justifies the new malicious-package threat and SCA's lower 60% against it |

## 6. What the prototype says calibration will need

> **Partly superseded by section 7.** These results assume every company starts from zero. With starting posture, the 1.5×-everywhere capacity and the 55% bar give way to per-company capacity and a 66% bar. The findings on the difficulty metric, the binding constraint, and dead cards still hold.

The prototype covers 18 controls, the C draft registers plus the supply-chain threat, and the recommended weighted penalties. Here is what it found:

1. **Engineer-weeks become the binding constraint.** Winning roadmaps often leave 15–45% of the dollar budget unspent but use 95–100% of capacity. That is realistic: small programs run out of people before money.
2. **At current capacity the foundations lesson fails.** Foundations cost about as many engineer-weeks as they give back.
3. **Capacity needs to be about 1.5× current.** At that level the best roadmaps reach 66 / 67 / 70%, the best roadmap without foundations scores 58 / 54 / 60%, and foundations are worth 8–13 points.

   | Company | Capacity now → 1.5× | What it means |
   |---|---|---|
   | OrbitPay | 36 → 54 EW | About 2.25 FTE over 6 months, which stretches "first hire plus borrowed time" |
   | MediSecure | 32 → 48 EW | About 1 FTE over 12 months |
   | RetailRush | 90 → 135 EW | About 1.9 FTE over 18 months |

   The 2–5 EW per month per 100 people band test would need to widen (OrbitPay would sit at 7.5). The alternative is trimming setup effort across the board. Dollar budgets could then come *down* so money binds too.
4. **The bar lands around 55%.** At 58%, MediSecure drops to 0.3% of full-budget roadmaps passing.
5. **The difficulty metric has to change.** With 18 controls there are 20–40K affordable roadmaps, mostly junk, so "3–15% of affordable roadmaps pass" stops meaning anything. Proposed test set:
   - the best roadmap clears the bar by 10–15 points
   - the best roadmap with no foundations **fails**
   - a band of pass share among *full-budget* roadmaps (where nothing more fits)
   - at least 20 distinct winners
   - no card in more than about 90% of winners unless the register justifies it
6. **Every card wins somewhere** (share of winning roadmaps at a 55% bar):

   | Card | OrbitPay | MediSecure | RetailRush | Note |
   |---|---|---|---|---|
   | MFA | 100% | | | Credential stuffing plus account takeover is a third of its expected loss |
   | Inventory | 94% | | | Because MFA needs it. Arguably the right lesson ("know what you have before you enforce MFA everywhere"), but close to mandatory. |
   | SCA | | 98% | | |
   | Vuln management | | 83% | | Dependency CVEs are its #1 risk |
   | WAF | | | 94% | |
   | Champions | 15% | 8% | 5% | Weak |
   | Threat modeling | 9% | 9% | 2% | Weak, because design flaws are only 3–5% of expected loss. That's a register question. |
   | Pen test | | 0% | | Its strengths (authz, logic) aren't MediSecure's top risks, and $33K is a third of its budget |
7. **MediSecure is still the hardest company** (1.0% of full-budget roadmaps pass). It needs its own tuning in the calibration step.

## 7. Starting posture

Each company now starts with some controls already running, so students plan against **current** risk, not a blank slate. This follows Mission 01's Evaluate protocol: assess what exists first.

### How it works

| State | Effect | Cost to the student | On screen |
|---|---|---|---|
| **In place** | Full rating, still subject to foundation penalties | Free (already in the run budget) | Pre-checked card, badged "In place" |
| **Partial** | 50% of rating. A partial foundation removes half of its penalty. | Free as is; **Upgrade** to full for half the control's cost | Badged "Partial", with an Upgrade button |
| **Not in place** | As before | Full cost | Normal card |

**Shelfware isn't a separate state.** It's an In-place control whose foundations are missing, and the card says so: *"In place, but delivering 35% of 70%. Missing: Vulnerability Management (−50%)."*

The register gains a column and reads like a real one: **inherent → current → target** expected loss. Readiness stays the share of *inherent* expected loss prevented, so what the company already has counts toward the score.

### Baselines (revised after review)

| Company | In place | Partial | Story |
|---|---|---|---|
| **OrbitPay** (startup) | none | **SAST** (CodeQL or Semgrep CE on some repos), **SCA** (Dependabot), **Secrets** (GitHub secret scanning; some teams use AWS Secrets Manager, others .env files), **MFA** (staff only), **WAF** (CDN free tier), **Cloud** (basic registry image scanning) | 120 people, mostly engineers, so free tools are everywhere, but there's **no coordination between teams, no tracking, and no definition of what security requires**. Six partial controls and zero foundations is shelfware at startup scale. |
| **MediSecure** (HIPAA) | **Data protection** (encryption at rest and in transit), **Pen test** (annual, because customers and auditors expect it) | **IR plan** (on paper, never exercised), **Inventory** (risk analysis of ePHI systems), **Training** (annual HIPAA awareness, not secure coding), **RBAC** (annual user-access review, not service authorization), **Detection** (audit logs kept and reviewed for the audit, not monitored) | **An annual internal audit against its HIPAA policy proves compliance to leadership, so everything the policy names exists on paper.** Pen test findings sit unfixed because nobody owns remediation. |
| **RetailRush** (PCI) | **SAST** (bought two years ago, now shelfware), **Pen test** (annual, for PCI) | **WAF** (log-only), **Detection** (logs collected, nobody watches), **MFA** (admins only), **Data protection** (processor tokenizes cards, customer PII is not), **Training** (annual awareness, not secure coding) | Plenty of spend, little effect. The re-platform's complexity also raises its logic-flaw likelihood to 0.35. |

### Prototype results: 66% bar (two-thirds of expected loss)

| Company | Capacity | Day one | Best | Best without funding a foundation | Full-budget roadmaps that pass | Winners |
|---|---|---|---|---|---|---|
| OrbitPay | **48 EW** (was 36) | 21% | 75% | 62%, fails | 5.4% | 1,055 |
| MediSecure | **34 EW** (was 26) | 26% | 74% | 64%, fails | 5.6% | 255 |
| RetailRush | **105 EW** (was 90) | 25% | 77% | 63%, fails | 4.0% | 134 |

Why **66% works better than 62%** with the revised baselines: the richer starting posture lifts no-foundation roadmaps to 62–64%. At a 62% bar they would pass at OrbitPay and MediSecure, and the foundations lesson would disappear. At 66% they fail at every company, the best roadmaps still clear the bar by 8–11 points, and about 4–6% of full-budget roadmaps pass everywhere.

What the capacities mean in staffing terms:

| Company | Capacity | Staffing story |
|---|---|---|
| **OrbitPay** | 48 EW over 6 months, about 1.85 FTE | The first AppSec hire plus most of a platform engineer on loan |
| **MediSecure** | 34 EW over 12 months | A half-time engineer (about 23 EW) plus two champions at about 12% (about 11 EW). Matches the existing story. |
| **RetailRush** | 105 EW over 18 months, about 1.35 FTE | Its two-person team at about 70% on roadmap work (the story says 60% today) |

What shows up in the winning roadmaps:

- **OrbitPay:**
  - 100% fund Inventory and 81% fund Vulnerability Management. Coordinating the tools they already have is the core move.
  - Upgrades are popular: MFA 92%, Secrets 54%, Cloud 52%.
  - The best roadmap upgrades four partial tools and adds DAST, pen testing, IR and two foundations.
- **MediSecure:** 100% fund Vulnerability Management and SCA, and 70% upgrade the paper IR plan.
- **RetailRush:** 80% fund Vulnerability Management. The best roadmap buys two new tools (SCA, IR) and two foundations, and upgrades MFA, the WAF and detection.
- **RetailRush's budget:** winners spend $160–190K of $350K. At $250K nothing changes (3.9% pass). At $200K it gets slightly harder (2.5%).

**Threat Modeling's run effort was halved** (1 → 0.5 EW per month per 100 people, high-risk features only; approved). Raising RetailRush's logic-flaw likelihood alone left it in 1% of winners, because the binding problem was its 42 EW cost. After the change it appears in **28% / 16% / 13%** of winners (OrbitPay / MediSecure / RetailRush), and difficulty is unchanged. The results table above includes the change.

### Citations

All of these were verified against the regulation text: 45 CFR on Cornell LII (it mirrors eCFR), the PCI DSS v4.0.1 Requirements and Testing Procedures (June 2024), and AICPA TSP Section 100.

| Baseline item | Driver | Status | Note for the facilitator |
|---|---|---|---|
| MediSecure **IR plan** (partial) | HIPAA 45 CFR 164.308(a)(6)(ii), response and reporting | Required | The rule requires procedures and documentation, not tabletop exercises. "On paper, never exercised" is plausibly compliant, and that's the point. |
| MediSecure **inventory** (partial) | 164.308(a)(1)(ii)(A), risk analysis | Required | The risk analysis covers ePHI systems, not an engineering service inventory. The HHS proposed rule (90 FR 898, Jan 2025) would require a written asset inventory and network map, but it is **not final**: it was moved to Long-Term Actions with a target of 07/2027. |
| MediSecure **data protection** (in place) | 164.312(a)(2)(iv) at rest and 164.312(e)(2)(ii) in transit | **Addressable** | Addressable doesn't mean optional (164.306(d)(3)): implement it or document why an alternative is reasonable. |
| MediSecure **pen test** (in place) | 164.308(a)(8), evaluation | Standard | **HIPAA does not explicitly require pen testing today.** So the story wording changes from "bought for compliance" to "bought because customers' security questionnaires and auditors expect it." The proposed rule would require annual pen tests if finalized. |
| MediSecure **annual internal audit** (story) | 164.308(a)(8), evaluation (periodic technical and nontechnical evaluation) | Standard | This is what the internal audit satisfies. Verified. |
| MediSecure **training** (partial) | 164.308(a)(5), security awareness and training | Standard; specifications addressable | Workforce awareness, not secure coding. Verified. |
| MediSecure **RBAC** (partial: annual user-access review) | 164.308(a)(4) information access management, especially (a)(4)(ii)(C) access establishment and modification; supports 164.312(a)(1) access control | Standard; (a)(4)(ii)(C) **Addressable** | The annual review partly meets these. HIPAA requires that access be reviewed but **sets no frequency**: "annual" is common practice, not a regulatory number. Verified (Cornell LII, current rule as amended 2013). |
| MediSecure **detection** (partial: logs reviewed only for the audit) | 164.312(b) audit controls (standard, no specifications); 164.308(a)(1)(ii)(D) information system activity review (**Required**, "regularly review"); 164.308(a)(5)(ii)(C) log-in monitoring (Addressable) | Mixed | Having logs meets 164.312(b). Reviewing them only for the annual audit is **weak against the intent** of (a)(1)(ii)(D), which sets no interval. Present it as a risk-based gap, not a clear violation. The 2025 proposed rule, not final, would add real-time monitoring and alerting (proposed 164.312(d)(2)(i)), which would make "logged but not monitored" a clear gap. Verified. |
| RetailRush **WAF** (partial: log-only) | PCI DSS 6.4.2 | Required since 31 Mar 2025 | 6.4.2 requires the solution to block attacks *or* raise alerts that are investigated right away. A log-only WAF nobody watches is **a PCI finding waiting to happen**. |
| RetailRush **detection** (partial) | PCI 10.4.1 daily log review; 10.4.1.1 automated review | 10.4.1.1 required since 31 Mar 2025 | "Logs collected, nobody watches" is a 10.4.1 gap. |
| RetailRush **MFA** (partial: admins only) | PCI 8.4.1 admin access into the CDE; 8.4.2 all non-console access into the CDE | 8.4.2 required since 31 Mar 2025 | PCI doesn't require *customer* MFA, which is what our MFA control mainly buys. Admin-only MFA satisfies 8.4.1 but may fall short of 8.4.2. |
| RetailRush **pen test** (in place) | PCI 11.4.1–11.4.3 | Required | At least every 12 months and after significant changes, by a qualified, independent tester |
| RetailRush **training** (partial) | PCI 6.2.2 developer training; 12.6.3 awareness training | Required | 6.2.2 requires *secure coding* training for developers of custom software every 12 months. An awareness-only course is **another latent PCI gap**. |
| RetailRush **data protection** (partial) | PCI SSC Tokenization Guidelines (2011), guidance only | n/a | Tokenization "may" reduce scope only if the merchant can't retrieve card numbers. The token vault stays in scope. |
| RetailRush **SAST, SCA** | PCI 6.3.2, inventory of custom software and third-party components | Required since 31 Mar 2025 | Supports SCA as an expected control for PCI shops |
| OrbitPay (SOC 2 window) | AICPA Trust Services Criteria CC6 (access), CC7 (operations and monitoring), CC8 (change management) | Outcome-based | **SOC 2 prescribes no specific controls.** MFA and SAST aren't named. The closest is the CC6.6 point of focus on additional authentication. That's why OrbitPay's starting point is near zero: nothing forced it to build controls yet. |

What this means for the story:

- **RetailRush's partial controls double as PCI gaps.** Upgrading the WAF, detection, MFA and training also closes likely QSA findings. That is a strong talking point ("compliant on paper isn't secure in practice"), and realistic: these are common QSA findings.
- **Two cautions before print:**
  - Re-check the HIPAA proposed rule's status on reginfo.gov and federalregister.gov.
  - If the guide quotes PCI word for word, download v4.0.1 from the PCI SSC library yourself and accept the license there. The agent used a university-hosted copy rather than accept a license on your behalf.


## 8. Decision log

1. **The multiplier:** weighted penalties (Vulnerability Management −50%, Inventory −35%, Champions −25%, Training −15%, Detection −50% for IR), MFA depends on Inventory, and no chains except IR → Detection. OK? The alternative is the simpler "half value without foundations".
2. **The foundation scope table** (section 1). This is where practitioner judgment matters most.
3. **Training becomes a pure foundation** and loses its own 30% against injection and XSS. The alternative is a hybrid that keeps a small direct effect.
4. **Champions are costed at net 0.6 EW per month,** against a benchmark of 2–4 EW per month of protected time. My reasoning: most champion time *is* the triage and fixing already counted in other controls' run costs. Counting all of it made champions a dead card (0–5% of winners). Even at 0.6 they win only 5–15% of the time, which is consistent with the thin evidence.
5. **Cost model simplifications kept:** linear scaling by headcount (real tools price per committer and have price floors), and no bundle discounts. Vendor consolidation could become a later teaching point.
6. **Capacity and bar:** superseded by item 12 (starting posture).
7. **Booth time:** 18 cards. At 375px the build screen needs collapsible SAMM-function groups and a per-card "delivering X of Y" line.
8. **D's brute force:** 20–40K affordable roadmaps times a start phase per control is far beyond exhaustive search. D's calibration will need sampling plus targeted checks rather than full enumeration. This affects how D's tests are written, not this catalog.
9. **Inventory is close to mandatory at OrbitPay** (94% of winners), via MFA. Keep it as the lesson, or drop MFA's inventory dependency and accept a weaker foundations lesson at OrbitPay.
10. **Data protection's ratings were lowered** to match IBM's encryption data (breach 40% → 25%).
11. **Starting posture:** revised after review (OrbitPay has free tools but no coordination; MediSecure has an annual internal HIPAA audit). See section 7.
12. **Bar 66% (two-thirds),** with capacity OrbitPay 48, MediSecure 34, RetailRush 105 EW, and RetailRush's budget at about $250K. All of this gets finalized in calibration.
13. **Threat Modeling's run effort:** 1 → 0.5 EW per month per 100 people (high-risk features only). ✅ Approved 2026-10-12.
14. **RetailRush staffing line:** "about 60% on roadmap work" → "about 70%", to match 105 EW. ✅ Approved.
15. **OrbitPay staffing line:** "plus borrowed platform engineering time" → "plus most of a platform engineer on loan". ✅ Approved. (MediSecure's line is unchanged: a half-time engineer plus two champions.)
16. **Tiers:** Mission success ≥66, Partial ≥55, Compromised ≥40, Failure <40. ✅ Approved.
17. **RetailRush budget:** $350K → $250K. ✅ Approved.
