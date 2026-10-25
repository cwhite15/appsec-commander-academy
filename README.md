# AppSec Mission Commander Academy

A self-contained set of three AppSec program-building missions for SAINTCON 2026. Attendees learn the components of an application security program, defend a roadmap under resource pressure, and leave with a stack-ranked plan of their own. No model API, database, account, or API key is required. The missions work independently, while anonymous start/completion signals use the central tracker when internet access is available.

This is the Commander track of the SAINTCON AppSec Academy, alongside the [Cadet](https://github.com/sethlaw/appsec-cadet-academy) and [Communication Officer](https://github.com/sethlaw/appsec-officer-academy) academies, and shares their visual system.

## Missions

1. **The Command Protocols** (program components). Initiate the commands in four protocols (Define, Evaluate, Integrate, Measure) and pass a checkpoint for each one.
2. **The Resource Gauntlet** (prioritization under pressure). Choose one of three standalone companies (6, 12, or 18-month timelines), assess the controls it already runs, and fund or upgrade controls within its budget and per-phase engineer-weeks, choosing when each one starts, until expected loss across its 14-threat risk register falls by at least 62%. Controls ramp up over months, so sequencing matters. Then live through one possible timeline of five incidents, each landing in a set month.
3. **The Commander's Map** (roadmap planning). Fill in up to three initiatives (what, why, metric, timeline, investment, impact, effort), watch them stack-rank by impact vs. effort, pass the final checkpoint, and print the map.

Each mission follows the academy loop: gather evidence, make a decision, verify it. Wrong answers explain why they fail. Completing all three awards the **Mission Commander** qualification and the Hackers Challenge token.

## Run it

With Docker:

```sh
docker compose up --build
```

Open <http://localhost:8088>.

With Node.js 20 or later:

```sh
npm start
```

Open <http://localhost:8080>. There are no npm dependencies to install.

ES modules mean opening `index.html` directly with a `file:` URL is not supported.

## Test it

```sh
npm test
```

The tests cover checkpoint integrity, the risk registers, simulator scoring, foundations, starting posture, the cost model, resource limits, ranking, and input sanitizing. They also search every company's roadmaps, start months included (a few seconds), to show each one is winnable but hard: the best roadmap clears the bar comfortably, many different roadmaps win, and every control appears in some winning roadmap. That no roadmap wins without funding a foundation is proved exhaustively over every start month.

To see each company's difficulty and best roadmaps while tuning numbers:

```sh
node scripts/calibrate.mjs
```

## Re-skinning

Event copy, the CTF token, rank labels, image paths, color palette, and interaction timing live in [`js/config.js`](js/config.js), using the same shape as the other academies. [`assets/styles.css`](assets/styles.css) is the academy stylesheet unchanged, with Commander components appended in a marked section at the end.

Content is isolated from the UI:

- [`js/protocols.js`](js/protocols.js): Mission 01 protocol copy and checkpoints
- [`js/simulation.js`](js/simulation.js): Mission 02 scenarios, risk registers, starting posture, controls, incidents, and scoring
- [`js/roadmap.js`](js/roadmap.js): Mission 03 worksheet fields, ranking, and checkpoint

## Content source

The protocol copy, simulator scenarios, initiatives, and incidents come from the Wasatch AppSec community app's "Build an AppSec Roadmap" and "Roadmap Simulator" pages, originally built on Base44. Changes from the original:

- **Mission 02 was redesigned for SAINTCON 2026** (design specs and the calibration prototype are in [`docs/design/`](docs/design/)):
  - **18 controls** instead of 10, grouped by the five OWASP SAMM business functions and mapped to BSIMM16 and SAMM v2, with costs benchmarked against 2025–26 pricing.
  - **Four foundations** (Vulnerability Management, Inventory, Security Champions, Secure Coding Training) don't stop incidents themselves; each missing one cuts what the controls depending on it deliver.
  - **14 threats and a risk register per company.** Readiness is the share of inherent expected loss (likelihood × impact across every threat) that the company's controls remove. Passing requires 62%.
  - **A starting posture per company:** some controls are already in place or partial (including shelfware), and partial ones can be upgraded for half price.
  - **The five incidents are "one possible timeline"**, picked from the register by the biggest threats or by the biggest gaps today. The original drew 5 random incidents out of 8.
  - **Time to value:** each control starts now or after 3, 6, or 12 months and ramps up to full strength, capacity is split by phase, and the score weighs the loss during the timeline and the risk handed over at the end equally.
- Controls are partially effective and layer (SAST 70% + Secure Defaults 75% = 93% of injection); detection and incident response limit loss instead of preventing it. The original treated any matching control as 100% effective and scored fixed points per incident.
- Timelines are 6, 12, and 18 months instead of 6 to 10 weeks, and capacity is measured in engineer-weeks instead of engineer-hours. Each initiative costs a one-time setup plus a monthly run cost over the company's timeline, scaled to its headcount (see the comment at the top of `js/simulation.js`). Each company remains a separate, standalone scenario, with budget and capacity sized from a staffing story shown on its card.
- Incident financial impact is scaled to each company (size × sector exposure) instead of a flat $15K to $40K, and readiness is computed from it.
- Checkpoint questions were added to each protocol, written from that protocol's own guidance.

## Deployment notes

- The nginx configuration and the Node server send a strict Content-Security-Policy. The app has no inline scripts or style attributes; its only external request is anonymous activity telemetry to `https://appsec.community/api/activity`.
- Attendee progress and the map are stored only in that browser's `localStorage`. Everything typed into the map is escaped before rendering.
- Localhost and gateway-hosted sessions both send start/completion signals to the central tracker. Map content, decisions, scores, and user-entered text are never transmitted.
- **Reset progress** clears academy state plus the anonymous participant and browser-session identifiers, then reloads for the next attendee. Any queued, unsent events are retained for delivery.
- Reset progress from the header between attendees on a shared station. This also clears their map.
- Port `8088` follows the Cadet (`8086`) and Officer (`8087`) academies.

## Content map

```text
appsec-commander-academy/
├── assets/             Shared academy theme, fonts, and artwork
├── js/config.js        Event/rank/theme configuration
├── js/protocols.js     Mission 01 content and grading
├── js/simulation.js    Mission 02 content and scoring
├── js/roadmap.js       Mission 03 worksheet and ranking
├── js/app.js           UI, routing, progression, and mission flow
├── test/               Node built-in tests
├── scripts/            Calibration: brute-forces every affordable roadmap
├── docs/design/        Mission 02 design specs and prototype (not served)
├── Dockerfile          Production nginx image
├── docker-compose.yml  One-command local deployment
├── FACILITATOR.md      Booth operation and teaching notes
└── index.html          Application shell
```

## Artwork

The OWASP space logo, academy-ranks graphic, and fonts in `assets/` are the shared academy assets from the Cadet and Officer academies. The Commander academy has its own hero image (`saintcon-appsec-hero.webp`, the mission control "AppSec Program Launch" scene) and gray-background "AppSec Needs You" recruitment poster (`appsec-needs-you.png`).
