# Facilitator guide

## Intended experience

- Audience: security leaders, engineering managers, and anyone asked to "start an AppSec program"
- Time: about five minutes for Mission 01, ten to fifteen for Mission 02 (an estimate for 18 cards, start months, and the register; re-check after a booth playthrough), five for Mission 03
- Assistance: if an attendee stalls in Mission 02, point them at the risk register and at any card that says "Missing:"
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

Each company is a separate, standalone scenario. Nothing carries over between them, and attendees play one per run (they can switch with **Change company**). The design specs behind this mission, including the full research notes, are in [`docs/design/`](docs/design/).

#### The flow

1. **Choose a company.** Each card shows its timeline, budget, team time (*"Team time 48 eng-weeks (≈1.8 people full-time)"*; MediSecure ≈0.7, RetailRush ≈1.3), staffing, and a one-line starting posture. The brief beside the cards lists the steps, from *"Read the risk drivers and the starting posture"* to *"Remove at least 62% of the register's expected loss"*.
2. **Build.** The build screen opens with the company's **Risk drivers** and starting posture, then groups 18 controls under the five OWASP SAMM business functions. Each card shows:
   - its posture: **In place**, **Partial** (**Upgrading to full** once funded), or nothing
   - **Cuts loss from:** the threats it's rated against, *"(fully ramped, with its foundations)"*
   - what it delivers by the end, such as *"By month 18: cuts loss from injection by 24% (of a possible 70%). Missing: Vulnerability Management (−50%), Security Champions (−25%), Secure Coding Training (−8%)."* An unfunded card says *"If funded now: would cut loss from X by A% (of a possible B%) at full strength."* That figure includes missing foundations and the new-code cap, so it matches what the card says once funded and fully ramped. The "(of a possible B%)" is dropped whenever the control delivers its full rating. A partial control that isn't being upgraded says *"As is (partial), by month 18: …"*. A funded control that isn't fully ramped adds *"Still ramping (92%)."* Threat Modeling and Secure Defaults add *"Protects new code only: about 70% of RetailRush's exposure is in code written during the 18 months (an estimate)."*
   - on a foundation, what it holds up instead: *"Supports X, Y and Z. Without it, each delivers 50% less (25% less while it's only partial)."*
   - how long it takes to ramp up, in calendar months: *"Starts month 7 · fully ramped from month 11."*, *"Upgrade starts month 1 · fully ramped in month 1."*, or *"Starts month 13 · 92% ramped when the timeline ends."* The cards say "fully ramped", not "full strength", because a fully ramped control still delivers less without its foundations (changed 2026-10-20). (Fixed 2026-10-15: a control whose full-strength point fell exactly on the last month, such as RetailRush's Threat Modeling started in month 13 with its 6-month ramp, used to be labelled full strength although the score counts it at 92%.)
   - the cost: *"$19K · 20.4 eng-weeks, starting month 7"*, or *"$0 (team time only)"* when there's no dollar cost. A card that can't be funded says why, after *"Doesn't fit:"*: *"not enough budget left"*, *"not enough eng-weeks left in any phase"*, or *"budget and eng-weeks don't fit at one start"*.

   Funding a card places it at the earliest start month that still fits, and a **Start in month (1 = now)** picker under the card (1, 4, 7, 13, where the timeline allows) moves it. Months that no longer fit are greyed out. The **Resource Bay** panel follows the attendee as they scroll on a desktop (it scrolls on its own when it's taller than the screen). From top to bottom it shows:
   - **Your score // Risk removed or mitigated:** the live readiness percentage, with a meter and a marker at 62%. Under the meter: "Pass at 62% · 9 points to go · OrbitPay started at 21%" ("Passing (62% needed) · RetailRush started at 25%" once it clears the bar). Below that, one line says what the score measures and what raises it: fund controls, cover their foundations, and start them early. It also gives the during and handover percentages the score blends.
   - the budget (*"Tools and services. Your team's time is counted separately, in engineer-weeks."*), and engineer-weeks **per phase**, labelled *"Phase 1 (months 1–3)"* and so on. A note under them reads *"Your team: … (≈N people full-time). Each phase has its own engineer-weeks; any you don't use are lost. Controls already running cost you nothing."*
   - the **roadmap timeline:** months across the top, amber lines at each phase start, the months the five incidents land (numbered to match the run setting), and one row per funded or upgraded control. **Brightness is what the control actually delivers that month** (`deliveredShareAt()`): how far it has ramped, times its foundation factor, times the new-code share for Threat Modeling and Secure Defaults. That's the same figure as the card's *"cuts loss from X by A% (of a possible B%)"*, measured against the control's top-rated threat; a foundation's is just its ramp. It's sampled mid-month, as the score is, in quarter steps. Each row is labelled like *"Month 7 → fully ramped from month 11"*, *"Partial now · upgrade month 4 → fully ramped from month 5"* or *"Foundation · Month 1 → fully ramped from month 3"*, plus an amber *"Held back: no Vulnerability Management and no Security Champions"* (or *"… new code only"*) when something caps it. An **End** column gives the share delivered in the last month, amber when it's under 100%. A partial control is hatched ("Partial today") before its upgrade starts. Under the grid, a key names the five incidents with the controls acting on each when it lands, e.g. *"Month 1 · Credential Stuffing Attack. Acting on it: Upgrade WAF, Upgrade MFA (partial until month 4)"*.
     - **Why (changed 2026-10-20 after booth testing):** the timeline used to shade by ramp-up alone and called fully ramped controls "full strength". In the booth screenshot (OrbitPay, no Vulnerability Management, Champions or Detection; 53%) it showed SCA, SAST, Cloud Posture and Incident Response at full strength while they delivered 50%, 37%, 50% and 50% of their ratings. It now teaches the foundations lesson instead of contradicting it.
   - the company's **risk register**, which updates live. It's built to answer "where is the most risk left, and what cuts it?":
     - **Tiles:** **Inherent (no controls)**, **Residual today**, **Residual with your roadmap**. The 14 rows add up to the last tile, give or take rounding.
     - **One sentence above the rows:** *"Expected loss is the average cost of a threat (its chance of happening × its cost), not a forecast. Shrink the orange."*
     - **"How these numbers work"** (folded): the likelihood definition, what impact covers, the ALE note (*"…the same idea over N months instead of a year"*; MediSecure, at 12 months, omits the last clause), and how "left" blends the during and handover figures.
     - **Rows are sorted by what's left,** biggest first, so the top row is the next thing to fix. Each reads like *"SQL Injection in Payment Endpoint · $74K left · of $137K · 46% cut"* over a bar. The legend is **Left with your roadmap**, **Your roadmap removes**, **Already mitigated today**.
     - **"Cut by:"** on every row lists the controls that directly cut that threat: ✓ running or funded, ½ partial today, plain for not funded. A row with no ✓ is one nothing addresses yet.
     - **The top row adds the biggest lever:** the unfunded control that would cut it most, as it would actually deliver given the roadmap's foundations and the new-code cap, and whether it still fits. For example (OrbitPay, with Vulnerability Management, Inventory, Champions and the MFA upgrade from month 1, and the SCA, WAF and Secrets Management upgrades from month 4): *"Biggest lever that fits: Upgrade SAST (cuts up to 60%; missing Secure Coding Training) · fits from month 4"*. When nothing fits, it says *"Biggest lever: … doesn't fit your remaining budget and eng-weeks"*.
     - **"The math"** (folded, on each row): *"Likelihood 35% in 6 months × impact $390K = $137K with no controls. $109K with what OrbitPay runs today. $74K with your roadmap ($80K averaged over the 6 months, $67K at handover, weighed equally)."* Expanders stay open while the attendee changes the roadmap.
   - the **Simulation setting** (see "The incident run")

   On a phone the columns stack, and a sticky bar above the cards shows the score and the same totals: *"Score 53% (pass 62%) · $44K left · Eng-weeks left P1 1.2 · P2 0.3 · Residual $706K → $417K"*.
3. **Launch.** Five incidents play out as "one possible timeline of incidents", each landing in a set month on a timeline strip under a header such as *"Incident 1 of 5 // month 2 of 18"*. Each one is met by whatever had ramped up by then: *"Threat Modeling 52% (of 70%, 75% ramped) · Pen Testing 40% · Detection 5% (of 10%, partial) → 73% together (overlaps counted once)"* (RetailRush's logic-flaw incident in month 17, with Threat Modeling started in month 13), *"Not started yet: the MFA upgrade (starts month 13)"*. The attendee chooses how the five are picked (see "The incident run").
4. **After-action report.** It shows readiness and tier (the score caption reads *"% of risk removed or mitigated"* and **Passed** or "Need 62%"), this run's loss, stat tiles for **Stopped**, **Partly contained**, **Got through**, and **Loss this run**, the residual risk during the timeline and at handover, and the three biggest remaining risks, each with what's holding it back and what would strengthen it. **After a failed launch,** the verdict names the **biggest single fix** (`biggestFix()`): of every single change that still fits (fund one open control at its earliest start, start one funded control earlier, or swap one funded control for an open one), the one that cuts the most expected loss. For the booth screenshot roadmap above it says *"Biggest single fix: Swap Threat Modeling for Vulnerability Management, from month 1. That alone takes your score from 53% to 58%; you need 62%. It's a foundation: SCA, SAST and Cloud Posture in your roadmap each deliver 50% less without it."* When the fix isn't a foundation it names the threat it helps most instead, e.g. MediSecure with only SAST, DAST and Pen Testing: *"Swap SAST for SCA, from month 1. That alone takes your score from 28% to 39%; you need 62%. The biggest gain is on Dependency Vulnerability Exploited: $77K less expected loss."* It helps attendees without a moderator: one concrete next step, with the reason. It names one change, not a winning roadmap, so the attendee still has to rebalance.

**The score is live before launch, on purpose** (changed 2026-10-15 after booth testing). Before that change the screen showed only dollar totals, and attendees couldn't tell how to measure progress against the 62% objective. Trying combinations until the score crosses 62 is the trade-off exploration the mission teaches: the timeline and the foundation penalties shape what they find. The incident run and the after-action report still carry the lessons about what got through and why.

#### How a roadmap is scored

- **Risk register.** Every company rates all 14 threats with a likelihood. **Likelihood is the chance the incident happens at full impact within the company's timeline, not the chance that the weakness exists.** (A 0.55 for a secret leak at OrbitPay doesn't mean "a 55% chance a key ever leaks"; that is near-certain. It means a 55% chance of a leak that costs the full $230K within six months.) The same definition is on screen.
- **Expected loss (EL)** = likelihood × impact, summed over the register:
  - **Inherent (no controls):** no controls at all
  - **Residual today:** the company's starting posture
  - **Residual with your roadmap:** the starting posture plus everything funded or upgraded
- **Controls take time.** Each funded control starts in a chosen month and ramps up linearly to full strength over its ramp time: 1 month (SCA, WAF), 2 (Vulnerability Management, Inventory, DAST, Pen Testing, Cloud Posture, IR), 3 (Training, MFA, SAST, Detection), 4 (Champions, Secrets, RBAC, Data Protection), or 6 (Threat Modeling, Secure Defaults). An **upgraded** partial control starts at 50% and ramps to full in half the time.
- **Expected loss is spread evenly over the timeline's months,** and each month is mitigated by whatever has ramped up by then.
- **The score counts two things equally:** the expected loss **during** the timeline and the run rate you **hand over** at the end (the last month). That's how a program lead reports to a board: what we lost over the period, and where we left the company. Quick wins help the first half; lasting capability helps the second.
- **Readiness = 1 − roadmap EL ÷ inherent EL,** where roadmap EL is that 50/50 blend. What the company already runs counts toward the score.
- **The bar is 62%.** Tiers: Mission success ≥62, Partial success ≥50, Compromised ≥35, Mission failure <35. Day-one readiness is 21–26%.
- **Threat Modeling and Secure Defaults protect only new code.** Their effect is scaled by the share of each company's exposure in code written during the timeline: OrbitPay 0.6, MediSecure 0.5, RetailRush 0.7 (estimates). Logic flaws are exempt, because the logic-flaw card is a new feature by definition.
- **No control is perfect.** Each one removes a share of the loss from the threats it addresses, rated **assuming its foundations are in place**.
- **Layered controls combine** as 1 − (1 − a)(1 − b). SAST (70%) plus Secure Defaults (75%) cover 93% of injection.
- **Detection and Incident Response limit damage rather than prevent it.** Detection removes 40% of a breach's loss and contains 10% of every other incident. IR removes 60% of a breach and contains 15% of everything else, but only once something is detected (see foundations).
- Each incident in the run lands as **Stopped** (75%+ mitigated), **Partly contained** (30–74%), or **Got through** (under 30%).

#### Foundations

Four controls are **foundations**. They don't stop incidents themselves; they make other controls work. Each missing foundation takes a fixed share of what the controls depending on it deliver:

| Foundation | Penalty when missing | Supports | Evidence |
|---|---|---|---|
| **Vulnerability Management & SLAs** | −50% | SAST, SCA, Cloud Posture, DAST, Pen Testing: everything that produces findings | Cobalt 2025: only 48% of pen test findings are ever resolved. Veracode SoSS 2025: leaders fix more than 10% of flaws a month, laggards less than 1%. |
| **Inventory, Risk Classification & Coverage Metrics** | −35% | MFA, Secrets, RBAC, WAF, Cloud Posture, Data Protection, Detection: estate-wide controls | IBM Cost of a Data Breach 2024: 35% of breaches involved shadow data |
| **Security Champions** | −25% | SAST, Threat Modeling, RBAC, Pen Testing, Secure Defaults | Correlational only (BSIMM). Modeled as adoption and ownership. |
| **Secure Coding Training** | −15% | SAST, DAST, Secure Defaults | Weak, mostly vendor evidence. Modeled as fix quality and paved-road adoption. |
| **Detection** (a regular control) | −50%, IR only | Incident Response | An IR plan nobody triggers is a document. |

- A **partial** foundation takes away half of its penalty.
- Foundations don't boost each other. IR → Detection is the only chain.
- Example: SAST is rated 70% against injection. With all three of its foundations it delivers 70%; without Training 60%; without Champions 53%; without Vulnerability Management 35%; with none of them 22%.

#### Starting posture

| State | Effect | Cost |
|---|---|---|
| **In place** | Full rating, still subject to foundation penalties | Free: its run cost is business as usual and isn't charged to the budget |
| **Partial** | Half its rating. A partial foundation removes half of its penalty. | Free as is. **Upgrade** to full for half the control's cost from its start month. |
| **Not in place** | Nothing until funded | Full cost |

**Shelfware isn't a separate state.** It's an in-place control whose foundations are missing, and the card says so.

| Company | In place | Partial | Story |
|---|---|---|---|
| **OrbitPay** | none | SAST (CodeQL or Semgrep CE on some repos), SCA (Dependabot alerts, nobody assigned), Secrets (GitHub secret scanning; some teams use AWS Secrets Manager, others .env files), MFA (staff only), WAF (CDN free tier), Cloud Posture (basic registry image scanning) | 120 people, mostly engineers, so free tools are everywhere, but no coordination between teams, no tracking, and no definition of what security requires |
| **MediSecure** | Data Protection (encryption at rest and in transit), Pen Testing (annual, because customers and auditors expect it) | IR (on paper, never exercised), Inventory (HIPAA risk analysis of ePHI systems), Training (annual HIPAA awareness), RBAC (annual user-access review), Detection (audit logs reviewed for the audit, not monitored) | An annual internal audit against its HIPAA policy proves compliance to leadership, so everything the policy names exists on paper. Pen test findings sit unfixed. |
| **RetailRush** | SAST (bought two years ago, now shelfware), Pen Testing (annual, for PCI) | WAF (log-only), Detection (logs collected, nobody watches), MFA (admins only), Data Protection (processor tokenizes cards; customer PII isn't), Training (annual awareness, not secure coding) | Plenty of spend, little effect. Its partial controls double as latent PCI DSS findings. |

#### Time and capacity

| Company | Start months | Engineer-weeks per phase | Incidents land in months |
|---|---|---|---|
| OrbitPay | 1, 4 | 24 (months 1–3), 24 (4–6) | 1, 2, 4, 5, 6 |
| MediSecure | 1, 4, 7 | 8.5 (1–3), 8.5 (4–6), 17 (7–12) | 2, 4, 7, 9, 11 |
| RetailRush | 1, 4, 7, 13 | 17.5 (1–3), 17.5 (4–6), 35 (7–12), 35 (13–18) | 2, 6, 10, 13, 17 |

- **Capacity is split across phases** in proportion to their length. A control's setup effort lands in its start phase and its run effort in every month after. Unused engineer-weeks don't carry forward: time not spent is gone.
- **Dollars stay a single budget,** but a later start pays fewer months of run cost. Starting late is cheaper and protects less, which is the trade-off.
- **You can't start everything now.** At every company, the best roadmap started entirely in month one is over capacity.
- **Incidents land in run order,** so the biggest threat hits early, before most controls have ramped. That's harsh but realistic.

#### The incident run

The five incidents are "one possible timeline of incidents". The attendee picks how they're chosen with the **Simulation setting // incident run** box above **Launch**. The box:
- explains that five incidents from the register land across the timeline, and that this setting picks which five
- says what each mode tests, for example *"Biggest gaps today: the five largest risks left by what the company already has. Tests whether your roadmap closes the gaps the company's current controls leave."*
- lists the five incidents it will send, with their landing months
- says that it never changes the score

When both modes send the same five, as they do at OrbitPay, the box says so, so the toggle doesn't seem broken. **The toggle never changes readiness, pass or fail, or tier**: the score always comes from all 14 threats. Both modes are deterministic (ties break by loss, then impact, then id).

| Mode | Picks | OrbitPay | MediSecure | RetailRush |
|---|---|---|---|---|
| **Biggest threats** (default) | Top 5 by inherent EL | Credential stuffing, SQL injection, API key leak, account takeover, IDOR | Dependency CVE, data breach, privilege escalation, API key leak, IDOR | Dependency CVE, credential stuffing, data breach, SQL injection, DDoS |
| **Biggest gaps today** | Top 5 by EL after the starting posture (the roadmap never changes the pick) | Same five | Misconfiguration replaces IDOR | Logic flaw replaces SQL injection |

On the after-action report, **Replay with the other setting: <mode> →** replays the five incidents in the other mode with the same roadmap. At OrbitPay both modes send the same five, so the button is replaced by a note saying so. Use it for discussion:

- *Biggest threats* keeps the shelfware story on screen: RetailRush's SQL injection card tests the SAST it already owns.
- *Biggest gaps today* shows day-one prioritization, and puts RetailRush's logic-flaw card, and so Threat Modeling, in front of the attendee.
- Coaching prompt: **"Why did SQL injection drop out of RetailRush's 'gaps today' run? Because the SAST you already own covers part of it. Is it working?"** (It delivers 24% of its 70% until Vulnerability Management, Champions, and Training are funded.)

The run and the score can disagree. Winning roadmaps often stop only 2–4 of the five cards, which is why the results screen shows both this run's loss and the residual expected loss across the register.

#### Difficulty and example roadmaps

With start months, exhaustive search is out of reach (OrbitPay alone has 3^18 plans). `node scripts/calibrate.mjs` (about 6 seconds) does three things:

1. Enumerates every set of controls that fits at its cheapest start.
2. Drops sets whose instant score (everything at full strength from day one) can't reach the bar. Ramping only lowers a score, so this is safe.
3. Schedules the rest with a greedy pass and hill-climbing.

"Best" and "winning sets" are therefore lower bounds. **The foundations result is proved, not estimated:** every start month for every no-foundation set that could get within half a point of the bar is checked. The tests repeat all of this.

| Company | Timeline · budget · capacity | Staffing | Day one | Best found | Best possible without a foundation (proved) | Winning sets found |
|---|---|---|---|---|---|---|
| OrbitPay (120 people) | 6 months · $90K · 48 eng-weeks | First AppSec hire plus most of a platform engineer on loan | 21% | 68% | 56% (fails) | 830 |
| MediSecure (80 people) | 12 months · $80K · 34 eng-weeks | Half-time security engineer shared with compliance, plus two champions | 26% | 70% | 61% (fails) | 658 |
| RetailRush (200 people) | 18 months · $250K · 105 eng-weeks | Two-person AppSec team, about two-thirds free for roadmap work | 25% | 72% | 61% (fails, by 0.6 points) | 589 |

Example roadmaps (asserted in the tests; "upgrade" means a partial control brought to full; the month is when each starts):

| Company | Roadmap | Readiness (during / handover) | Cost |
|---|---|---|---|
| OrbitPay | **Month 1:** Inventory, Vulnerability Management, upgrade MFA, upgrade Secrets, upgrade WAF. **Month 4:** Pen Testing, DAST, IR, upgrade Cloud Posture, upgrade SCA, upgrade SAST (best found) | 68% (59 / 78) | $78K, 47 EW |
| OrbitPay | **Month 1:** Inventory, upgrade MFA, Detection, IR. **Month 4:** Vulnerability Management, Pen Testing, DAST (lean) | 64% (56 / 72) | $74K, 43 EW |
| MediSecure | **Month 1:** Vulnerability Management, SCA, upgrade IR. **Month 4:** Cloud Posture, upgrade Inventory. **Month 7:** Secrets, WAF (best found) | 70% (65 / 75) | $55K, 33 EW |
| MediSecure | **Month 1:** Vulnerability Management, SCA, upgrade IR. **Month 4:** Cloud Posture (lean) | 62% (59 / 64) | $40K, 20 EW |
| RetailRush | **Month 1:** SCA, Vulnerability Management. **Month 4:** Inventory. **Month 7:** IR, upgrade WAF, upgrade Detection. **Month 13:** upgrade MFA, upgrade Training (best found) | 72% (65 / 78) | $159K, 97 EW |
| RetailRush | **Month 1:** upgrade WAF, SCA, IR. **Month 4:** Vulnerability Management. **Month 7:** Inventory (lean) | 66% (63 / 69) | $117K, 73 EW |

**Sequencing, the same nine controls at OrbitPay:** foundations first (Inventory, Vulnerability Management, MFA, Pen Testing and Cloud Posture in month 1; the rest in month 4) scores **66%**. Tools first (MFA, SCA, Secrets, DAST, Pen Testing and Cloud Posture in month 1; IR, Inventory and Vulnerability Management in month 4) scores **63%**. Order usually costs 1–7 points rather than deciding pass or fail. It matters most at OrbitPay, whose six months leave no time to catch up, and least at RetailRush.

What the winning roadmaps have in common:

- **OrbitPay:** every winner funds Inventory, 98% upgrade MFA, and 84% fund Vulnerability Management. Coordinating the free tools it already has is the core move.
- **MediSecure:** every winner funds SCA, and 98% fund Vulnerability Management, which also makes the existing pen test pay off. 70% upgrade the paper IR plan.
- **RetailRush:** SCA (93%), Vulnerability Management (77%), and IR (76%). The best plans start SCA and Vulnerability Management first and leave the upgrades for later.
- **Weak cards:** Secure Defaults (4–7% of winners, after its setup effort was cut from 10 to 6 engineer-weeks per 100 people), RBAC (3–4%), Secrets at RetailRush (4%), and Data Protection at OrbitPay (5%). Threat Modeling appears in 19–24%.

Common misses worth coaching:

- **"Compliant on paper isn't secure."** MediSecure's controls exist because the HIPAA audit names them. RetailRush's log-only WAF, unwatched logs, admin-only MFA, and awareness-only training are also likely PCI DSS findings.
- **"Fix what you have before you buy more."** A partial control is often the cheapest effect available, and a missing foundation can halve every tool that depends on it.
- **"You can't stand it all up in quarter one."** Start the foundations and the quick, high-value fixes first. A tool started before its foundations spends months delivering a fraction of its value.
- **"Long-ramp controls are bets on the handover."** Threat Modeling and Secure Defaults barely move the loss during the timeline, but they lower the risk you leave behind.
- A secrets manager doesn't stop credential stuffing (MFA does, and WAF rate limiting helps), and training no longer stops anything on its own: it makes the tools work.

#### Risk registers

Likelihoods are estimates from each company's risk drivers, not industry data. If one has to be defended on stage, tie it to a named report first (Verizon DBIR 2025 backs the high credential-stuffing likelihoods). Impact = base cost for a 100-person company × headcount/100 × sector multiplier (OrbitPay ×1.3 for payments fraud and PCI exposure, MediSecure ×1.5 for PHI notification and HIPAA penalties, RetailRush ×1.0 because its exposure is downtime and revenue), rounded to $10K. "Today" (**Residual today** on screen) is EL after the starting posture. ★ marks the default run.

**OrbitPay** (6 months, inherent EL $893K, today $706K)

| # | Incident | Likelihood | Impact | Inherent EL | Today | Rationale |
|---|---|---|---|---|---|---|
| ★1 | Credential stuffing | 0.60 | $310K | $186K | $117K | Consumer payment logins are a prime stuffing target, and high transaction volume hides the attempts. |
| ★2 | SQL injection in payment endpoint | 0.35 | $390K | $137K | $109K | Payment endpoints built fast with little review, and a SOC 2 readiness pen test is likely to find one. |
| ★3 | API key leaked to public repo | 0.55 | $230K | $127K | $92K | Many AWS microservices and no vault, so keys live in code and CI. One push is enough. |
| ★4 | Account takeover via password reset | 0.35 | $280K | $98K | $73K | Stored payout details make takeover pay, and reset and session flows haven't been hardened. |
| ★5 | Broken access control (IDOR) | 0.45 | $160K | $72K | $72K | API-first microservices. Broken object-level authorization is the most common API flaw. |
| 6 | Production debug endpoint exposed | 0.15 | $280K | $42K | $37K | Cloud-native with no security review of manifests, but the platform team owns the infrastructure. |
| 7 | Suspected data breach | 0.05 | $780K | $39K | $39K | A full breach within 6 months is unlikely, but costly. |
| 8 | Malicious package in the build | 0.08 | $470K | $38K | $32K | A young dependency tree, but CI holds cloud and payment credentials worth stealing. |
| 9 | Dependency vulnerability exploited | 0.06 | $620K | $37K | $26K | Young codebase on current frameworks, and only a 6-month window. |
| 10 | Vulnerable container deployed | 0.40 | $90K | $36K | $31K | Ships often with only basic image scanning. Likely, but a small loss. |
| 11 | Privilege escalation to admin | 0.08 | $340K | $27K | $27K | Few internal roles yet, and the admin tooling is small. |
| 12 | Business logic flaw | 0.08 | $310K | $25K | $25K | Payment logic is new, but little ships in 6 months. |
| 13 | Stored XSS | 0.10 | $190K | $19K | $17K | Mostly an API back end with a thin customer UI. |
| 14 | DDoS traffic spike | 0.05 | $230K | $12K | $8K | Not a peak-traffic business. |

**MediSecure** (12 months, inherent EL $755K, today $558K)

| # | Incident | Likelihood | Impact | Inherent EL | Today | Rationale |
|---|---|---|---|---|---|---|
| ★1 | Dependency vulnerability exploited | 0.45 | $480K | $216K | $195K | The legacy monolith carries years of unpatched dependencies while attention is on the migration. |
| ★2 | Suspected data breach | 0.20 | $600K | $120K | $62K | Healthcare is a top ransomware and extortion target, and PHI sells. |
| ★3 | Privilege escalation to admin | 0.30 | $260K | $78K | $38K | The role model is rebuilt service by service, so clinician, admin, and support roles drift. |
| ★4 | API key leaked to public repo | 0.40 | $180K | $72K | $57K | Every new service needs credentials, and migrations copy them into configs and scripts. |
| ★5 | Broken access control (IDOR) | 0.50 | $120K | $60K | $28K | New service boundaries move authorization checks. Patient-record APIs are the classic IDOR. |
| 6 | Production debug endpoint exposed | 0.25 | $220K | $55K | $50K | New Kubernetes infrastructure stood up by a team that is new to it. |
| 7 | Malicious package in the build | 0.08 | $360K | $29K | $26K | New services pull in packages quickly during the migration. |
| 8 | Business logic flaw | 0.12 | $240K | $29K | $22K | New services, but mostly re-implementing existing behavior. |
| 9 | Vulnerable container deployed | 0.40 | $70K | $28K | $25K | Brand-new images with no scanning. Frequent, but the loss is contained. |
| 10 | Credential stuffing | 0.08 | $240K | $19K | $17K | Mostly clinician logins behind SSO, plus a small patient portal. |
| 11 | Account takeover via password reset | 0.08 | $220K | $18K | $14K | SSO for clinicians limits takeover. |
| 12 | SQL injection | 0.05 | $300K | $15K | $10K | A mature ORM in the monolith, reused by the new services. |
| 13 | Stored XSS | 0.08 | $140K | $11K | $10K | Mostly internal-facing UIs. |
| 14 | DDoS traffic spike | 0.03 | $180K | $5K | $5K | Not a traffic-driven business. |

The close call: IDOR ($60K) is only just ahead of misconfiguration ($55K) for the fifth card.

**RetailRush** (18 months, inherent EL $1.81M, today $1.37M)

| # | Incident | Likelihood | Impact | Inherent EL | Today | Rationale |
|---|---|---|---|---|---|---|
| ★1 | Dependency vulnerability exploited | 0.50 | $800K | $400K | $362K | Legacy frameworks over 18 months. Known-CVE exploitation is the likeliest big hit. |
| ★2 | Credential stuffing | 0.70 | $400K | $280K | $165K | Stored cards, loyalty points, and gift cards make retail a prime target, and the peaks bring cover traffic. |
| ★3 | Suspected data breach | 0.20 | $1.0M | $200K | $160K | Card and customer data at 200-person scale over 18 months. |
| ★4 | SQL injection | 0.40 | $500K | $200K | $105K | Hand-built SQL in legacy code that is being replaced, not fixed. |
| ★5 | DDoS traffic spike | 0.65 | $300K | $195K | $137K | Two peak seasons in the window, and extortion DDoS targets peaks. |
| 6 | Business logic flaw | 0.35 | $400K | $140K | $115K | The re-platform rebuilds checkout, promotions, and refunds across many teams: coupon stacking, refund replay. |
| 7 | Account takeover via password reset | 0.25 | $360K | $90K | $55K | Gift card and loyalty balances can be cashed out. |
| 8 | Malicious package in the build | 0.12 | $600K | $72K | $70K | A large re-platform pulls in hundreds of new packages across many teams. |
| 9 | Stored XSS | 0.30 | $240K | $72K | $55K | Legacy front end with a lot of user content (reviews, Q&A). |
| 10 | API key leaked to public repo | 0.15 | $300K | $45K | $41K | A larger team with an established ops practice. |
| 11 | Production debug endpoint exposed | 0.12 | $360K | $43K | $42K | A new platform, but run by an established ops team. |
| 12 | Broken access control (IDOR) | 0.15 | $200K | $30K | $22K | Order-history and address APIs. |
| 13 | Vulnerable container deployed | 0.20 | $120K | $24K | $23K | The new platform will be containerized. Small loss. |
| 14 | Privilege escalation to admin | 0.05 | $440K | $22K | $16K | Few user roles, and the admin side is internal. |

The malicious-package likelihoods (0.08 / 0.08 / 0.12) and rationales are newer estimates than the rest of the register. Sonatype counted 704K malicious packages by October 2024, up 156% year over year.

#### The catalog

Costs are per 100 people (about 50 engineers), scaled by headcount, as one-time setup plus monthly run over the timeline. The table shows each control started now; a later start pays fewer months of run cost. Setup dollars are mostly $0 because SaaS tools rarely charge setup fees; setup is engineering time. Exceptions: MFA $5K (hardware keys), Threat Modeling $5K (coaching), IR $5K (tabletop facilitation), RBAC $2K (external review), Pen Testing $25K (first engagement).

| Control | SAMM function | Rated against | Needs | OrbitPay | MediSecure | RetailRush |
|---|---|---|---|---|---|---|
| Secure Coding Training | Governance | Foundation | — | $7K / 5 EW | partial; upgrade $5K / 3 EW | partial; upgrade $18K / 10 EW |
| Security Champions Program | Governance | Foundation | — | $6K / 8 EW | $8K / 8 EW | $29K / 28 EW |
| Inventory, Risk Classification & Coverage Metrics | Governance | Foundation | — | $4K / 8 EW | partial; upgrade $3K / 4 EW | $18K / 21 EW |
| Threat Modeling & Security Requirements | Design | Logic flaw 70%, access control 40% and privilege escalation 30% (new code only) | Champions | $9K / 7 EW | $10K / 7 EW | $23K / 24 EW |
| Secure Defaults & Paved Roads | Design | Injection 75%, XSS 75%, access control 50%, misconfiguration 30%, secret leak 30% (new code only) | Champions, Training | $0K / 11 EW | $0K / 10 EW | $0K / 30 EW |
| MFA & Auth Hardening | Design | Credential stuffing 85%, account takeover 80% | Inventory | partial; upgrade $5K / 4 EW | $11K / 6 EW | partial; upgrade $14K / 9 EW |
| SCA & Supply Chain Integrity | Implementation | Dependency CVE 80%, malicious package 60% | Vuln Mgmt | partial; upgrade $5K / 3 EW | $12K / 4 EW | $45K / 15 EW |
| Secrets Management & Push Protection | Implementation | Secret leak 85% | Inventory | partial; upgrade $7K / 6 EW | $17K / 9 EW | $65K / 27 EW |
| Vulnerability Management & SLAs | Implementation | Foundation | — | $7K / 8 EW | $10K / 8 EW | $36K / 26 EW |
| SAST Pipeline Scanning | Verification | Injection 70%, XSS 60% | Vuln Mgmt, Champions, Training | partial; upgrade $6K / 3 EW | $14K / 6 EW | in place |
| DAST & API Security Testing | Verification | XSS 50%, injection 40%, access control 30%, misconfiguration 30% | Vuln Mgmt, Training | $16K / 6 EW | $22K / 6 EW | $81K / 20 EW |
| Pen Testing, Bug Bounty & VDP | Verification | Access control 50%, privilege escalation 50%, logic flaw 40%, injection 40%, account takeover 30% | Vuln Mgmt, Champions | $31K / 5 EW | in place | in place |
| RBAC & Authorization Audit | Verification | Access control 80%, privilege escalation 70% | Inventory, Champions | $2K / 12 EW | partial; upgrade $1K / 5 EW | $2K / 27 EW |
| WAF, Bot & DDoS Protection | Operations | DDoS 85%, credential stuffing 40%, injection 30%, dependency CVE 20% | Inventory | partial; upgrade $3K / 2 EW | $7K / 3 EW | partial; upgrade $14K / 5 EW |
| Container & Cloud Posture | Operations | Vulnerable container 80%, misconfiguration 75%, dependency CVE 30% | Vuln Mgmt, Inventory | partial; upgrade $7K / 3 EW | $19K / 6 EW | $72K / 20 EW |
| Data Protection | Operations | Breach 25%, injection 20%, access control 20%, privilege escalation 20%, secret leak 15% | Inventory | $7K / 11 EW | in place | partial; upgrade $18K / 12 EW |
| Security Logging, Monitoring & Detection | Operations | Breach 40%, credential stuffing 20%, account takeover 20%, every other incident 10% | Inventory | $18K / 11 EW | partial; upgrade $12K / 5 EW | partial; upgrade $45K / 15 EW |
| Incident Response Plan | Operations | Breach 60%, every other incident 15% | Detection | $7K / 5 EW | partial; upgrade $4K / 2 EW | $16K / 13 EW |

Framework mappings (BSIMM16 activities; SAMM v2 practice / stream):

| Control | BSIMM16 | SAMM v2 |
|---|---|---|
| Secure Coding Training | T1.1, T1.7, T2.9 | Education & Guidance / Training and Awareness |
| Security Champions | SM2.3, T2.5, T3.6 | Education & Guidance / Organization and Culture |
| Inventory & Coverage Metrics | SM3.1, AA1.4, CMVM2.3 | Threat Assessment / Application Risk Profile; Strategy & Metrics / Measure and Improve |
| Threat Modeling & Requirements | AA1.2, AM2.1, SR1.3 | Threat Assessment / Threat Modeling; Security Requirements / Software Requirements |
| Secure Defaults & Paved Roads | SFD1.1, SFD2.1, SFD3.2 | Secure Architecture / Architecture Design, Technology Management |
| MFA & Auth Hardening | SFD1.1, SR1.1, AA1.1 | Security Requirements / Software Requirements |
| SCA & Supply Chain | SR1.5, SR2.7, SE3.6 | Secure Build / Software Dependencies |
| Secrets & Push Protection | SE3.9, SFD1.1 | Secure Deployment / Secret Management |
| Vulnerability Management & SLAs | CMVM1.3, PT1.2, CMVM3.1 | Defect Management / Defect Tracking (level 3: enforce an SLA) |
| SAST | CR1.4, CR2.6, CR1.5 | Security Testing / Scalable Baseline |
| DAST & API Testing | ST1.4, ST2.6, ST2.5 | Security Testing / Scalable Baseline |
| Pen Testing, Bounty & VDP | PT1.1, PT2.3, CMVM3.4, CMVM2.4 | Security Testing / Deep Understanding |
| RBAC & Authorization Audit | AA1.1, SFD2.1, ST1.3 | Requirements-driven Testing / Control Verification |
| WAF, Bot & DDoS | SE1.1, SE1.2 | Environment Management / Configuration Hardening |
| Container & Cloud Posture | SE1.3, SE2.7, CMVM3.5 | Environment Management / Configuration Hardening |
| Data Protection | CP2.1, CP1.2, AM1.2 | Operational Management / Data Protection |
| Logging, Monitoring & Detection | SE1.1, SE3.3, CMVM1.2 | Incident Management / Incident Detection |
| Incident Response | CMVM1.1, CMVM1.4, CMVM3.3 | Incident Management / Incident Response |

Honesty notes: neither framework names MFA, WAF/bot/DDoS, tokenization, or push-blocking secret scanning (both are process models, so these map to general practices). BSIMM has no activity for internal remediation SLAs; SAMM does. Recheck the BSIMM IDs when BSIMM17 is published (likely around February 2027).

Evidence behind the ratings, for questions at the booth:

- **MFA 85%** is deliberately below Microsoft Research's 99.2% (Meyer et al. 2023), to allow for coverage gaps and phishable factors. That's why MFA needs Inventory.
- **Detection and IR:** IBM 2025 found breaches contained in under 200 days cost $3.87M vs. $5.01M, and internally discovered breaches cost less than attacker-disclosed ones.
- **Secure Defaults 75%:** Google's safe-coding frameworks "nearly eliminated" XSS and SQL injection where adopted. Adoption is why it needs Champions and Training.
- **Data Protection** was lowered to 25% against breach because IBM 2025 puts encryption at about −$208K per breach.
- **Pen testing vs. scanners:** missing access control is the #2 pen test finding (Cobalt 2025), and scanners miss logic-flaw classes. There is no published split of human- vs. tool-found criticals, so don't quote one on stage.

#### Regulatory talking points

Verified against the regulation text (45 CFR on Cornell LII, PCI DSS v4.0.1, AICPA TSP 100):

| Posture item | Driver | Note |
|---|---|---|
| MediSecure IR plan (partial) | HIPAA 164.308(a)(6)(ii), required | The rule requires procedures and documentation, not exercises. "On paper, never exercised" is plausibly compliant, and that's the point. |
| MediSecure inventory (partial) | 164.308(a)(1)(ii)(A) risk analysis, required | Covers ePHI systems, not an engineering service inventory |
| MediSecure data protection (in place) | 164.312(a)(2)(iv), 164.312(e)(2)(ii), addressable | Addressable doesn't mean optional (164.306(d)(3)) |
| MediSecure pen test (in place) | 164.308(a)(8) evaluation | **HIPAA doesn't explicitly require pen testing today.** It's there because customers and auditors expect it. |
| MediSecure RBAC (partial) | 164.308(a)(4), esp. (a)(4)(ii)(C), addressable | HIPAA requires access review but **sets no frequency**. "Annual" is practice, not regulation. |
| MediSecure detection (partial) | 164.312(b) audit controls; 164.308(a)(1)(ii)(D) activity review, required; 164.308(a)(5)(ii)(C) log-in monitoring | Having logs meets 164.312(b). Reviewing them only for the audit is weak against "regularly review". Present it as a risk-based gap, not a clear violation. |
| RetailRush WAF (log-only) | PCI DSS 6.4.2, required since 31 Mar 2025 | Must block attacks or alert for immediate investigation. Log-only and unwatched is a finding waiting to happen. |
| RetailRush detection (partial) | PCI 10.4.1, 10.4.1.1 automated review | "Logs collected, nobody watches" is a 10.4.1 gap |
| RetailRush MFA (admins only) | PCI 8.4.1, 8.4.2 | PCI doesn't require customer MFA (which is what the control mainly buys). Admin-only may fall short of 8.4.2. |
| RetailRush training (partial) | PCI 6.2.2 | Requires secure coding training for developers every 12 months. Awareness-only is another latent gap. |
| RetailRush pen test (in place) | PCI 11.4.1–11.4.3 | At least every 12 months and after significant changes |
| OrbitPay (SOC 2 window) | AICPA TSC CC6, CC7, CC8 | **SOC 2 prescribes no specific controls.** Nothing forced OrbitPay to build anything yet. |

The HHS proposed HIPAA Security Rule update (90 FR 898, January 2025) would add an asset inventory, annual pen tests, and real-time activity monitoring. **It is not final** (Long-Term Actions, target 07/2027). Re-check reginfo.gov and federalregister.gov before quoting it, and download PCI DSS v4.0.1 from the PCI SSC library before quoting it word for word.

#### Incident impact

| Incident | Severity | OrbitPay | MediSecure | RetailRush |
|---|---|---|---|---|
| Dependency vulnerability exploited | critical | $620K | $480K | $800K |
| API key leaked to public repo | high | $230K | $180K | $300K |
| Credential stuffing | high | $310K | $240K | $400K |
| Broken access control (IDOR) | critical | $160K | $120K | $200K |
| Vulnerable container deployed | medium | $90K | $70K | $120K |
| DDoS traffic spike | medium | $230K | $180K | $300K |
| SQL injection | critical | $390K | $300K | $500K |
| Suspected data breach | high | $780K | $600K | $1.0M |
| Stored XSS in support console | high | $190K | $140K | $240K |
| Account takeover via password reset | high | $280K | $220K | $360K |
| Business logic flaw in a new feature | high | $310K | $240K | $400K |
| Privilege escalation to admin | critical | $340K | $260K | $440K |
| Production debug endpoint exposed | high | $280K | $220K | $360K |
| Malicious package in the build | critical | $470K | $360K | $600K |

The results screen compares this run's loss with the program budget. That's the talking point: one bad run of incidents usually costs more than the whole program.

### Mission 03: The Commander's Map

Correct checkpoint answer: **Pick the higher-impact initiative and defer the other.** A half-executed initiative is worse than a deferred one.

Locking the map also requires one initiative with every field filled in. **Start from my simulator roadmap** pre-fills the initiative, goal, and investment (dollars and engineer-weeks for that company's timeline) from the first three controls in the Mission 02 roadmap, and the attendee adds the metric, timeline, impact, and effort. An upgraded partial control imports as "Upgrade existing …" at the upgrade's cost, and foundations import as their own rows. Each row's timeline comes from the control's start month: month 1 → 30 days, month 4 → 90, month 7 → 180, month 13 → 360. The stack rank orders by impact (high first), then effort (low first):

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
