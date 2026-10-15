# D: time to value (design)

Status: **approved and implemented 2026-10-13** on branch `time-to-value`. The decisions in section 6 were settled as follows; `FACILITATOR.md` documents the shipped mechanics and numbers, and wins where this draft differs.

| Decision | Outcome |
|---|---|
| Build D before SAINTCON | Yes, the full version |
| Scoring | 50/50 blend of loss during the timeline and the run rate at handover, bar **62** |
| Start choices | **Four phases** (now, +3, +6, +12 months where they fit), shown as a segmented radio row on each funded card. The prototype showed two choices score about the same; four were chosen for realism. |
| Secure Defaults | Setup effort cut from 10 to 6 engineer-weeks per 100 people (4–7% of winners) |
| "Only helps new code" | **Kept.** Without it, a no-foundation roadmap reaches 61.8% at RetailRush and rounds to a pass; with it, the proved best is 61.4%. |
| Tiers | 62 / 50 / 35 |
| Upgrades, landing months, later starts cheaper | As recommended below |

The proof in `scripts/roadmaps.mjs` (`proveBestWithoutFoundations`) replaced this draft's search-based "best without foundations" figures. The search had under-reported MediSecure's by 1.4 points.

The original draft follows.

## 1. What D teaches

C scores a roadmap as if every control worked at full strength on day one. D adds time:

1. **Controls take time to pay off.** Each control ramps up over its `rampMonths` (WAF and SCA 1 month, MFA and SAST 3, Secrets and RBAC 4, Threat Modeling and Secure Defaults 6).
2. **You can't stand everything up in quarter one.** Capacity becomes engineer-weeks per phase. In the prototype, starting C's best roadmap entirely in month 0 is **over capacity at every company**.
3. **Foundations first.** Foundations ramp too, so a scanner bought before vulnerability management delivers a fraction of its value for longer.
4. **Leave the company better off.** The score counts the loss during the timeline *and* the risk the company carries when you hand it over (section 3), so long-ramp controls still earn their place.

## 2. Model

**Start choice.** Each funded or upgraded control gets a start. Two options were prototyped:

| Variant | Choices | OrbitPay (6 mo) | MediSecure (12 mo) | RetailRush (18 mo) |
|---|---|---|---|---|
| **Two choices (recommended)** | **Now** or **Halfway** | month 0 or 3 | month 0 or 6 | month 0 or 9 |
| Four phases (from the session 1 notes) | months 0, 3, 6, 12, where they fit the timeline | 0 / 3 | 0 / 3 / 6 | 0 / 3 / 6 / 12 |

They score almost identically (section 4), and two choices fit a phone better: a two-button toggle on each card instead of a `<select>`.

**Ramp.** Strength in month *m* (sampled mid-month) = clamp((m + 0.5 − start) ÷ rampMonths, 0, 1).

- **In place:** full strength from month 0.
- **Partial, not upgraded:** 50% throughout.
- **Partial, upgraded:** starts at 50% and ramps to 100% over **half** its ramp time, because half the work is already done.

**Foundations at month m** use the foundations' own strength that month. A foundation funded halfway only starts lifting the tools that depend on it from then on.

**"Only helps new code."** Threat Modeling and Secure Defaults (`helpsShipped: false`) only protect code written after they start. The prototype scales them by a per-company share of exposure in new code: OrbitPay 0.6, MediSecure 0.5, RetailRush 0.7 (estimates). Logic flaws are exempt, because the logic-flaw card is a new feature by definition. **This rule barely moves the results** (section 4), so it could be dropped to keep the model explainable.

**Expected loss over time.** Each threat's inherent expected loss is spread evenly over the timeline's months. Each month is mitigated by whatever has ramped up by then.

**Costs.**

- Dollars stay a total budget. A control started at month *s* pays its setup plus (months − *s*) months of run cost, so starting later is cheaper, and that is the trade-off.
- Engineer-weeks become **capacity per phase**: the company's total split in proportion to phase length. Setup effort is charged to the start phase and run effort to every month after.
- Unused capacity doesn't carry forward, because time spent is gone.
- Upgrades cost half, as in C.

**Incident run.**

- It uses the same five incidents as C, chosen by the same "Biggest threats" / "Biggest gaps today" toggle.
- Each one lands in a fixed month spread across the timeline, in run order: OrbitPay months 0, 1, 3, 4, 5; MediSecure 1, 3, 6, 8, 10; RetailRush 1, 5, 9, 12, 16.
- Each is mitigated by what had ramped up by its landing month, so the card can say *"Secrets Management was only 38% ramped when this landed in month 1."*

## 3. Scoring options

| Rule | Definition | Problem |
|---|---|---|
| **Window** | Share of inherent expected loss removed *during* the timeline | No single bar works. OrbitPay's 6 months are mostly ramp, so its best is about 59% while MediSecure's no-foundation roadmaps reach 57%. Foundations stop mattering at two companies. |
| **Exit** | The risk the company carries in the last month (C's score with ramps) | Sequencing stops mattering, and because later starts are cheaper, starting everything late scores *better* |
| **Blend (recommended)** | 50% window + 50% exit | One bar works at every company, foundations stay decisive, and sequencing is visible |

The blend matches how a program lead reports to a board: what we lost this year, and where we left the company.

## 4. Results

Blend scoring, bar 62, recommended two-choice starts. "Best" comes from the prototype's search, so it is a lower bound on the true best (see section 5).

| Company | Day one | Best | Best without funding a foundation | Subsets that can win | C's best roadmap, scheduled well | Same roadmap, tools first and foundations late |
|---|---|---|---|---|---|---|
| OrbitPay | 21% | 68% | 56% (fails) | 769 | 66% | 63% |
| MediSecure | 26% | 72% | 61% (fails) | 710 | 70% | 67% |
| RetailRush | 25% | 73% | 61% (fails) | 667 | 73% | 72% |

Comparison across options (best / best without foundations):

| Option | OrbitPay | MediSecure | RetailRush | Verdict |
|---|---|---|---|---|
| Window, bar 55, four phases | 59 / 51 | 65 / **57 passes** | 66 / **58 passes** | ✗ |
| Exit, bar 66, four phases | 78 / 62 | 77 / 64 | 79 / 64 | ✗ sequencing irrelevant |
| Blend 0.5, bar 62, four phases | 68 / 56 | 70 / 59 | 72 / 61 | ✓ |
| **Blend 0.5, bar 62, two choices** | 68 / 56 | 72 / 61 | 73 / 61 | ✓ recommended |
| Blend 0.6 (window-heavy), bar 60, four phases | 67 / 55 | 69 / 59 | 70 / 61 | ✓ slightly less margin |

What the winners look like (blend, bar 62, four phases):

- **OrbitPay:** Inventory 100%, MFA upgrade 98%, Vulnerability Management 84%. The best plan funds Inventory, Vulnerability Management, and the MFA, Secrets and WAF upgrades **now**, and the pen test, DAST, IR and remaining upgrades at month 3.
- **MediSecure:** SCA 100%, Vulnerability Management 98%. The best plan starts Vulnerability Management, SCA and the IR upgrade first.
- **RetailRush:** SCA 93%, Vulnerability Management 80%, IR 76%. The best plan starts SCA and Vulnerability Management first.
- **Threat Modeling** appears in 20–27% of winners (13–28% in C).
- **Secure Defaults is dead (0–1%)**, whether or not the new-code rule applies. Its setup effort (10 EW per 100 people) and 6-month ramp don't pay back inside these timelines. It was already weak in C (2–4%).

**How much sequencing matters:** 1–7 points depending on company. It's strongest at OrbitPay, where tools-first takes C's best roadmap from 66% to 63%, close to failing; it's weakest at RetailRush, whose 18 months give late foundations time to catch up. Sequencing is a visible lesson, not usually a pass/fail one. The pass/fail lessons stay "fund the foundations" and "fit the capacity".

## 5. Calibration and tests

- **Exhaustive search is out of reach.** OrbitPay alone is 3^18 plans with four phases (2^18 × 2^18 with two choices).
- **The prototype's method:**
  1. Enumerate every subset that fits at its cheapest start.
  2. Keep those whose C score (an upper bound: ramping only lowers a score) could clear the bar.
  3. Schedule each one with greedy earliest-fit in four orders, then hill-climb single moves.
  - "Best" and "winners" are therefore lower bounds. It takes about 15 seconds for all three companies.
- **With two choices, a proof is within reach.** "No roadmap without a foundation can pass" can be proved exhaustively: only the no-foundation subsets whose C score clears 62 need checking, and each has at most 2^k schedules. Worth building into `scripts/calibrate.mjs`.
- **Tests:**
  - Pin the exact scores of the facilitator's example plans.
  - Pin the "everything now is over capacity" fact.
  - Pin the proved no-foundation result.
  - Keep the 15-second search in the calibration script, not in `npm test`.

## 6. Decisions needed

1. **Build D at all before SAINTCON?** It adds an estimated 2–3 minutes to a mission already estimated at 8–12, and a timing control on 18 cards. The lightest alternative keeps C's scoring and only *shows* ramp-up on the incident cards ("SAST was 40% ramped at month 2") with no start choice. That teaches time to value at almost no booth cost, but not sequencing.
2. **Scoring: 50/50 blend of in-window loss and end-state risk** (recommended), or window-heavy 60/40.
3. **Bar 62 and tiers.** Proposed: Mission success ≥62, Partial ≥50, Compromised ≥35, Failure <35. Day one stays 21–26%.
4. **Two start choices (Now / Halfway)** (recommended) or four phases.
5. **Upgrades ramp from 50% over half the control's ramp time.**
6. **Drop the "only helps new code" rule?** It barely changes results and costs explanation time. Recommendation: drop it for D, and revisit if Threat Modeling needs help.
7. **Secure Defaults:** accept it as a dead card ("the long game doesn't fit an 18-month window"), or cut its setup effort (10 → 6 EW per 100 people) so it can win somewhere.
8. **Landing months** spread evenly in run order, so the biggest threat lands first, before most controls have ramped. That's harsh but realistic. The alternative is to spread them and land the biggest threat mid-timeline.
9. **Later starts are cheaper** (fewer months of run cost). That's realistic, but it gives students a reason to delay. With the blend it balances out (the best plans start foundations now).

## 7. Estimates to flag

- Ramp months are from the catalog (session 2), not measured data.
- New-code shares (0.6 / 0.5 / 0.7), if kept
- The landing-month pattern
- The extra booth time
