# Mission 02 redesign: design specs

Design documents for the next version of Mission 02 (the Resource Gauntlet). The review round is complete; implementation is planned on the `risk-register` branch. Until then, the app on `main` still runs the original 10-control model.

| File | What it is |
|---|---|
| `control-catalog.md` | 18-control catalog: foundations as efficacy multipliers, benchmarked costs, BSIMM16 / OWASP SAMM v2 mappings, effectiveness evidence, starting posture per company, regulatory citations, and the decision log |
| `risk-registers.md` | New incident cards and per-company risk registers (likelihood × impact). Its section 3 calibration is superseded by the catalog's section 7. |
| `prototype/` | Brute-force prototype that reproduces the approved calibration: `node docs/design/prototype/posture-prototype.mjs` (run from the repo root or the prototype folder) |

These documents include the answer key, so they are excluded from the Docker image, like `FACILITATOR.md`.
