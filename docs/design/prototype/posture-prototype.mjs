// Brute-forces roadmaps when each company starts with some controls in place or partial.
// In place: free, full rating (still subject to foundation penalties).
// Partial: free at 50% of rating; upgrading to full costs half the control's full cost.
// A partial foundation removes half of its penalty.
// Defaults reproduce the configuration approved 2026-10-12 (bar 66, OrbitPay $90K/48 EW, MediSecure $80K/34 EW, RetailRush $250K/105 EW).
// Env: CAT, REG, POSTURE (file or "none"), PEN (json), WRES (capacity multiplier), BAR, OV (json overrides), ONLY, TOP
import fs from "node:fs";
const here = (file) => new URL(file, import.meta.url);
const { controls } = await import(process.env.CAT ? new URL(process.env.CAT, `file://${process.cwd()}/`) : here("./catalog.mjs"));
const PEN = JSON.parse(process.env.PEN || '{"vuln_mgmt":0.5,"inventory":0.35,"champions":0.25,"training":0.15,"detection":0.5}');
const BAR = Number(process.env.BAR || 66);
const WRES = Number(process.env.WRES || 1);
const posture = process.env.POSTURE === "none" ? {} : JSON.parse(fs.readFileSync(process.env.POSTURE || here("posture.json")));
const base = { dependency_vuln: 400, secret_leak: 150, credential_stuffing: 200, authz_flaw: 100, container_vuln: 60, ddos: 150, code_injection: 250, breach: 500, xss: 120, account_takeover: 180, design_flaw: 200, privilege_escalation: 220, misconfiguration: 180, supply_chain: 300 };
const idToThreat = { dep_vuln: "dependency_vuln", secret_leak: "secret_leak", cred_stuffing: "credential_stuffing", idor: "authz_flaw", container_vuln: "container_vuln", ddos: "ddos", sqli: "code_injection", breach: "breach", xss: "xss", ato: "account_takeover", design: "design_flaw", privesc: "privilege_escalation", misconfig: "misconfiguration" };
const reg0 = JSON.parse(fs.readFileSync(process.env.REG || here("reg3.json")));
const supply = { orbitpay: 0.08, medisecure: 0.08, retailrush: 0.12 };
const OV = JSON.parse(process.env.OV || "{}");
const companies = [
  { id: "orbitpay", name: "OrbitPay", headcount: 120, months: 6, budget: 90, weeks: 48, mult: 1.3 },
  { id: "medisecure", name: "MediSecure", headcount: 80, months: 12, budget: 80, weeks: 34, mult: 1.5 },
  { id: "retailrush", name: "RetailRush", headcount: 200, months: 18, budget: 250, weeks: 105, mult: 1.0 },
].map((c) => ({ ...c, ...(OV[c.id] || {}) })).map((c) => ({ ...c, weeks: Math.round(c.weeks * WRES) }));
const ids = Object.keys(controls);
const foundations = new Set(ids.filter((id) => controls[id].foundation));

function readiness(level, threats, inherent) {
  let residual = 0;
  const factor = {};
  for (const id of ids) if (level[id]) factor[id] = controls[id].needs.reduce((f, x) => f * (1 - PEN[x] * (1 - (level[x] || 0))), 1);
  for (const { t, el } of threats) {
    let left = 1;
    for (const id of ids) if (level[id]) { const c = controls[id]; left *= 1 - (c.mit[t] ?? c.all ?? 0) * level[id] * factor[id]; }
    residual += el * left;
  }
  return { rd: 100 * (1 - residual / inherent), residual };
}

for (const c of companies) {
  if (process.env.ONLY && process.env.ONLY !== c.id) continue;
  const scale = c.headcount / 100;
  const fullCost = (id) => { const [sk, mk, sw, mw] = controls[id].cost; return [Math.round(sk + mk * c.months * scale), Math.round((sw + mw * c.months) * scale)]; };
  const reg = Object.fromEntries(Object.entries(reg0[c.id]).map(([k, v]) => [idToThreat[k], v]));
  reg.supply_chain = supply[c.id];
  const threats = Object.keys(base).map((t) => ({ t, el: reg[t] * Math.round((base[t] * scale * c.mult) / 10) * 10 }));
  const inherent = threats.reduce((s, x) => s + x.el, 0);
  const start = {};
  for (const [id, st] of Object.entries(posture[c.id] || {})) start[id] = st === "in" ? 1 : 0.5;
  const options = ids.filter((id) => start[id] !== 1).map((id) => {
    const [b, w] = fullCost(id);
    return start[id] === 0.5 ? { id, kind: "upgrade", b: Math.round(b / 2), w: Math.round(w / 2) } : { id, kind: "buy", b, w };
  });
  const current = readiness(start, threats, inherent);
  const n = options.length;
  const results = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    let b = 0, w = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i)) { b += options[i].b; w += options[i].w; }
    if (b > c.budget || w > c.weeks) continue;
    let maximal = true;
    for (let i = 0; i < n; i++) if (!(mask & (1 << i)) && b + options[i].b <= c.budget && w + options[i].w <= c.weeks) { maximal = false; break; }
    const level = { ...start };
    const picked = options.filter((_, i) => mask & (1 << i));
    for (const o of picked) level[o.id] = 1;
    const r = readiness(level, threats, inherent);
    results.push({ picked, rd: Math.round(r.rd), b, w, maximal, foundationSpend: picked.some((o) => foundations.has(o.id)) });
  }
  results.sort((a, b) => b.rd - a.rd);
  const pass = results.filter((r) => r.rd >= BAR);
  const full = results.filter((r) => r.maximal), fullPass = full.filter((r) => r.rd >= BAR);
  const noF = results.filter((r) => !r.foundationSpend)[0];
  const label = (o) => (o.kind === "upgrade" ? `^${o.id}` : o.id);
  console.log(`${c.name}: current ${Math.round(current.rd)}% (inherent $${Math.round(inherent)}K, current $${Math.round(current.residual)}K)  best ${results[0].rd}%  best-without-foundations ${noF.rd}%  full-budget pass ${fullPass.length}/${full.length} (${(100 * fullPass.length / full.length).toFixed(1)}%)  winners ${pass.length}`);
  if (process.env.TOP !== "0") {
    for (const r of results.slice(0, Number(process.env.TOP || 4))) console.log(`   ${r.rd}% ${r.picked.map(label).join(" + ")}  $${r.b}K/${r.w}EW`);
    const freq = options.map((o) => [label(o), pass.filter((r) => r.picked.includes(o)).length]).sort((a, b) => b[1] - a[1]);
    console.log(`   in winners: ${freq.map(([k, v]) => `${k} ${pass.length ? Math.round(100 * v / pass.length) : 0}%`).join(", ")}`);
  }
}
