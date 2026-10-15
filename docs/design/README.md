# Mission 02 redesign: design specs

Design documents for the redesigned Mission 02 (the Resource Gauntlet). They are implemented in `js/simulation.js`, and `scripts/calibrate.mjs` reproduces the prototype's calibration with the real model. The specs are kept as the record of why the numbers are what they are; where they differ from `FACILITATOR.md`, the code and the facilitator guide win.

| File | What it is |
|---|---|
| `control-catalog.md` | 18-control catalog: foundations as efficacy multipliers, benchmarked costs, BSIMM16 / OWASP SAMM v2 mappings, effectiveness evidence, starting posture per company, regulatory citations, and the decision log |
| `risk-registers.md` | New incident cards and per-company risk registers (likelihood × impact). Its section 3 calibration is superseded by the catalog's section 7. |
| `time-to-value.md` | D (time to value): ramp-up, start choices, capacity per phase, the scoring options that were compared, the prototype's results, and the decisions taken |
| `prototype/` | Brute-force prototype that reproduces the approved calibration: `node docs/design/prototype/posture-prototype.mjs` (run from the repo root or the prototype folder). `ttv-prototype.mjs` adds time on top of the shipped model: `SCORE=blend:0.5 BAR=62 PHASES=half node docs/design/prototype/ttv-prototype.mjs` |

These documents include the answer key, so they are excluded from the Docker image, like `FACILITATOR.md`.
