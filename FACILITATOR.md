# Facilitator guide

This guide is for booth volunteers. It covers what the game is, the rules in plain words, how to coach a stuck player, how to run the booth, and the answer key.

Every cost, team size, cut and weight in the game is an **illustrative game value**. They are made up for this game and are not industry data. The two statistics on the first screen are the only real-world numbers, and both are sourced below.

The source of truth for every game number is [`js/model.js`](js/model.js). The balance figures in this guide come from `node scripts/check.mjs`. `test/facilitator.test.js` checks that the key numbers in this guide still match the model.

## What it is

Players run the security program at OrbitPay, a 120-person fintech, for one year. They learn the four parts of an AppSec program, fund a one-year roadmap with a fixed budget and a small team, and then watch six attacks test it at the end of the year.

- **Audience:** security leaders, engineering managers, and anyone asked to "start an AppSec program".
- **Goal:** see that program work makes tools work, and that you can't cover everything, so you have to choose.
- **Time:** not yet timed at the booth. Time a few real playthroughs and add the figure here.

## The flow

The progress dots at the top show five steps: Why it matters, Four parts, Roadmap, The year, Finish. **Back** works on the middle steps.

1. **Phase 1, Intel: why AppSec matters.** Two numbers from the Verizon breach reports, with their sources on screen. See [The two stats](#the-two-stats).
2. **Phase 2, Briefing: four parts of a program.** Define, Evaluate, Integrate, Measure. The player opens all four cards before **Continue** unlocks; until then the count reads "Open all four to continue".
3. **Phase 3, Roadmap: build the plan.** The player places cards into quarters Q1 to Q4. The resource bar shows the budget left and the team used in each quarter. A timeline shows what is built in each quarter, and an **End of year** column lists the six incoming attacks, heaviest first. **Get a hint** shows three tips. The run buttons stay disabled, with "Place a card to run" beside them, until at least one card is placed.
4. **The end-of-year attack simulation.** **Run end-of-year attack simulation** opens an animated console. The player's cards drop in as a shield around the company, then each attack fires at it. An **Organization health** meter falls as attacks get through, with a "Hold 80%" marker. **Skip to results** (or Esc) jumps to the end. It ends on "Program score N%: win" or "Program score N%: short of 80%". Then the player picks **Back to roadmap** or **See after-action report**.
5. **Phase 4, The year: the after-action report.** One card per attack, heaviest first. Each says Prevented, "Risk cut by N%", or Unprotected, and says why in one line, naming any prerequisite that was missing. The PHP2Shell card adds a "Real world" note. The summary shows the program score tagged "Win" or "Short of 80%", the 80% marker, and the player's biggest exposure. The player can **Adjust roadmap** and try again, or **Finish**.
6. **Finish.** The heading follows the result. A win says "Welcome, Commander." with the program score over the 80% bar. A loss says "Not this year, Commander." in coral, tells the player the token is still theirs, and names their biggest exposure. Below it, a takeaway card the player can photograph: "Your OrbitPay roadmap" with the score and the 80% marker, the cards built in each quarter (flagging any below full strength), the team used against each quarter's cap, the budget spent and any left unspent, and the six attacks heaviest first, each marked Prevented, "Risk cut N%" or Unprotected. Then the Hackers Challenge CTF token with a **Copy token** button, three QR codes under "Keep building your roadmap", and **Start over**.

**The CTF token is given whether or not the player wins.** **Finish** is on the report after every run, and the finish screen shows the token either way. Winning is the teaching goal, not the gate.

## The rules in plain words

<!-- facilitator-table: settings -->
| Setting | Value |
|---|---|
| Budget for the year ($K) | 70 |
| Team cap Q1 (FTE) | 3 |
| Team cap Q2 (FTE) | 3 |
| Team cap Q3 (FTE) | 3 |
| Team cap Q4 (FTE) | 3 |
| Win bar (program score) | 80% |

- **Budget.** One budget for the whole year. Each card costs its dollar amount once. Much of the program work is free in dollars and costs only team time.
- **Team per quarter.** Each quarter has its own team cap. A card uses its FTE in the quarter it is built, and only that quarter. Unused team time doesn't carry over. A quarter button greys out when the card won't fit, and the card says why (over budget, or not enough team in that quarter).
- **Every card can be built once.** Click a quarter to build it there. Click the same quarter again to remove it.
- **Attacks land at the end of the year.** Anything built in any quarter is live when they hit. Quarters matter for two things only: the team caps, and the order of prerequisites.
- **Prerequisites ("Needs").** Some cards need other cards. A needed card is **in place** if it is built in the same quarter or earlier, **and** its own prerequisites are in place for it. The rule is recursive. For example, the remediation card needs the operating model. If the operating model is built after the remediation card, then dependency scanning, which needs the remediation card, also loses strength.
- **Same quarter counts.** A card and its prerequisite can be built in the same quarter.
- **Half strength.** Each prerequisite that isn't in place halves the card. One missing prerequisite means half strength; two means a quarter. The card shows "Runs at half strength" and names the problem. A card at reduced strength still cuts risk, but its cut is scaled down.
- **Prevent vs cut.** Each attack has one stopper card. If the stopper is built **at full strength**, the attack is prevented outright: 100%. Otherwise, every card that cuts the attack combines, each scaled by its strength: risk left = (1 − cut A) × (1 − cut B) × …, and the reduction is 1 minus the risk left. The stopper counts as an ordinary cut in that case.
- **Program score.** Each attack has a weight, and the weights add up to 100%. The program score is the weighted average of the risk cut across the six attacks. Likely attacks weigh more.
- **The 80% bar.** A score of 80% or more wins. The screen rounds down, so a 79.6% score shows as 79%, never as 80%.

Worked example from the best plan below: SQL injection isn't stopped (no code scanning), but champions (20%), threat modeling (20%), KPIs (25%) and the metrics review (15%) are all at full strength. Risk left is 0.80 × 0.80 × 0.75 × 0.85, so the risk cut is 59%, which matches the balance check.

## Card table

All 18 cards, in model order. Every number is copied from `js/model.js` and is an illustrative game value. "Cuts" are at full strength. A foundation is a card that other cards need.

<!-- facilitator-table: cards -->
| ID | Card | Part | Kind | Cost ($K) | FTE | Needs | Stops | Cuts (at full strength) | BSIMM | SAMM |
|---|---|---|---|---|---|---|---|---|---|---|
| `why` | Define your why | Define | Program work, foundation | 0 | 0.5 | - | - | - | SM1.1 | Strategy & Metrics |
| `threat_assessment` | Conduct a high-level threat assessment | Define | Program work, foundation | 0 | 0.5 | - | - | - | AM1.3 | Threat Assessment |
| `inventory` | Build your application inventory | Define | Program work, foundation | 0 | 1 | - | PHP2Shell | PHP2Shell 90% | CMVM2.3 | Threat Assessment |
| `partners` | Meet with key partners | Define | Program work, foundation | 0 | 0.5 | - | - | - | SM2.7 | Strategy & Metrics |
| `operating_model` | Define your operating model | Evaluate | Program work, foundation | 0 | 0.5 | - | - | - | SM1.4 | Strategy & Metrics |
| `champions` | Design a security champions program | Evaluate | Program work, foundation | 5 | 1 | `partners` | - | SQL injection 20%, Refund logic abuse 20% | SM2.3 | Education & Guidance |
| `training` | Secure coding training | Evaluate | Tool | 20 | 0.5 | - | - | SQL injection 40%, Cloud key leak 30%, Refund logic abuse 20% | T1.7 | Education & Guidance |
| `pipeline` | Map your code delivery pipeline | Integrate | Program work, foundation | 0 | 0.5 | - | - | - | SM3.4 | Secure Build |
| `fix_slas` | Define your remediation process & SLAs | Integrate | Program work, foundation | 0 | 1 | `operating_model` | - | Log4j-style CVE 30%, PHP2Shell 50% | CMVM1.3 | Defect Management |
| `threat_model` | Shift left with threat modeling | Integrate | Program work | 5 | 0.5 | `champions`, `threat_assessment` | Refund logic abuse | SQL injection 20%, Refund logic abuse 70% | AA1.2 | Threat Assessment |
| `sca` | Dependency scanning (SCA) | Integrate | Tool | 25 | 0.5 | `fix_slas`, `pipeline` | Log4j-style CVE | Log4j-style CVE 90% | SR1.5 | Secure Build |
| `sast` | Code scanning (SAST) | Integrate | Tool | 20 | 1 | `champions`, `pipeline` | SQL injection | SQL injection 85% | CR1.4 | Security Testing |
| `secrets` | Secrets vault & push protection | Integrate | Tool | 20 | 1 | `inventory` | Cloud key leak | Cloud key leak 95% | SE3.9 | Secure Deployment |
| `mfa` | MFA & login hardening | Integrate | Tool | 15 | 1 | `inventory` | Credential stuffing | Credential stuffing 90% | SFD1.1 | Security Requirements |
| `kpis` | Define your KPIs | Measure | Program work, foundation | 0 | 0.5 | `why` | - | Every attack 25% | SM3.3 | Strategy & Metrics |
| `metrics_review` | Review metrics with partners | Measure | Program work | 0 | 0.5 | `kpis`, `partners` | - | Every attack 15% | SM2.1 | Strategy & Metrics |
| `pentest` | Pen test & bug bounty | Measure | Tool | 25 | 0.5 | `fix_slas`, `threat_assessment` | - | SQL injection 50%, Refund logic abuse 60% | PT1.1 | Security Testing |
| `detection` | Detection & response | Measure | Tool | 30 | 0.5 | `kpis` | - | Log4j-style CVE 35%, PHP2Shell 35%, Credential stuffing 35%, SQL injection 30%, Cloud key leak 35%, Refund logic abuse 30% | CMVM1.1 | Incident Management |

On screen, program work is listed before tools in each part. Each card shows its cost, FTE, "Needs", "Unlocks" (for foundations) and its BSIMM and SAMM reference.

## Attacks table

Six attacks, heaviest first, the order the report reveals them. The weights add up to 100%. The likelihood order loosely follows DBIR 2026, where exploited vulnerabilities are the top way in and credential abuse is common. The weights and cuts are illustrative game values.

<!-- facilitator-table: attacks -->
| ID | Attack | Likelihood | Weight | Share of score | Stopped by | Stopper's cut | Other cuts (at full strength) |
|---|---|---|---|---|---|---|---|
| `php` | PHP2Shell hits a forgotten server | Likely | 0.22 | 22% | `inventory` | 90% | Remediation & SLAs 50%, Detection 35%, KPIs 25%, Metrics review 15% |
| `dep` | Log4j-style dependency exploited | Likely | 0.2 | 20% | `sca` | 90% | Remediation & SLAs 30%, Detection 35%, KPIs 25%, Metrics review 15% |
| `cred` | Credential stuffing | Likely | 0.18 | 18% | `mfa` | 90% | Detection 35%, KPIs 25%, Metrics review 15% |
| `sqli` | SQL injection in checkout | Possible | 0.16 | 16% | `sast` | 85% | Pen test 50%, Training 40%, Threat modeling 20%, Champions 20%, Detection 30%, KPIs 25%, Metrics review 15% |
| `secret` | Cloud key pushed to a public repo | Less likely | 0.12 | 12% | `secrets` | 95% | Training 30%, Detection 35%, KPIs 25%, Metrics review 15% |
| `logic` | Refund logic abused | Less likely | 0.12 | 12% | `threat_model` | 70% | Pen test 60%, Training 20%, Champions 20%, Detection 30%, KPIs 25%, Metrics review 15% |

"Stopper's cut" is what the stopper adds when it is built but not at full strength, before it is scaled by its strength. At full strength the stopper prevents the attack outright.

### PHP2Shell: the real-world basis

The PHP2Shell attack is inspired by a real incident from the week before the event. The game's story (an old PHP microsite nobody listed) is fictional. The real incident has no named victim.

- **The CVEs:** CVE-2026-109618 ("PHP Memory Corruption Vulnerability", remote code execution via out-of-memory corruption) and CVE-2026-109619 ("PHP Stale Internal Request-State Vulnerability", remote code execution via stale global state). Both are unauthenticated, and both are in PHP itself, not in any app.
- **Scores (NVD):** CVSS 3.1 of 9.8 for CVE-2026-109618 and 8.1 for CVE-2026-109619. The PHP project, as the CVE numbering authority, scored both 9.2 on CVSS 4.0.
- **Fixes:** PHP shipped 8.5.12, 8.4.27, 8.3.36 and 8.2.35 on 21 Oct 2026. PHP 8.1 and older no longer get updates from the PHP project.
- **Exploitation:** Amazon Threat Intelligence saw a first attempt on 17 Oct 2026, before the patches. KEV confirms exploitation attempts. No confirmed breach is publicly tied to PHP2Shell yet; Unit 42 retracted the one it had linked.
- **CISA KEV:** both CVEs were added to the Known Exploited Vulnerabilities catalog on 26 Oct 2026, with a due date of 29 Oct 2026. The required action says owners "are responsible for evaluating each asset's internet exposure". Source: the CISA KEV JSON feed, catalog version 2026.10.26, <https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json>.
- **Why inventory stops it:** the bug hits every PHP install that serves web requests, whatever the app. You can only patch what you know runs PHP.
- **Don't quote exposure counts.** Press figures for exposed hosts disagree by an order of magnitude, and version-based scans overcount because distros backport fixes.

The on-screen "Real world" note reads: "Based on PHP2Shell (CVE-2026-109618 and CVE-2026-109619). PHP shipped fixes on 21 Oct 2026, and CISA added both to its Known Exploited Vulnerabilities catalog on 26 Oct 2026, telling owners to evaluate each asset's internet exposure."

Full sources and caveats: `research/php-incident-2026-10.md` in the workspace, outside this repo, with saved copies of the KEV entries, the NVD records and the php.net news.

## The two stats

These are the only real-world numbers in the game. Both are from the Verizon Data Breach Investigations Report (DBIR).

**Stat 1, DBIR 2025: 34%**

- Headline: "Web applications were the most common route in breaches."
- Body: "In 34% of breaches where the route was known, it ran through a web application."
- Note: "In basic web application attacks, about 88% of breaches involved stolen credentials (same report, p.53), so logins count as much as code."
- Source: "Verizon 2025 Data Breach Investigations Report, p.28, Figure 28, top action vectors in breaches (n=7,372)."

**Stat 2, DBIR 2026: 31%**

- Headline: "Exploiting a vulnerability is now the most common way attackers first get in."
- Body: "It was how 31% of breaches started, up from 20% the year before."
- Note: "That counts every kind of vulnerability, including VPNs and other edge devices, not only your own apps."
- Source: "Verizon 2026 Data Breach Investigations Report, p.15, Figure 10, initial access vectors in non-Error, non-Misuse breaches (n=20,023)."

### What these stats do and don't say

- **The 34% is about routes, not starts.** Figure 28 counts the vector an attacker's action went through, in breaches where it was known. It does not say 34% of breaches started with a web app. Don't say "started with".
- **A breach can have more than one route.** The routes in Figure 28 add up to more than 100%: web application 34%, email 27%, other 25%, carelessness 21%, and so on.
- **The 34% isn't only code flaws.** In basic web application attacks, stolen credentials were in about 88% of breaches. That's why the game has a credential-stuffing attack and an MFA card.
- **The 31% is about how breaches started.** It is the top initial access vector in the 2026 report, the first year exploitation is number one. Phishing was 16% and credential abuse 13%.
- **The 31% includes edge devices.** It counts every exploited vulnerability, including VPNs and other edge devices, not only a company's own apps. For scale, in the 2025 report web applications were 42% of exploitation by vector and VPN and edge devices 22% (Figure 17, p.21). Don't claim the whole 31% is app bugs.
- **Credential abuse is still everywhere.** In the 2026 report it appears somewhere in the attack chain in 39% of breaches (Figure 19, p.20), even though it is only 13% as a first step.

Source notes: `research/dbir-2021-2025.md` in the workspace, outside this repo.

## Answer key and balance

All figures below are from an exact run of `node scripts/check.mjs` on model v2 (budget $70K, FTE caps 3/3/3/3, win bar 80%). It checked every feasible plan, and a 20,000-plan cross-check against the game's own scorer found 0 mismatches. "Feasible" means it fits the budget and every quarter's team cap. The screen rounds scores down, so 93.5% shows as 93%.

### How hard is it

- **Feasible plans:** 35,637,311,109.
- **Winning plans (80% or more):** 496,643,210, which is **1.394%** of feasible plans.
- **Best score:** 93.5%.
- **No plan covers everything.** Across every plan, the best possible weakest-attack reduction is 71.0%. That all-round plan scores only 75.2%, a loss.
- **Weights matter.** With no Likely attack well covered (80% or more), the best score is 77.2%. Covering both Less likely attacks with at most one Likely attack covered peaks at 84.8%. Covering all three Likely attacks reaches 93.5%.
- **Many ways to win.** There are 28 distinct sets of well-covered attacks among winning plans, and 12 of them each account for at least 1% of wins. The most common are PHP2Shell + credential stuffing + cloud key + refund logic (18.17% of wins), PHP2Shell + credential stuffing + cloud key (17.23%), and Log4j-style + PHP2Shell + credential stuffing (13.59%).

### The best plan: 93.5%

Spend $70K of $70K. FTE used per quarter: 1.5/3/2.5/2.5.

| Quarter | Cards built |
|---|---|
| Q1 | Define your why; Conduct a high-level threat assessment; Define your KPIs |
| Q2 | Build your application inventory; MFA & login hardening; Secrets vault & push protection |
| Q3 | Meet with key partners; Design a security champions program; Review metrics with partners; Shift left with threat modeling |
| Q4 | Define your operating model; Map your code delivery pipeline; Define your remediation process & SLAs; Dependency scanning (SCA) |

Result: Log4j-style CVE prevented, PHP2Shell prevented, credential stuffing prevented, SQL injection 59%, cloud key leak prevented, refund logic abuse prevented.

Note that program work doesn't have to come first in the year. It has to come in the same quarter as, or before, the cards that need it. Here the operating model, the pipeline map, the remediation process and SCA all land in Q4.

### Example winning plans

The highest-scoring plan for each of the three most common ways to win.

**PHP2Shell + credential stuffing + cloud key + refund logic: 88.6%.** Spend $70K. FTE per quarter 1/3/3/2.

| Quarter | Cards built |
|---|---|
| Q1 | Define your why; Define your KPIs |
| Q2 | Conduct a high-level threat assessment; Meet with key partners; Design a security champions program; Review metrics with partners; Shift left with threat modeling |
| Q3 | Build your application inventory; MFA & login hardening; Secrets vault & push protection |
| Q4 | Define your operating model; Define your remediation process & SLAs; Dependency scanning (SCA) |

Result: Log4j-style CVE 75%, PHP2Shell prevented, credential stuffing prevented, SQL injection 59%, cloud key leak prevented, refund logic abuse prevented.

**PHP2Shell + credential stuffing + cloud key: 84.5%.** Spend $65K. FTE per quarter 1/2.5/3/2.

| Quarter | Cards built |
|---|---|
| Q1 | Define your why; Define your KPIs |
| Q2 | Conduct a high-level threat assessment; Meet with key partners; Design a security champions program; Review metrics with partners |
| Q3 | Build your application inventory; MFA & login hardening; Secrets vault & push protection |
| Q4 | Define your operating model; Define your remediation process & SLAs; Pen test & bug bounty |

Result: Log4j-style CVE 55%, PHP2Shell prevented, credential stuffing prevented, SQL injection 74%, cloud key leak prevented, refund logic abuse 79%.

**Log4j-style + PHP2Shell + credential stuffing: 87.1%.** Spend $70K. FTE per quarter 3/3/0.5/2.

| Quarter | Cards built |
|---|---|
| Q1 | Define your why; Meet with key partners; Design a security champions program; Define your KPIs; Review metrics with partners |
| Q2 | Build your application inventory; Shift left with threat modeling; MFA & login hardening; Secure coding training |
| Q3 | Map your code delivery pipeline |
| Q4 | Define your operating model; Define your remediation process & SLAs; Dependency scanning (SCA) |

Result: Log4j-style CVE prevented, PHP2Shell prevented, credential stuffing prevented, SQL injection 72%, cloud key leak 55%, refund logic abuse 73%.

### Naive plans lose

| Plan | Best score |
|---|---|
| No program work at all (tools only) | 33.9% |
| Tools first: every program card skipped or built after the last tool | 78.0% |
| Stricter: no tool has any of its prerequisites in place, program work otherwise free | 78.0% |
| Every foundation skipped, or built after the cards that need it | 63.3% |
| Program work only, no tools | 65.4% |
| Buy SCA and MFA in Q1 and SAST in Q2, no program work | 16.0% |
| The same tools first, with the foundations added in Q3 and Q4 | 45.2% |

The best tools-first plan, 78.0%, spends $65K: MFA, training and secrets in Q1; partners, operating model, champions and remediation in Q2; why, threat assessment, KPIs, metrics review and threat modeling in Q3; inventory in Q4. MFA and secrets run at half strength because the inventory comes last. Result: Log4j-style CVE 55%, PHP2Shell prevented, credential stuffing 64%, SQL injection 75%, cloud key leak 76%, refund logic abuse prevented.

### Cards in winning plans

"Best without it" is the best score any plan reaches without that card. It is exact.

| Card | In this share of wins | Best score without it | Change | Note |
|---|---|---|---|---|
| Define your why | 89.46% | 91.7% | -1.8 pts | |
| Conduct a high-level threat assessment | 87.09% | 88.7% | -4.8 pts | |
| Build your application inventory | 100.00% | 79.0% | -14.4 pts | Can't win without it |
| Meet with key partners | 90.80% | 86.1% | -7.3 pts | |
| Define your operating model | 87.88% | 89.2% | -4.3 pts | |
| Design a security champions program | 82.78% | 85.8% | -7.6 pts | |
| Secure coding training | 44.76% | 93.5% | 0.0 pts | |
| Map your code delivery pipeline | 84.86% | 88.6% | -4.9 pts | |
| Define your remediation process & SLAs | 91.53% | 87.3% | -6.2 pts | |
| Shift left with threat modeling | 85.04% | 86.2% | -7.2 pts | |
| Dependency scanning (SCA) | 45.23% | 91.1% | -2.4 pts | |
| Code scanning (SAST) | 20.57% | 93.5% | 0.0 pts | |
| Secrets vault & push protection | 51.55% | 92.4% | -1.1 pts | |
| MFA & login hardening | 98.98% | 83.0% | -10.5 pts | |
| Define your KPIs | 95.76% | 90.5% | -2.9 pts | |
| Review metrics with partners | 86.48% | 92.3% | -1.2 pts | |
| Pen test & bug bounty | 17.31% | 93.5% | 0.0 pts | |
| Detection & response | 17.78% | 93.5% | 0.0 pts | |

Every card appears in at least 17.31% of wins, so there are no dead cards.

### Foundations: skipping or building late costs points

| Foundation | Cards that need it | Best if skipped | Wins that skip it | Best if built after the cards that need it |
|---|---|---|---|---|
| Define your why | Define your KPIs | 91.7% (-1.8) | 10.54% | 91.7% (-1.8) |
| Conduct a high-level threat assessment | Shift left with threat modeling; Pen test & bug bounty | 88.7% (-4.8) | 12.91% | 88.7% (-4.8) |
| Build your application inventory | MFA & login hardening; Secrets vault & push protection | 79.0% (-14.4) | 0.00% | 86.0% (-7.4) |
| Meet with key partners | Design a security champions program; Review metrics with partners | 86.1% (-7.3) | 9.20% | 86.1% (-7.3) |
| Define your operating model | Define your remediation process & SLAs | 89.2% (-4.3) | 12.12% | 89.2% (-4.3) |
| Map your code delivery pipeline | Code scanning (SAST); Dependency scanning (SCA) | 88.6% (-4.9) | 15.14% | 88.6% (-4.9) |
| Design a security champions program | Shift left with threat modeling; Code scanning (SAST) | 85.8% (-7.6) | 17.22% | 88.7% (-4.8) |
| Define your remediation process & SLAs | Dependency scanning (SCA); Pen test & bug bounty | 87.3% (-6.2) | 8.47% | 88.6% (-4.9) |
| Define your KPIs | Review metrics with partners; Detection & response | 90.5% (-2.9) | 4.24% | 92.9% (-0.6) |

### Balance targets

All eight targets pass:

| Target | Result |
|---|---|
| Win share between 1% and 10% | 1.39% |
| Best score between 85% and 99% | 93.5% |
| No all-round plan: best weakest-attack reduction 75% or less | 71.0% |
| Weights matter: no Likely covered stays under 80%, and Less-likely-first stays under all-Likely | 77.2% < 80%; 84.8% < 93.5% |
| At least 5 ways to win with 1% or more of wins | 12 |
| Naive plans all lose | no program work 33.9%, tools first 78.0%, foundations all late 63.3% |
| Every foundation: skipping it or building it late lowers the best score | pass |
| No dead cards: every card in at least 10% of wins | lowest 17.3% |

### Re-run the check

Run it after any change to `js/model.js`, then update this guide and the tests.

```sh
node scripts/check.mjs             # exact: every feasible plan, all CPU cores, about 3 minutes
node scripts/check.mjs --sample N  # uniform random sample of N feasible plans, fast, for tuning
```

The exact run above used 14 threads and took 184.1 seconds. Use the exact run for any figure quoted in this guide.

## Coaching tips

**The in-game hint.** **Get a hint** on the roadmap screen shows three lines:

- "Do program work early, in Q1 and Q2, so your tools land at full strength."
- "Cover the Likely attacks first. You can't cover all six."
- "Every winning roadmap includes "Build your application inventory"."

Each line is backed by the exact balance check: inventory is in 100% of wins, and no plan covers all six attacks well.

**What to say to a player who's stuck:**

- "Look at the End of year column. The top three attacks are worth 60% of your score." Steer them to the Likely attacks.
- "Which of your cards says half strength?" The warning names the missing prerequisite. Move that prerequisite to the same quarter or earlier.
- "Same quarter counts." Many players think a prerequisite must be a quarter earlier.
- "Program work is mostly free in dollars. The limit is team time." If a quarter is full, try another quarter.
- "Who is going to find the PHP server nobody listed?" Points to the inventory card. It stops PHP2Shell, and MFA and secrets need it.
- "You can't stop everything. Which two or three attacks will you stop outright?" A full-strength stopper prevents an attack outright. Stacked cuts help, but they leave some risk.
- After a loss, read the "Your biggest exposure" line on the report together. It names the attack that cost the most score.
- If they scored around 78%, ask whether they bought tools before the program work that makes them work. The best tools-first plan scores 78.0%, a narrow loss.

**What to avoid:** don't hand over a winning plan. Point at one change and let them rebalance.

**Suggested close:**

> A program is not a tool purchase. Know your why, build the foundations your tools depend on, cover what's most likely, measure what drives action, and finish what you start.

## Booth operations

### Run it

With Docker (the booth setup):

```sh
docker compose up --build
```

Open <http://localhost:8088>.

With Node.js 20 or later, no npm install needed:

```sh
npm start
```

This serves on port 8080 by default. To match the Docker port, run `PORT=8088 npm start`. Opening `index.html` as a `file:` URL doesn't work, because the app uses ES modules.

In the full academy portal, the gateway serves this app at `/commanders/` (see the `appsec-community-academy` repo).

### Between players

- **Start over** is in the header and on the finish screen. It reloads the page and clears the anonymous tracker identity, so the next player is a fresh participant.
- The roadmap lives only in memory. Nothing the player builds is saved in the browser or sent anywhere.

### Accessibility and devices

- **Reduced motion:** if the device asks for reduced motion, the simulation skips the animation and goes straight to the final frame and the result.
- **Skip:** **Skip to results** or Esc ends the animation. Esc closes the console once it is done.
- **If the animation fails to load,** the console says so and still offers the after-action report, so the flow never dead-ends.
- **Phones:** the layout works at 375px wide. On a narrow screen, the four card groups fold into tap-to-open sections, and the first one starts open.

### Telemetry and opt-out

- The app sends anonymous start and completion signals to the central tracker at `https://appsec.community/api/activity`. That is its only external request.
- It never sends the roadmap, choices, scores, the win or loss, or anything typed.
- If the network is down, events wait in a small local queue and send later. Telemetry never blocks the game.
- To opt a browser out, run this in its console: `localStorage.setItem("appsec-community-analytics-opt-out", "true")`.

### QR codes on the finish screen

| Label | Target | Note |
|---|---|---|
| BSIMM report | <https://www.blackduck.com/resources/analyst-reports/bsimm.html> | The report download sits behind an email form. Tell players before they scan. |
| OWASP SAMM | <https://owaspsamm.org/> | |
| Redpoint roadmap worksheet | <https://redpointsecurity.com/appsec-program-roadmap-worksheet/> | |

The QR images are in `assets/qr/`. All three URLs were checked on 2026-10-27.

### CTF token

The Hackers Challenge token is set in `ctfToken` in `js/config.js`. **The current value is a placeholder:** confirm it with the CTF organizers before deployment. **Copy token** copies it locally, or selects it if the clipboard is blocked. The token is never submitted anywhere.

## Known limitations

- **Game values are illustrative.** Costs, team sizes, cuts, weights and the 80% bar are made up for this game. Only the two DBIR stats and the PHP2Shell facts are real-world data.
- **Three BSIMM refs are weak fits.** BSIMM has no matching activity for these three cards, so each lists the nearest one:
  - **Define your why (SM1.1):** BSIMM has no "set the program's goal" activity. SM1.1 is about publishing the program's process. The SAMM fit (Strategy & Metrics) is good.
  - **Meet with key partners (SM2.7):** SM2.7 is evangelism and internal marketing, which is pushing a message rather than listening. The SAMM fit is fair.
  - **Map your code delivery pipeline (SM3.4):** BSIMM has no "map the pipeline" activity. SM3.4 puts governance into the pipeline, and this card is its prerequisite. The SAMM fit (Secure Build) is good.
- **Other framework notes.** Neither framework names MFA or push-blocking secret scanning, because both are process models. BSIMM has no activity for internal remediation SLAs; SAMM does. Recheck the BSIMM IDs when BSIMM17 is published.
- **Measure cards matter more for the win count than the top score.** KPIs are in 95.76% of wins, but the best plan without them loses only 2.9 points. The metrics review is in 86.48% of wins and costs only 1.2 points. They add a small cut to every attack, which tips many plans over 80% without moving the best plan much.
- **Tools first is a narrow loss.** The best tools-first plan scores 78.0%, just under the bar. A player who does that can be close, so explain the half-strength warnings rather than calling the plan wrong.
- **Not yet timed.** There is no measured playthrough time yet.
- **The dev server can crash on an odd URL.** `server.js` (`npm start`) crashes on a request for `//` with an Invalid URL error. It affects local development only; the booth runs on nginx in Docker. If it happens, restart `npm start`.
