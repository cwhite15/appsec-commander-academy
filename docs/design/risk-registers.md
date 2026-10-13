# C: risk register draft for review (Phase 1)

Status: **reviewed 2026-10-12.** RetailRush's logic-flaw likelihood was raised to 0.35. Everything else stands as drafted. The calibration in section 3 is superseded by the control catalog draft (section 7, starting posture). Implementation pending. All numbers below were checked by brute-forcing every affordable roadmap in a prototype copy of the model (see `prototype/`).

Definitions used throughout:

- **Likelihood** = the probability that this incident happens at **full impact** within the company's timeline (6 / 12 / 18 months). It is *not* the chance that the weakness exists.
- **Impact** = existing formula: base × headcount/100 × sector multiplier, rounded to $10K.
- **Expected loss (EL)** = likelihood × impact. **Inherent** = with no controls. **Residual** = after the roadmap.
- **Readiness** = 1 − residual EL / inherent EL.

## 1. New incident cards

Base impact is for a 100-person company, as with the existing cards.

| id | Threat | Title | Description | Severity | Base $K | OrbitPay | MediSecure | RetailRush |
|---|---|---|---|---|---|---|---|---|
| `xss` | xss | Stored XSS in Support Console | A customer pasted a script into a support ticket. When an agent opened it, the script ran in the agent's session and quietly exported customer records. | high | 120 | $190K | $140K | $240K |
| `account_takeover` | account_takeover | Account Takeover via Password Reset | Attackers abused a password-reset flow with no rate limit and long-lived tokens to take over customer accounts, then changed their email and payout details. | high | 180 | $280K | $220K | $360K |
| `design_flaw` | design_flaw | Business Logic Flaw in a New Feature | A feature shipped without anyone asking how it could be abused. Replaying one request let a user apply the same credit, refund, or approval over and over. | high | 200 | $310K | $240K | $400K |
| `privilege_escalation` | privilege_escalation | Privilege Escalation to Admin | A profile-update API accepted a role field it never meant to expose. A regular user set themselves to admin and could see every customer's data. | critical | 220 | $340K | $260K | $440K |
| `misconfiguration` | misconfiguration | Production Debug Endpoint Exposed | A deployment manifest shipped with a debug endpoint and the cluster dashboard open to the internet. Scanners found it within a day. | high | 180 | $280K | $220K | $360K |

Initiatives that cover them (existing effectiveness, unchanged): XSS ← SAST 60%, training 30%. Account takeover ← MFA & auth hardening 80%. Design flaw ← threat modeling 70%. Privilege escalation ← RBAC 70%. Misconfiguration ← container scanning 60%. IR contains 15% of every incident.

## 2. Risk registers

Crown jewels are marked ★ (the top 5 by inherent EL, which is also the proposed incident run).

### OrbitPay: 6 months, 120 people, ×1.3 (payments/PCI). Inherent EL $856K

Threat intel: high transaction volume, PII handling, cloud-native architecture. No security team until now.

| Rank | Incident | Likelihood | Impact | Inherent EL | Share | Rationale |
|---|---|---|---|---|---|---|
| ★1 | Credential stuffing | 0.60 | $310K | $186K | 22% | Consumer payment logins are a prime stuffing target, and high transaction volume hides the attempts in normal traffic. |
| ★2 | SQL injection in payment endpoint | 0.35 | $390K | $137K | 16% | Payment endpoints were built fast with no SAST, and a SOC 2 readiness pentest is likely to find one. |
| ★3 | API key leaked to public repo | 0.55 | $230K | $127K | 15% | Many AWS microservices and no vault, so keys live in code and CI. One push is enough. |
| ★4 | Account takeover via password reset | 0.35 | $280K | $98K | 11% | Stored payout details make takeover pay, and the reset and session flows haven't been hardened. |
| ★5 | Broken access control (IDOR) | 0.45 | $160K | $72K | 8% | API-first microservices. Broken object-level authorization is the most common API flaw. |
| 6 | Production debug endpoint exposed | 0.15 | $280K | $42K | 5% | Cloud-native with no security review of manifests, but the platform team owns the infrastructure. |
| 7 | Suspected data breach | 0.05 | $780K | $39K | 5% | A full breach within 6 months is unlikely, but costly. |
| 8 | Dependency vulnerability exploited | 0.06 | $620K | $37K | 4% | Young codebase on current frameworks, and only a 6-month window. |
| 9 | Vulnerable container deployed | 0.40 | $90K | $36K | 4% | Ships often with no image scanning. Likely, but a small loss. |
| 10 | Privilege escalation to admin | 0.08 | $340K | $27K | 3% | Few internal roles yet, and the admin tooling is small. |
| 11 | Business logic flaw | 0.08 | $310K | $25K | 3% | Payment logic is new, but little ships in 6 months. |
| 12 | Stored XSS | 0.10 | $190K | $19K | 2% | Mostly an API back end with a thin customer UI. |
| 13 | DDoS traffic spike | 0.05 | $230K | $12K | 1% | Not a peak-traffic business. |

### MediSecure: 12 months, 80 people, ×1.5 (PHI/HIPAA). Inherent EL $726K

Threat intel: PHI exposure risk, regulated industry, architecture in transition (monolith → microservices).

| Rank | Incident | Likelihood | Impact | Inherent EL | Share | Rationale |
|---|---|---|---|---|---|---|
| ★1 | Dependency vulnerability exploited | 0.45 | $480K | $216K | 30% | The legacy monolith carries years of unpatched dependencies while attention is on the migration. |
| ★2 | Suspected data breach | 0.20 | $600K | $120K | 17% | Healthcare is a top ransomware and extortion target, and PHI sells. |
| ★3 | Privilege escalation to admin | 0.30 | $260K | $78K | 11% | The role model is rebuilt service by service, so clinician, admin, and support roles drift during the migration. |
| ★4 | API key leaked to public repo | 0.40 | $180K | $72K | 10% | Every new service needs credentials, and migrations copy them into configs and scripts. |
| ★5 | Broken access control (IDOR) | 0.50 | $120K | $60K | 8% | New service boundaries move authorization checks. Patient-record APIs are the classic IDOR. |
| 6 | Production debug endpoint exposed | 0.25 | $220K | $55K | 8% | New Kubernetes infrastructure stood up by a team that is new to it. |
| 7 | Business logic flaw | 0.12 | $240K | $29K | 4% | New services, but mostly re-implementing existing behavior. |
| 8 | Vulnerable container deployed | 0.40 | $70K | $28K | 4% | Brand-new images with no scanning. Frequent, but the loss is contained. |
| 9 | Credential stuffing | 0.08 | $240K | $19K | 3% | Mostly clinician logins behind SSO, plus a small patient portal. |
| 10 | Account takeover via password reset | 0.08 | $220K | $18K | 2% | SSO for clinicians limits takeover. |
| 11 | SQL injection | 0.05 | $300K | $15K | 2% | A mature ORM in the monolith, reused by the new services. |
| 12 | Stored XSS | 0.08 | $140K | $11K | 2% | Mostly internal-facing UIs. |
| 13 | DDoS traffic spike | 0.03 | $180K | $5K | 1% | Not a traffic-driven business. |

### RetailRush: 18 months, 200 people, ×1.0 (downtime/revenue). Inherent EL $1.76M (was $1.7M before the logic-flaw change)

Threat intel: legacy code, traffic spikes, revenue-critical uptime. Two peak seasons in the window.

| Rank | Incident | Likelihood | Impact | Inherent EL | Share | Rationale |
|---|---|---|---|---|---|---|
| ★1 | Dependency vulnerability exploited | 0.50 | $800K | $400K | 24% | Legacy frameworks over 18 months. Known-CVE exploitation is the likeliest big hit. |
| ★2 | Credential stuffing | 0.70 | $400K | $280K | 17% | Stored cards, loyalty points, and gift cards make retail a prime target, and the peaks bring cover traffic. |
| ★3 | SQL injection | 0.40 | $500K | $200K | 12% | Hand-built SQL in legacy code that is being replaced, not fixed. |
| ★4 | Suspected data breach | 0.20 | $1.0M | $200K | 12% | Card and customer data at 200-person scale over 18 months. |
| ★5 | DDoS traffic spike | 0.65 | $300K | $195K | 12% | Two peak seasons in the window, and extortion DDoS targets peaks. |
| 6 | Business logic flaw | **0.35** (was 0.20, raised in review) | $400K | $140K | 8% | A 200-person re-platform rebuilds checkout, promotions, and refunds across many teams. That complexity breeds design flaws such as coupon stacking and refund replay. |
| 7 | Account takeover via password reset | 0.25 | $360K | $90K | 5% | Gift card and loyalty balances can be cashed out. |
| 8 | Stored XSS | 0.30 | $240K | $72K | 4% | Legacy front end with a lot of user content (reviews, Q&A). |
| 9 | API key leaked to public repo | 0.15 | $300K | $45K | 3% | A larger team with an established ops practice. |
| 10 | Production debug endpoint exposed | 0.12 | $360K | $43K | 3% | A new platform, but run by an established ops team. |
| 11 | Broken access control (IDOR) | 0.15 | $200K | $30K | 2% | Order-history and address APIs. |
| 12 | Vulnerable container deployed | 0.20 | $120K | $24K | 1% | The new platform will be containerized. Small loss. |
| 13 | Privilege escalation to admin | 0.05 | $440K | $22K | 1% | Few user roles, and the admin side is internal. |

### Crown jewels and what changes in the run

| Company | Top 5 by EL (proposed run) | Share of inherent EL | vs. current deck |
|---|---|---|---|
| OrbitPay | cred stuffing, SQLi, secret leak, account takeover, IDOR | 72% | Account takeover **replaces** vulnerable container |
| MediSecure | dependency CVE, breach, privilege escalation, secret leak, IDOR | 75% | Privilege escalation **replaces** vulnerable container |
| RetailRush | dependency CVE, cred stuffing, SQLi, breach, DDoS | 76% | Unchanged |

## 3. Calibration: the 60% bar does not survive whole-landscape scoring

Scoring all 13 threats adds a long tail that no affordable roadmap covers, so the best achievable readiness drops from 69–74% to 64–68%. At 60%, OrbitPay and MediSecure fall below the 3% floor:

| Option | OrbitPay pass share | MediSecure | RetailRush | Notes |
|---|---|---|---|---|
| Bar 60%, no resource changes | 2.6% ✗ | 1.5% ✗ | 3.9% | Fails the 3–15% test. MediSecure only has 3 winners whatever I do to its likelihoods. |
| Bar 60%, MediSecure $90K / 32 EW | 2.6% ✗ | 2.7% ✗ | 3.9% | More resources add more losing roadmaps too. |
| Bar 57%, no resource changes | 6.8% | 3.4% | 8.1% | Passes, but MediSecure is fragile: one likelihood edit could break it. |
| **Bar 58%, MediSecure 26 → 32 EW (recommended)** | **5.5%** | **4.1%** | **7.2%** | Best roadmaps 65 / 66 / 68%. |
| Bar 55%, no resource changes | 11.0% | 5.9% | 11.0% | Most headroom, but noticeably easier. |

The case for MediSecure at 32 EW: a half-time engineer is about 23 EW a year (≈46 working weeks × 0.5), and two champions at 10% add about 9 EW, so 32 EW is closer to the existing staffing story than 26 is. It is 3.3 EW per month per 100 people, inside the 2–5 band.

Best roadmaps under the recommendation:

| Company | Best | Runner-up | Current facilitator example |
|---|---|---|---|
| OrbitPay | SAST + SCA + Secrets + MFA + IR: 65% ($83K / 36 EW) | SAST + Secrets + MFA + Training + IR: 63% | SAST + Secrets + MFA + Container: 60% (still passes) |
| MediSecure | SCA + MFA + RBAC + IR + Container: 66% ($76K / 29 EW) | SCA + Secrets + MFA + RBAC + IR: 65% | SCA + RBAC + Secrets + IR: 62% (still passes) |
| RetailRush | SCA + MFA + WAF + Training + IR: 68% ($319K / 69 EW) | SCA + Secrets + MFA + WAF + IR: 67% | Same as best: 68% (still passes) |

## 4. How to choose the 5-incident run

**Recommend (a): the top 5 by inherent expected loss**, derived from the register (drop `incidentIds`, so the register is the only source of truth), with ties broken by impact and then id.

- It is deterministic, so facilitators can predict it and tests can pin it.
- It covers 72–76% of each company's inherent EL, so the run explains most of the score.
- It *is* the crown-jewel list, which is the lesson.
- Against (b), a seeded draw by likelihood: the draw would pull tail cards (a DDoS at MediSecure) as often as reality would, which teaches the wrong thing in a single play, and a fixed seed is a hidden answer key that is harder to explain.
- Option (c), the top 4 plus one tail card labeled "the one you didn't see coming", would make the long tail tangible. It is a nice idea but adds a rule to explain; consider it for later.

## 5. Practitioner flags (review decisions)

1. **The bar moves from 60% to 58%** (section 3). The message changes slightly: "you can't buy down all risk, and the long tail is why."
2. **Incident Response is in nearly every winning roadmap** (21/25 at OrbitPay, 11/11 at MediSecure, 23/24 at RetailRush). Its 15% containment now touches 13 threats, and breach is IR-only. Lowering containment to 10% did not change this. It is defensible (HIPAA's Security Rule requires incident procedures), but IR becomes the "always pick" card. Accept it, or make it a coaching point.
3. **Threat modeling is undervalued.** Design flaws are only 3–5% of EL everywhere, so threat modeling almost never makes a winning roadmap. That is arguably right for 6–18 months against already-shipped code (and D handles it properly with ramp time), but practitioners may object. If you want it viable at RetailRush (re-platform), raise its design-flaw likelihood to around 0.35.
4. **Container scanning vs. misconfiguration (60%)** assumes the tool scans manifests and IaC as well as images (Trivy or Checkov style). Cloud posture (for example, a public S3 bucket) isn't modeled, so the card is a debug endpoint in a manifest instead of the iconic open bucket.
5. **The run and the score can disagree.** Pass/fail comes from the register, and passing roadmaps neutralize only 2–4 of the 5 cards shown. The results screen must show both: "this year's five incidents cost $X; your residual expected loss across the register is $Y."
6. **Live readiness on the build screen.** If the register view shows total readiness live, the mission becomes "toggle until it reads 58%". Recommendation: show inherent → residual bars per threat and the total residual EL live (that *is* how a program lead uses a register), but no pass/fail indicator until launch.
7. **The likelihood definition must be visible.** "Probability of this loss at full impact within the timeline," so 0.55 for a secret leak at OrbitPay doesn't read as "a 55% chance a key ever leaks" (that is near-certain). This goes in a line under the register table and in FACILITATOR.md.
8. **Close calls in the top 5:** MediSecure's #5 IDOR ($60K) vs. #6 misconfiguration ($55K). A small likelihood edit swaps the run card. That's fine, but tests will pin it.
9. **All likelihoods are my estimates from the threat intel**, not industry data. If any must be defensible on stage, I'd tie the big ones (stuffing in retail and fintech, healthcare breach rates) to a named report before the booth.
