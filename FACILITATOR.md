# Facilitator guide

## Intended experience

- Audience: security leaders, engineering managers, and anyone asked to "start an AppSec program"
- Time: about five minutes for Mission 01, five to eight for Mission 02, five for Mission 03
- Assistance: if an attendee stalls in Mission 02, point them back at the threat intel box
- Goal: understand what an AppSec program is made of, then practice the trade-offs of building one

## Answer key

### Mission 01: The Command Protocols

Attendees can answer without initiating every command, but the readiness meter rewards reading.

| Protocol | Correct answer | Teaching point |
|---|---|---|
| 01 Define | Build relationships with Engineering and identify shared goals | When Security is siloed, relationship-building comes before tools or process changes. |
| 02 Evaluate | Champions had no protected time because Engineering managers never agreed to the time ask | Champion programs fail from unprotected capacity, not lack of interest. |
| 03 Integrate | 72 hours | Critical + reachable + commoditized exploit is P0. Prioritize by reachability and exploit context, not severity alone. |
| 04 Measure | % of repos with SAST/SCA enabled, paired with false positive rate | Coverage without signal quality trains developers to ignore alerts. |

### Mission 02: The Resource Gauntlet

Each company is a separate, standalone scenario. Nothing carries over between them, and attendees play one per run (they can switch with **Change company**).

Each company faces a fixed set of five incidents that matches its threat intel.

#### How a roadmap is scored

- **No control is perfect.** Each initiative removes a share of the loss from the threats it addresses (shown on its card), for example SAST 70% of code injection, Secure Coding Training 30%.
- **Layered controls combine:** 1 − (1 − a)(1 − b). SAST plus training covers 79% of code injection, because each catches part of what the other misses. Adding the WAF takes it to 85%.
- **Incident response limits damage rather than preventing it:** 60% of a data breach's loss, and 15% containment on every other incident.
- **Readiness is the share of the company's projected loss, across all five incidents, that the roadmap prevented.** It follows dollars, so leaving a $600K breach uncovered scores worse than leaving a $120K IDOR uncovered.
- **The bar is 60%.** Even the best affordable roadmaps leave 26–32% of the projected loss behind. That is a talking point: you cannot buy down all risk.
- Each incident lands as **Threat neutralized** (75%+ mitigated), **Partially contained** (30–74%), or **Breach detected** (under 30%), with the controls in play and what would strengthen it.

About 5–8% of affordable roadmaps pass at each company. The best ones:

| Company | Timeline · budget · capacity | Staffing | Incidents | Best roadmap |
|---|---|---|---|---|
| OrbitPay (120 people) | 6 months · $90K · 36 eng-weeks | First AppSec hire plus borrowed platform time | API key leak, SQL injection, credential stuffing, IDOR, vulnerable container | SAST, Secrets Vault, MFA, Container Scanning: 68% ($81K, 32 eng-weeks). Layering Secrets, MFA, RBAC, WAF and Training reaches 69%. |
| MediSecure (80 people) | 12 months · $80K · 26 eng-weeks | Half-time security engineer plus two champions | Dependency CVE, IDOR, API key leak, vulnerable container, suspected breach | SCA, RBAC Audit, Secrets Vault, Incident Response Plan: 71% ($58K, 25 eng-weeks) |
| RetailRush (200 people) | 18 months · $350K · 90 eng-weeks | Two-person AppSec team, about 60% on roadmap work | DDoS, dependency CVE, SQL injection, credential stuffing, suspected breach | SCA, MFA, WAF, Secure Coding Training, Incident Response Plan: 74% ($319K, 69 eng-weeks) |

Common misses worth coaching: a secrets vault does not stop credential stuffing (MFA does, and WAF rate limiting helps), and training alone does not fix a SQL injection already in production. At OrbitPay, a roadmap without MFA and SAST will not hold.

#### Incident impact

Each incident shows its potential cost before it is assessed, the loss avoided when it is defended, and the loss when it gets through. Costs are scaled to each company: a baseline for a 100-person company (response, forensics, fraud, notification, downtime, lost revenue) × company size × sector exposure. OrbitPay is ×1.3 for payments fraud and PCI exposure, MediSecure ×1.5 for PHI breach notification and HIPAA penalties, and RetailRush ×1.0 because its exposure is downtime and revenue at scale. Starred incidents are in that company's deck.

| Incident | OrbitPay | MediSecure | RetailRush |
|---|---|---|---|
| Dependency vulnerability exploited | $620K | *$480K | *$800K |
| API key leaked to public repo | *$230K | *$180K | $300K |
| Credential stuffing | *$310K | $240K | *$400K |
| Broken access control (IDOR) | *$160K | *$120K | $200K |
| Vulnerable container deployed | *$90K | *$70K | $120K |
| DDoS traffic spike | $230K | $180K | *$300K |
| SQL injection in payment endpoint | *$390K | $300K | *$500K |
| Suspected data breach | $780K | *$600K | *$1.0M |
| **Whole deck, unprotected** | **$1.2M** (budget $90K) | **$1.4M** (budget $80K) | **$3.0M** (budget $350K) |

Readiness is computed from these dollar figures. The results screen also compares the loss taken with the program budget, which is the talking point: one bad incident usually costs more than the whole program.

Failed runs list the biggest gaps by dollars lost, each with the control that would strengthen it. **Rebuild roadmap** keeps the current selection.

### Mission 03: The Commander's Map

Correct checkpoint answer: **Pick the higher-impact initiative and defer the other.** A half-executed initiative is worse than a deferred one.

Locking the map also requires one initiative with every field filled in. **Start from my simulator roadmap** pre-fills the initiative, goal, and investment (dollars and engineer-weeks for that company's timeline) from Mission 02, and the attendee adds the metric, timeline, impact, and effort. The stack rank orders by impact (high first), then effort (low first):

- **Quick win**: impact higher than effort. Start here to build credibility.
- **Planned investment**: impact equals effort, moderate or high.
- **Fill-in**: low impact, low effort.
- **Reconsider**: effort higher than impact.

**Print my map** opens the browser print dialog with a clean, light-background table. Attendees can save it as a PDF.

## Booth reset

Use **Reset progress** in the header and confirm. This clears mission progress, the simulator selection, and the attendee's map from local browser storage. Reset between attendees on a shared station, because the map can contain details about the attendee's employer.

## Completion

The Hackers Challenge token is set in `ctfToken` in `js/config.js`. **The current value is a placeholder**: confirm it with the CTF organizers before deployment. The completion dialog has a copy button and does not submit the token or any completion data anywhere.

## Suggested facilitator close

> A program is not a tool purchase. Know your why, protect the people who scale security, prioritize by real risk, measure what drives action, and finish what you start.
