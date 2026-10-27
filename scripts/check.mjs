// Balance check for the Mission Commander path (model v2: 18 cards).
// Every number here is an ILLUSTRATIVE GAME VALUE, not industry data.
//
// Run: node scripts/check.mjs              exact: every feasible plan, split across worker threads
//      node scripts/check.mjs --sample N   uniform random sample of N feasible plans (fast, for tuning)
//
// How the exact search stays tractable:
// - Cards are visited in a needs-first (topological) order, so a card's strength, and its
//   effect on each attack, is final the moment it is placed. Scoring is incremental, O(attacks)
//   per leaf.
// - Budget and per-quarter FTE prune every branch that can't fit.
// - A counting DP over (card, budget left, FTE left per quarter) gives the exact number of
//   feasible plans under any prefix. That count balances the work across threads (largest
//   subtrees first), double-checks the enumeration total, and drives the uniform sampler.
// - Per-plan facts that only need a max or a count are folded into tables keyed by the set
//   of cards built (2^18 entries), so "best without card X" and "share of wins with X" are exact.

import os from "node:os";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { pathToFileURL, fileURLToPath } from "node:url";
import { initiatives, scenarios, resources, WIN_BAR, runAll, spend } from "../js/model.js";

const WELL = 0.8; // an attack counts as "well covered" at 80% reduction or more
const EPS = 1e-9;
const Q = resources.quarters.length;

// ---------- compile the model into flat arrays, in a needs-first order ----------
function compile() {
  const N = initiatives.length, S = scenarios.length;
  const modelIdx = Object.fromEntries(initiatives.map((c, i) => [c.id, i]));
  const depth = {};
  const depthOf = (id) => depth[id] ?? (depth[id] = Math.max(-1, ...(initiatives[modelIdx[id]].needs || []).map(depthOf)) + 1);
  const needed = new Set(initiatives.flatMap((c) => c.needs || []));
  // Cards others need come first (by chain depth), then the cards nothing needs, cheapest
  // first. With the paid ones last and in rising cost, once the budget can't cover the next
  // card it can't cover any later one, and the search jumps straight to the leaf.
  const order = initiatives.map((c, i) => i).sort((a, b) => {
    const A = initiatives[a], B = initiatives[b];
    return (needed.has(B.id) - needed.has(A.id)) || (needed.has(A.id) ? depthOf(A.id) - depthOf(B.id) : A.costK - B.costK) || (a - b);
  });
  const pos = Object.fromEntries(order.map((i, p) => [initiatives[i].id, p]));
  const cards = order.map((i) => initiatives[i]);
  for (const c of cards) {
    if (c.costK % 5) throw new Error(`${c.id}: cost must be a multiple of $5K`);
    if (Math.abs(c.fte * 2 - Math.round(c.fte * 2)) > EPS) throw new Error(`${c.id}: FTE must be a multiple of 0.5`);
  }
  const C = {
    N, S,
    ids: cards.map((c) => c.id),
    modelIdx: cards.map((c) => modelIdx[c.id]),
    cost: cards.map((c) => c.costK / 5),
    fte: cards.map((c) => Math.round(c.fte * 2)),
    capHalf: resources.fte.map((f) => Math.round(f * 2)),
    budgetU: Math.floor(resources.budgetK / 5),
    needs: cards.map((c) => (c.needs || []).map((id) => pos[id])),
    deps: cards.map((c) => cards.map((d, p) => ((d.needs || []).includes(c.id) ? p : -1)).filter((p) => p >= 0)),
    isTool: cards.map((c) => c.kind === "tool"),
    cutK: cards.map(() => []), cutV: cards.map(() => []), stopBits: cards.map(() => 0),
    w: scenarios.map((s) => s.weight)
  };
  scenarios.forEach((s, k) => {
    for (const [id, cut] of Object.entries(s.cuts)) { C.cutK[pos[id]].push(k); C.cutV[pos[id]].push(cut); }
    C.stopBits[pos[s.stops]] |= 1 << k;
  });
  for (let p = 0; p < N; p++) for (const j of C.needs[p]) if (j >= p) throw new Error("order is not needs-first");
  // from `paidTail` on, every card costs money and costs never fall
  C.paidTail = N;
  while (C.paidTail > 0 && C.cost[C.paidTail - 1] > 0 && (C.paidTail === N || C.cost[C.paidTail - 1] <= C.cost[C.paidTail])) C.paidTail--;
  C.foundations = [...Array(N).keys()].filter((p) => C.deps[p].length);
  return C;
}

// ---------- counting DP: feasible completions from (depth, budget left, FTE left) ----------
function makeCounter(C) {
  const memo = new Map();
  const count = (d, bud, f) => {
    if (d === C.N) return 1;
    const key = ((((d * 128 + bud) * 16 + f[0]) * 16 + f[1]) * 16 + f[2]) * 16 + f[3];
    let v = memo.get(key);
    if (v !== undefined) return v;
    v = count(d + 1, bud, f);
    if (C.cost[d] <= bud) for (let q = 0; q < Q; q++) if (C.fte[d] <= f[q]) {
      const g = f.slice(); g[q] -= C.fte[d];
      v += count(d + 1, bud - C.cost[d], g);
    }
    memo.set(key, v);
    return v;
  };
  return count;
}

// ---------- the search core: incremental scoring plus per-plan statistics ----------
const bitOfMask = (C, pick) => C.modelIdx.reduce((m, i, p) => (pick(p) ? m | (1 << i) : m), 0);
function newStats(C) {
  const S = C.S;
  return {
    feasible: 0, wins: 0, hist: new Float64Array(101),
    maskMax: new Float64Array(1 << C.N).fill(-1), maskWins: new Float64Array(1 << C.N),
    covBest: new Float64Array(1 << S).fill(-1), covWins: new Float64Array(1 << S), covExample: new Array(1 << S).fill(null),
    // plans counted by the set of attacks prevented, well covered, and left at 0% reduction
    stopCount: new Float64Array(1 << S), covCount: new Float64Array(1 << S), zeroCount: new Float64Array(1 << S), sum: new Float64Array(S),
    best: -1, bestPlan: null, maxMin: -1, maxMinPlan: null,
    lateAll: -1, lateAllPlan: null, naked: -1, nakedPlan: null, toolsFirst: -1, toolsFirstPlan: null,
    lateF: new Array(C.N).fill(-1)
  };
}

function makeCore(C) {
  const { N, S, cost, fte, needs, cutK, cutV, stopBits, w, deps, isTool, foundations } = C;
  const bitOf = C.modelIdx.map((i) => 1 << i); // built-set masks use model order
  const plan = new Int8Array(N).fill(-1), valid = new Uint8Array(N);
  const left = new Float64Array((N + 1) * S).fill(1);
  const stop = new Int32Array(N + 1), mask = new Int32Array(N + 1);
  // per depth: needs built in the same quarter or earlier (for "every enabler late"), and
  // tools with at least one need in place (for "tools without their enablers")
  const early = new Int32Array(N + 1), toolHelped = new Int32Array(N + 1);
  // per depth: latest quarter of any tool and earliest quarter of any process card built so far
  const lastTool = new Int8Array(N + 1).fill(-1), firstProcess = new Int8Array(N + 1).fill(Q);
  const halfPow = [1, 0.5, 0.25, 0.125, 0.0625];
  const needsMask = bitOfMask(C, (p) => C.needs[p].length > 0), toolNeedsMask = bitOfMask(C, (p) => C.isTool[p] && C.needs[p].length > 0);
  const fteLeft = Int32Array.from(C.capHalf);
  const red = new Float64Array(S);
  const st = newStats(C);
  const { hist, maskMax, maskWins, covBest, covWins, stopCount, covCount, zeroCount, sum } = st;
  const winBar = WIN_BAR - EPS, wellBar = WELL - EPS, paidTail = C.paidTail;

  // State lives in slots: slot d + 1 holds the state after building card d, so skipping a
  // card copies nothing (the next depth keeps reading the current slot). build() writes
  // slot d + 1 from slot `from` and returns it.
  function build(d, q, from) {
    const a = from * S, b = (d + 1) * S, to = d + 1;
    plan[d] = q;
    let m = 0, e = 0;
    const nd = needs[d];
    for (let t = 0; t < nd.length; t++) { const j = nd[t], pj = plan[j]; if (!valid[j] || pj > q) m++; if (pj >= 0 && pj <= q) e++; }
    valid[d] = m === 0 ? 1 : 0;
    for (let k = 0; k < S; k++) left[b + k] = left[a + k];
    const s = halfPow[m], ck = cutK[d], cv = cutV[d];
    for (let t = 0; t < ck.length; t++) left[b + ck[t]] *= 1 - cv[t] * s;
    stop[to] = m === 0 ? stop[from] | stopBits[d] : stop[from];
    mask[to] = mask[from] | bitOf[d];
    early[to] = early[from] + e;
    toolHelped[to] = toolHelped[from] + (isTool[d] && m < nd.length ? 1 : 0);
    lastTool[to] = isTool[d] && q > lastTool[from] ? q : lastTool[from];
    firstProcess[to] = !isTool[d] && q < firstProcess[from] ? q : firstProcess[from];
    return to;
  }

  // each enabler, built strictly after every card that needs it (at least one such card built)
  let lateFloor = -1;
  function lateChecks(score) {
    for (const f of foundations) {
      if (score <= st.lateF[f] || plan[f] < 0) continue;
      let ok = true, any = false;
      for (const d of deps[f]) if (plan[d] >= 0) { any = true; if (plan[f] <= plan[d]) { ok = false; break; } }
      if (ok && any) st.lateF[f] = score;
    }
    let lo = 2;
    for (const f of foundations) if (st.lateF[f] < lo) lo = st.lateF[f];
    lateFloor = lo;
  }

  // score the finished plan in plan[] and fold it into the statistics
  function leaf(sl) {
    const sm = stop[sl], m = mask[sl], lb = sl * S;
    let score = 0, min = 2, cov = 0, zero = 0;
    for (let k = 0; k < S; k++) {
      const r = (sm >> k) & 1 ? 1 : 1 - left[lb + k];
      red[k] = r; score += w[k] * r; sum[k] += r;
      if (r < min) min = r;
      if (r >= wellBar) cov |= 1 << k; else if (r <= EPS) zero |= 1 << k;
    }
    st.feasible++;
    hist[(score * 100 + EPS) | 0]++;
    stopCount[sm]++; covCount[cov]++; zeroCount[zero]++;
    if (score > maskMax[m]) maskMax[m] = score;
    if (score > covBest[cov]) covBest[cov] = score;
    if (score >= winBar) {
      st.wins++; maskWins[m]++; covWins[cov]++;
      const ex = st.covExample[cov];
      if (!ex || score > ex.score - EPS) {
        let n = 0; for (let x = m; x; x &= x - 1) n++;
        if (!ex || score > ex.score + EPS || n < ex.n) st.covExample[cov] = { score, n, plan: Int8Array.from(plan) };
      }
    }
    if (min > st.maxMin) { st.maxMin = min; st.maxMinPlan = Int8Array.from(plan); }
    if (score > st.best) { st.best = score; st.bestPlan = Int8Array.from(plan); }
    // every card with needs has each built need strictly later (needs skipped or built after)
    if (score > st.lateAll && early[sl] === 0 && (m & needsMask)) { st.lateAll = score; st.lateAllPlan = Int8Array.from(plan); }
    // every tool built without any of its needs in place
    if (score > st.naked && toolHelped[sl] === 0 && (m & toolNeedsMask)) { st.naked = score; st.nakedPlan = Int8Array.from(plan); }
    // tools first: at least one tool, and every process card skipped or built after the last tool
    if (score > st.toolsFirst && lastTool[sl] >= 0 && firstProcess[sl] > lastTool[sl]) { st.toolsFirst = score; st.toolsFirstPlan = Int8Array.from(plan); }
    if (score > lateFloor) lateChecks(score);
    return score;
  }

  function dfs(d, bud, sl) {
    // past the end, or nothing from here on is affordable: plan[d..] is already -1
    if (d === N || (d >= paidTail && cost[d] > bud)) { leaf(sl); return; }
    dfs(d + 1, bud, sl);
    const c = cost[d];
    if (c <= bud) {
      const f = fte[d];
      for (let q = 0; q < Q; q++) {
        if (f > fteLeft[q]) continue;
        fteLeft[q] -= f; dfs(d + 1, bud - c, build(d, q, sl)); fteLeft[q] += f;
      }
      plan[d] = -1; valid[d] = 0;
    }
  }

  // run the whole subtree under a fixed prefix of placements
  function runPrefix(prefix) {
    fteLeft.set(C.capHalf);
    let bud = C.budgetU, sl = 0;
    for (let d = 0; d < prefix.length; d++) {
      const q = prefix[d];
      if (q >= 0) { fteLeft[q] -= fte[d]; bud -= cost[d]; sl = build(d, q, sl); } else { plan[d] = -1; valid[d] = 0; }
    }
    dfs(prefix.length, bud, sl);
    for (let d = 0; d < prefix.length; d++) { plan[d] = -1; valid[d] = 0; }
  }

  // score one complete plan (array of quarters, in search order) and count it once
  function runPlan(full) {
    let sl = 0;
    for (let d = 0; d < N; d++) { if (full[d] >= 0) sl = build(d, full[d], sl); else { plan[d] = -1; valid[d] = 0; } }
    const score = leaf(sl);
    return { score, red: Float64Array.from(red) };
  }

  return { st, runPrefix, runPlan };
}

// ---------- merging per-thread statistics ----------
function merge(a, b, C) {
  a.feasible += b.feasible; a.wins += b.wins;
  for (let i = 0; i < a.hist.length; i++) a.hist[i] += b.hist[i];
  for (let m = 0; m < a.maskMax.length; m++) { if (b.maskMax[m] > a.maskMax[m]) a.maskMax[m] = b.maskMax[m]; a.maskWins[m] += b.maskWins[m]; }
  for (let m = 0; m < a.covBest.length; m++) {
    if (b.covBest[m] > a.covBest[m]) a.covBest[m] = b.covBest[m];
    a.covWins[m] += b.covWins[m];
    const x = a.covExample[m], y = b.covExample[m];
    if (y && (!x || y.score > x.score + EPS || (Math.abs(y.score - x.score) <= EPS && y.n < x.n))) a.covExample[m] = y;
  }
  for (const key of ["stopCount", "covCount", "zeroCount"]) for (let m = 0; m < a[key].length; m++) a[key][m] += b[key][m];
  for (let k = 0; k < C.S; k++) a.sum[k] += b.sum[k];
  for (const [v, p] of [["best", "bestPlan"], ["maxMin", "maxMinPlan"], ["lateAll", "lateAllPlan"], ["naked", "nakedPlan"], ["toolsFirst", "toolsFirstPlan"]]) if (b[v] > a[v]) { a[v] = b[v]; a[p] = b[p]; }
  for (let f = 0; f < C.N; f++) if (b.lateF[f] > a.lateF[f]) a.lateF[f] = b.lateF[f];
  return a;
}

// ---------- worker thread ----------
if (!isMainThread && workerData?.role === "check-worker") {
  const C = compile();
  const core = makeCore(C);
  parentPort.on("message", (msg) => {
    if (msg.type === "run") { for (const p of msg.prefixes) core.runPrefix(p); parentPort.postMessage({ type: "done" }); }
    else if (msg.type === "finish") { parentPort.postMessage({ type: "stats", st: core.st }); }
  });
}

// ---------- exact search across threads ----------
async function exact(C, count, threadCap) {
  // prefixes: every feasible placement of the first P cards, largest subtree first
  const P = Math.min(6, C.N);
  const prefixes = [];
  const walk = (d, bud, f, pref) => {
    if (d === P) { prefixes.push({ pref: pref.slice(), size: count(d, bud, f) }); return; }
    pref.push(-1); walk(d + 1, bud, f, pref); pref.pop();
    if (C.cost[d] <= bud) for (let q = 0; q < Q; q++) if (C.fte[d] <= f[q]) {
      const g = f.slice(); g[q] -= C.fte[d];
      pref.push(q); walk(d + 1, bud - C.cost[d], g, pref); pref.pop();
    }
  };
  walk(0, C.budgetU, C.capHalf.slice(), []);
  prefixes.sort((a, b) => b.size - a.size);
  const threads = Math.max(1, Math.min(threadCap ?? os.availableParallelism?.() ?? os.cpus().length, 32));
  if (threads === 1) { // in-process (also sees any in-memory edits to the model)
    const core = makeCore(C);
    for (const p of prefixes) core.runPrefix(p.pref);
    return { st: core.st, threads, tasks: prefixes.length };
  }
  let next = 0;
  const results = await Promise.all([...Array(threads)].map(() => new Promise((resolve, reject) => {
    const wk = new Worker(fileURLToPath(import.meta.url), { workerData: { role: "check-worker" } });
    const feed = () => {
      if (next < prefixes.length) wk.postMessage({ type: "run", prefixes: [prefixes[next++].pref] });
      else wk.postMessage({ type: "finish" });
    };
    wk.on("message", (msg) => { if (msg.type === "done") feed(); else if (msg.type === "stats") { resolve(msg.st); wk.terminate(); } });
    wk.on("error", reject);
    feed();
  })));
  return { st: results.reduce((a, b) => merge(a, b, C)), threads, tasks: prefixes.length };
}

// ---------- uniform sampler over feasible plans ----------
function rng(seed) {
  let a = seed >>> 0;
  const u32 = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  };
  return () => (u32() * 2 ** 21 + (u32() >>> 11)) / 2 ** 53; // 53-bit uniform in [0, 1)
}
function samplePlan(C, count, next) {
  const full = new Int8Array(C.N);
  let bud = C.budgetU, f = C.capHalf.slice();
  for (let d = 0; d < C.N; d++) {
    const opts = [[-1, bud, f]];
    if (C.cost[d] <= bud) for (let q = 0; q < Q; q++) if (C.fte[d] <= f[q]) { const g = f.slice(); g[q] -= C.fte[d]; opts.push([q, bud - C.cost[d], g]); }
    const weights = opts.map(([, b, g]) => count(d + 1, b, g));
    let r = next() * weights.reduce((s, x) => s + x, 0), pick = 0;
    while (pick < opts.length - 1 && r >= weights[pick]) { r -= weights[pick]; pick++; }
    [full[d], bud, f] = opts[pick];
  }
  return full;
}

// ---------- analysis entry point ----------
export async function analyze({ sample = 0, seed = 2026, threads: threadCap } = {}) {
  const C = compile();
  const count = makeCounter(C);
  const total = count(0, C.budgetU, C.capHalf);
  const t0 = Date.now();
  let st, threads = 1, tasks = 0;
  if (sample) {
    const core = makeCore(C), next = rng(seed);
    for (let i = 0; i < sample; i++) core.runPlan(samplePlan(C, count, next));
    st = core.st;
  } else {
    ({ st, threads, tasks } = await exact(C, count, threadCap));
  }
  const secs = (Date.now() - t0) / 1000;

  // cross-check the fast scorer against model.runAll / spend on uniform random plans
  const xcore = makeCore(C), xnext = rng(seed + 1);
  let checked = 0, mismatches = 0;
  for (let i = 0; i < 20000; i++) {
    const full = samplePlan(C, count, xnext);
    const { red } = xcore.runPlan(full);
    const obj = toObj(C, full), ref = runAll(obj), used = spend(obj);
    const fitsOk = used.budgetK <= resources.budgetK && used.fte.every((x, q) => x <= resources.fte[q] + EPS);
    checked++;
    if (!fitsOk || ref.results.some((x, k) => Math.abs(x.reduction - red[k]) > 1e-9) || Math.abs(ref.score - red.reduce((s, r, k) => s + C.w[k] * r, 0)) > 1e-9) mismatches++;
  }
  return { C, st, total, secs, threads, tasks, sample, checked, mismatches };
}

const toObj = (C, p) => Object.fromEntries([...p].map((q, d) => [C.ids[d], q]).filter(([, q]) => q >= 0));

// ---------- report ----------
async function report() {
  const argIdx = process.argv.indexOf("--sample");
  const sample = argIdx > 0 ? Number(process.argv[argIdx + 1] || 1e6) : 0;
  const tStart = Date.now();
  const { C, st, total, secs, threads, tasks, checked, mismatches } = await analyze({ sample });
  const S = C.S, N = C.N;
  const tag = sample ? " [sampled]" : "";
  const pct = (x, of) => (of ? ((100 * x) / of).toFixed(2) : "0.00") + "%";
  const p0 = (x) => `${Math.round(x * 100)}%`;
  const p1 = (x) => `${(x * 100).toFixed(1)}%`;
  const ids = (mask) => scenarios.filter((_, k) => mask & (1 << k)).map((s) => s.id).join("+") || "(none)";
  const showPlan = (p, indent = "    ") => {
    const obj = p instanceof Int8Array || Array.isArray(p) ? toObj(C, p) : p;
    const res = runAll(obj), used = spend(obj);
    console.log(`${indent}$${used.budgetK}K, FTE ${used.fte.join("/")}, score ${p1(res.score)}${res.won ? " WIN" : ""}`);
    for (let q = 0; q < Q; q++) console.log(`${indent}${resources.quarters[q]}: ${Object.entries(obj).filter(([, v]) => v === q).map(([id]) => id).join(", ") || "-"}`);
    console.log(`${indent}${res.results.map((x) => `${x.scenario.id} ${p0(x.reduction)}${x.outcome === "prevented" ? "*" : ""}`).join(" | ")}   (* prevented)`);
  };
  // exact facts folded from the built-set tables
  const bestWithout = new Array(N).fill(-1), winsWith = new Array(N).fill(0);
  let bestNoProcess = -1, bestNoTools = -1;
  const processMask = initiatives.reduce((m, c, i) => (c.kind === "process" ? m | (1 << i) : m), 0);
  for (let m = 0; m < st.maskMax.length; m++) {
    const v = st.maskMax[m];
    if (v < 0) continue;
    for (let i = 0; i < N; i++) {
      if (m & (1 << i)) winsWith[i] += st.maskWins[m];
      else if (v > bestWithout[i]) bestWithout[i] = v;
    }
    if (!(m & processMask) && v > bestNoProcess) bestNoProcess = v;
    if (!(m & ~processMask) && v > bestNoTools) bestNoTools = v;
  }

  console.log(`Mission Commander balance check, model v2 (budget $${resources.budgetK}K, FTE caps ${resources.fte.join("/")}, win bar ${p0(WIN_BAR)})`);
  console.log(sample
    ? `Mode: SAMPLED, ${sample.toLocaleString()} uniform random feasible plans (counting-DP sampler), ${secs.toFixed(1)}s. Extremes below are sample maxima, not exact.`
    : `Mode: EXACT, every feasible plan, ${threads} threads, ${tasks.toLocaleString()} subtrees, ${secs.toFixed(1)}s search, ${((Date.now() - tStart) / 1000).toFixed(1)}s total`);
  console.log(`Weights: ${scenarios.map((s) => `${s.id} ${s.weight} (${s.likelihood})`).join(", ")}`);
  console.log(`Cards: ${initiatives.map((c) => `${c.id} $${c.costK}K/${c.fte}`).join(", ")}`);
  console.log(`Scorer cross-check vs model.runAll and spend: ${checked.toLocaleString()} uniform random plans, ${mismatches} mismatches`);
  console.log(`\nFeasible plans (counting DP): ${total.toLocaleString()}${sample ? "" : `; enumerated: ${st.feasible.toLocaleString()} ${st.feasible === total ? "(match)" : "(MISMATCH)"}`}`);
  console.log(`Score distribution${tag}:`);
  for (let b = 0; b < 10; b++) {
    const n = st.hist.slice(b * 10, b === 9 ? 101 : b * 10 + 10).reduce((s, x) => s + x, 0);
    console.log(`  ${String(b * 10).padStart(2)}-${b === 9 ? "100" : String(b * 10 + 9).padStart(2)}%: ${n.toLocaleString().padStart(15)}  ${pct(n, st.feasible).padStart(7)}`);
  }
  const share = st.wins / st.feasible;
  if (sample) {
    const z = 1.96, n = st.feasible, den = 1 + z * z / n, mid = (share + z * z / (2 * n)) / den, half = (z * Math.sqrt(share * (1 - share) / n + z * z / (4 * n * n))) / den;
    console.log(`Wins (score >= ${p0(WIN_BAR)})${tag}: ${st.wins.toLocaleString()} of ${n.toLocaleString()} (${(share * 100).toFixed(2)}%, 95% Wilson CI ${((mid - half) * 100).toFixed(2)}-${((mid + half) * 100).toFixed(2)}%)`);
  } else {
    console.log(`Wins (score >= ${p0(WIN_BAR)}): ${st.wins.toLocaleString()} (${(share * 100).toFixed(3)}%)`);
  }
  console.log(`Best score${tag}: ${p1(st.best)}`);
  showPlan(st.bestPlan);

  console.log(`\nNo all-round plan${tag}: max over plans of the weakest attack's reduction = ${p1(st.maxMin)}`);
  showPlan(st.maxMinPlan);

  console.log(`\nPer attack, share of feasible plans${tag}:`);
  scenarios.forEach((s, k) => {
    const bitSum = (table) => table.reduce((acc, n, m) => (m & (1 << k) ? acc + n : acc), 0);
    const prevented = bitSum(st.stopCount), unprotected = bitSum(st.zeroCount), well = bitSum(st.covCount), reduced = st.feasible - prevented - unprotected;
    console.log(`  ${s.id.padEnd(7)} w ${s.weight.toFixed(2)}  prevented ${pct(prevented, st.feasible).padStart(7)}  reduced ${pct(reduced, st.feasible).padStart(7)}  unprotected ${pct(unprotected, st.feasible).padStart(7)}  well covered ${pct(well, st.feasible).padStart(7)}  mean ${p0(st.sum[k] / st.feasible)}`);
  });

  // weights matter
  const likelyMask = scenarios.reduce((m, s, k) => (s.likelihood === "Likely" ? m | (1 << k) : m), 0);
  const lessMask = scenarios.reduce((m, s, k) => (s.likelihood === "Less likely" ? m | (1 << k) : m), 0);
  let bestNoLikely = 0, bestLessFirst = 0, bestAllLikely = 0, winsAllLikely = 0, winsMissingLikely = 0;
  for (let m = 0; m < 1 << S; m++) {
    if (st.covBest[m] < 0) continue;
    if ((m & likelyMask) === 0) bestNoLikely = Math.max(bestNoLikely, st.covBest[m]);
    const likelyCovered = [...Array(S).keys()].filter((k) => likelyMask & m & (1 << k)).length;
    if ((m & lessMask) === lessMask && likelyCovered <= 1) bestLessFirst = Math.max(bestLessFirst, st.covBest[m]);
    if ((m & likelyMask) === likelyMask) { winsAllLikely += st.covWins[m]; bestAllLikely = Math.max(bestAllLikely, st.covBest[m]); } else winsMissingLikely += st.covWins[m];
  }
  console.log(`\nWeights matter${tag}:`);
  console.log(`  best score, no Likely attack well covered:                    ${p1(bestNoLikely)}`);
  console.log(`  best score, both Less likely covered but <= 1 Likely covered: ${p1(bestLessFirst)}`);
  console.log(`  best score, all three Likely covered:                         ${p1(bestAllLikely)}`);
  console.log(`  winning plans covering all three Likely attacks well: ${winsAllLikely.toLocaleString()}; missing a Likely one: ${winsMissingLikely.toLocaleString()}`);

  console.log(`\nWays to win${tag} (sets of attacks well covered, >= 80%, across winning plans):`);
  const masks = [...Array(1 << S).keys()].filter((m) => st.covWins[m] > 0).sort((a, b) => st.covWins[b] - st.covWins[a]);
  for (const m of masks) console.log(`  ${ids(m).padEnd(36)} ${st.covWins[m].toLocaleString().padStart(13)}  ${pct(st.covWins[m], st.wins).padStart(7)} of wins`);
  console.log(`  distinct ways to win: ${masks.length}; ways with >= 1% of wins: ${masks.filter((m) => st.covWins[m] >= 0.01 * st.wins).length}`);
  console.log("\nExample winning plans (highest score for each of the top three ways to win):");
  for (const m of masks.slice(0, 3)) { console.log(`  covers ${ids(m)}:`); showPlan(st.covExample[m].plan); }

  console.log(`\nCards in winning plans${tag} (best score without it is ${sample ? "a sample max" : "exact"}):`);
  initiatives.forEach((item, i) => {
    const tags = `${item.kind === "process" ? " [process]" : " [tool]"}${item.foundation ? " [foundation]" : ""}`;
    const dead = winsWith[i] === 0 ? "  <- DEAD CARD (in no winning plan)" : "";
    console.log(`  ${item.id.padEnd(17)} in ${pct(winsWith[i], st.wins).padStart(7)} of wins; best without it ${p1(bestWithout[i]).padStart(6)} (${((bestWithout[i] - st.best) * 100).toFixed(1).padStart(5)} pts)${bestWithout[i] < WIN_BAR - EPS ? " cannot win" : ""}${tags}${dead}`);
  });

  console.log(`\nEnablers proof${tag} (best ${p1(st.best)} with everything allowed):`);
  for (const f of C.foundations) {
    const i = C.modelIdx[f];
    const deps = C.deps[f].map((d) => C.ids[d]).join(", ");
    const late = st.lateF[f] < 0 ? "   n/a" : `${p1(st.lateF[f]).padStart(6)} (${((st.lateF[f] - st.best) * 100).toFixed(1).padStart(5)})`;
    console.log(`  ${C.ids[f].padEnd(17)} skipped: best ${p1(bestWithout[i]).padStart(6)} (${((bestWithout[i] - st.best) * 100).toFixed(1).padStart(5)}), winning plans that skip it ${pct(st.wins - winsWith[i], st.wins).padStart(7)} | built after every card that needs it (${deps}): best ${late}`);
  }
  console.log(`  every enabler skipped or built after the cards that need it: best ${p1(st.lateAll)}  ${st.lateAll >= WIN_BAR - EPS ? "CAN STILL WIN" : "cannot win"}`);
  showPlan(st.lateAllPlan);

  console.log(`\nNaive tools-first plans${tag}:`);
  console.log(`  best plan with no process cards at all: ${p1(bestNoProcess)}`);
  console.log(`  best plan with tools first (every process card skipped or built after the last tool): ${p1(st.toolsFirst)}`);
  showPlan(st.toolsFirstPlan);
  console.log(`  stricter bound: best plan where no tool has any of its enablers in place, process otherwise free: ${p1(st.naked)}`);
  showPlan(st.nakedPlan);
  console.log(`  for scale: best plan with no tools at all (process only): ${p1(bestNoTools)}`);
  const naivePlans = [
    ["Buy the big tools in Q1-Q2, no process work", { sca: 0, mfa: 0, sast: 1 }],
    ["Tools first, enablers after", { sca: 0, mfa: 0, sast: 1, inventory: 2, fix_slas: 2, pipeline: 2, operating_model: 3, partners: 3, champions: 3 }]
  ];
  for (const [name, p] of naivePlans) {
    const used = spend(p);
    const ok = used.budgetK <= resources.budgetK && used.fte.every((f, q) => f <= resources.fte[q] + EPS);
    console.log(`  ${name}${ok ? "" : "  (DOES NOT FIT budget/FTE)"}:`);
    showPlan(p);
  }

  // targets, as in the v1 check (thresholds are design targets, not data)
  const ways1 = masks.filter((m) => st.covWins[m] >= 0.01 * st.wins).length;
  const minShare = Math.min(...winsWith.map((x) => x / st.wins));
  const enablerHurts = C.foundations.every((f) => bestWithout[C.modelIdx[f]] < st.best - EPS && st.lateF[f] < st.best - EPS);
  const checks = [
    [`win share ${(share * 100).toFixed(2)}% in 1-10%`, share >= 0.01 && share <= 0.1],
    [`best ${p1(st.best)} in 85-99%`, st.best >= 0.85 && st.best < 0.99],
    [`all-round max-min ${p1(st.maxMin)} <= 75%`, st.maxMin <= 0.75],
    [`weights matter: no Likely covered ${p1(bestNoLikely)} < 80%, and Less-likely-first ${p1(bestLessFirst)} < all Likely covered ${p1(bestAllLikely)}`, bestNoLikely < WIN_BAR && bestLessFirst < bestAllLikely - EPS],
    [`ways to win with >= 1% of wins: ${ways1} (>= 5)`, ways1 >= 5],
    [`naive: no process ${p1(bestNoProcess)}, tools first ${p1(st.toolsFirst)}, enablers all late ${p1(st.lateAll)} all < 80%`, Math.max(bestNoProcess, st.toolsFirst, st.lateAll) < WIN_BAR],
    ["every enabler: skipping it or building it late lowers the best score", enablerHurts],
    [`no dead cards: every card in >= 10% of wins (lowest ${(minShare * 100).toFixed(1)}%)`, minShare >= 0.1]
  ];
  console.log(`\nTargets${tag}:`);
  for (const [text, ok] of checks) console.log(`  ${ok ? "PASS" : "FAIL"}  ${text}`);
}

if (isMainThread && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) report();
