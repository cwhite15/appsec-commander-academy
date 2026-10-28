// End-of-year attack simulator: canvas renderer for the plan that engine.js builds.
// Pure Canvas 2D, no network, no inline styles. Everything is drawn in code.
//
// mountSimulator(canvas, sim, { reducedMotion, onShot(shot, index), onDone() })
//   returns { skip(), destroy() }
//
// The animation is a pure function of time `t` over a timeline built from `sim`,
// so skip() can jump straight to the final frame deterministically.

const SHIELD_BASE = 1.15; // engine: the shield starts here (world units)
const GHOST_DEPTH = 0.35; // dashed outline depth drawn for an empty lane
const MIN_WORLD_R = 2.3; // normalisation floor, so a sparse plan doesn't zoom in
const BUILDING_UNIT = 0.05; // world units per building pixel
const SEAM = 2; // px inset on each side of a piece, so stacked pieces show a ~4px seam

const DROP_STAGGER = 0.4;
const DROP_DUR = 0.45;
const SHIP_ENTER = 1.0;
const SHIP_SWEEP = 4.2; // two full side-to-side sweeps, deliberate pace
const SHOT_MOVE = 0.75; // ship glides to its firing position
const SHOT_TRAVEL = 0.45;
const LEAK_DUR = 0.3;
const SHIP_EXIT = 1.5;
const TARGET_TOTAL = 24;
const SHOT_GAP_MIN = 1.6;
const SHOT_GAP_MAX = 1.8;

const FALLBACK = {
  ink: "#0c1116", cyan: "#73e5f1", amber: "#f9c401", coral: "#f8781e",
  teal: "#587d80", paper: "#f3e5c3", muted: "#d9cba1"
};
const SHIP_RED = { R: "#e0333f", r: "#8e1b2a", h: "#ff7a7f" };

// Original pixel-art office block: a tower with an antenna and two lit wings.
// . empty, e edge, w wall, c cyan window, a amber window, d door, f foundation, g beacon
const BUILDING = [
  "............gg............",
  "............ee............",
  "........eeeeeeeeee........",
  "........ewwwwwwwwe........",
  "........ewcwccwcwe........",
  "........ewwwwwwwwe........",
  "........ewawccwawe........",
  "........ewwwwwwwwe........",
  "..eeeeeeewcwccwcweeeeeee..",
  "..ewwwwwewwwwwwwwewwwwwe..",
  "..ecwawcewcwccwcwecwawce..",
  "..ewwwwwewwwwwwwwewwwwwe..",
  "..eacwcaewawccwaweacwcae..",
  "..ewwwwwewwwwwwwwewwwwwe..",
  "..ewwwwwewwwddwwwewwwwwe..",
  "..ewwwwwewwwddwwwewwwwwe..",
  "..ewwwwwewwwddwwwewwwwwe..",
  "ffffffffffffffffffffffffff"
];

// Original red saucer-class raider: glass dome, broad hull with a running-light belt,
// three landing struts and thrusters. Deliberately unlike the Taito invader sprite.
// k glass, K glint, h hull highlight, R hull, r hull shadow, y running light, t thruster
const SHIP = [
  "......kkkkk......",
  ".....kkKkkkk.....",
  "...hRRRRRRRRRh...",
  ".hRRRRRRRRRRRRRh.",
  "rRyRRyRRyRRyRRyRr",
  ".rrrrrrrrrrrrrrr.",
  "..rr..rrrrr..rr..",
  "..tt...ttt...tt.."
];

export function mountSimulator(canvas, sim, options = {}) {
  const opts = options || {};
  const ctx = canvas.getContext("2d");
  const model = prepare(sim || {});
  const tl = buildTimeline(model);

  let colors = readColors();
  let dpr = 1;
  let cssW = 0;
  let cssH = 0;
  let layout = null;
  let t = 0;
  let lastNow = null;
  let raf = 0;
  let fired = 0;
  let done = false;
  let destroyed = false;

  resize(true);

  const ro = typeof ResizeObserver === "function" ? new ResizeObserver(() => resize(false)) : null;
  if (ro) ro.observe(canvas);

  if (typeof document !== "undefined" && document.fonts) {
    const fontsLoaded = () => { if (!destroyed) { layout = computeLayout(); draw(); } };
    try {
      Promise.all([document.fonts.load(`13px ${colors.headingFont}`), document.fonts.ready])
        .then(fontsLoaded, fontsLoaded);
    } catch { /* font loading is cosmetic */ }
  }

  if (opts.reducedMotion) {
    t = tl.total;
    draw();
    fireShotsUpTo(Infinity);
    finish();
  } else {
    draw();
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    raf = 0;
    if (destroyed || done) return;
    if (lastNow === null) lastNow = now;
    // Clamp dt so a backgrounded tab pauses the show instead of jumping through it.
    const dt = Math.min(0.1, Math.max(0, (now - lastNow) / 1000));
    lastNow = now;
    t = Math.min(tl.total, t + dt);
    if (window.devicePixelRatio !== dpr) resize(false);
    draw();
    fireShotsUpTo(t);
    if (destroyed) return;
    if (t >= tl.total) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  function fireShotsUpTo(time) {
    while (!destroyed && fired < model.shots.length && tl.shots[fired].impact <= time) {
      const index = fired;
      fired += 1;
      call(opts.onShot, model.shots[index].raw, index);
    }
  }

  function finish() {
    if (done || destroyed) return;
    fireShotsUpTo(Infinity);
    if (destroyed) return;
    done = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    call(opts.onDone);
  }

  function skip() {
    if (done || destroyed) return;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    t = tl.total;
    draw();
    finish();
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (ro) ro.disconnect();
  }

  function resize(force) {
    if (destroyed) return;
    const rect = canvas.getBoundingClientRect();
    const w = canvas.clientWidth || rect.width || 640;
    const h = canvas.clientHeight || rect.height || 420;
    const ratio = window.devicePixelRatio || 1;
    if (!force && w === cssW && h === cssH && ratio === dpr) return;
    cssW = w;
    cssH = h;
    dpr = ratio;
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== pw) canvas.width = pw;
    if (canvas.height !== ph) canvas.height = ph;
    colors = readColors();
    layout = computeLayout();
    if (!force) draw();
  }

  /* ---------------- layout ---------------- */

  function computeLayout() {
    const W = cssW;
    const H = cssH;
    const pad = 8;
    const fs = clamp(Math.round(Math.min(W, H * 1.5) / 50), 11, 13);
    const q = clamp(Math.floor(Math.min(W, H * 1.6) / 160), 2, 4);
    const shipW = SHIP[0].length * q;
    const shipH = SHIP.length * q;
    const bottomBand = fs + 14;
    const cx = W / 2;
    const shipY = pad + shipH / 2 + 2;
    const topReserve = shipY + shipH / 2 + pad;
    const mono = colors.monoFont;
    const outFont = `700 ${fs}px ${mono}`;
    const nameFont = `${fs}px ${mono}`;
    const lh = fs + 4;
    const cg = 6;
    const base = { W, H, pad, fs, lh, cx, cg, topReserve };

    // Mode 1, wide canvases: a callout at each impact (attack name wrapped above the outcome).
    let mode = null;
    if (W >= 560 && H <= W * 0.85 && model.shots.length) {
      const oy = H - bottomBand;
      const ms = model.shots.map((shot) => {
        const text = outcomeText(shot);
        ctx.font = outFont;
        const ow = ctx.measureText(text).width;
        ctx.font = nameFont;
        const lines = wrapWordsWith(ctx, shot.label, Math.max(ow, 80));
        const nw = lines.reduce((m, line) => Math.max(m, ctx.measureText(line).width), 0);
        return { text, lines, lane: shot.lane, w: Math.ceil(Math.max(ow, nw)) + 14, h: 6 + (lines.length + 1) * lh };
      });
      const solve = (reserve) => {
        let rs = Math.min(W / 2 - pad, oy - topReserve);
        for (const m of ms) {
          const lane = model.laneMap.get(m.lane);
          if (!lane) continue;
          const c = Math.cos(lane.angle);
          const sn = Math.max(0.05, Math.sin(lane.angle));
          const ac = Math.abs(c);
          const extra = reserve ? m.h + 4 : 0;
          const horiz = ac > 0.35 ? (W / 2 - pad - m.w) / ac - cg : (W / 2 - pad - m.w / 2) / Math.max(ac, 1e-3) - cg;
          const vert = ac > 0.35 ? (oy - topReserve - m.h / 2 - extra) / sn - cg : (oy - topReserve - m.h - extra) / sn - cg;
          rs = Math.min(rs, horiz, vert);
        }
        const s = Math.max(rs, 40) / model.maxR;
        const placed = placeCallouts({ ...base, oy, s }, ms);
        return { s, placed, ok: placed.every((c) => c.ok) };
      };
      let res = solve(false);
      if (!res.ok) res = solve(true);
      // Fall back to the legend when callouts can't fit cleanly or would shrink the scene too far.
      if (res.ok && res.s * model.maxR >= Math.min(W * 0.28, H * 0.42)) {
        mode = { kind: "callouts", oy, s: res.s, callouts: res.placed };
      }
    }

    // Mode 2, narrow or tall canvases: numbered badges at the lanes and a stacked legend
    // under the ground line ("N  Name · OUTCOME"), so labels never overlap.
    if (!mode) {
      const badge = fs + 6;
      ctx.font = nameFont;
      const sepW = ctx.measureText(" · ").width;
      const entries = model.shots.map((shot) => {
        const text = outcomeText(shot);
        ctx.font = nameFont;
        const nw = ctx.measureText(shot.label).width;
        ctx.font = outFont;
        const ow = ctx.measureText(text).width;
        return { text, name: shot.label, lane: shot.lane, nw, ow, w: Math.ceil(badge + 6 + nw + sepW + ow) };
      });
      const maxEntry = entries.reduce((m, e) => Math.max(m, e.w), 0);
      const twoLine = maxEntry > W - pad * 2;
      const colGap = 18;
      const colW = twoLine ? W - pad * 2 : maxEntry;
      const cols = entries.length ? clamp(Math.floor((W - pad * 2 + colGap) / (colW + colGap)), 1, 3) : 1;
      const rowH = twoLine ? lh * 2 + 6 : Math.max(lh, badge) + 5;
      const rows = Math.ceil(entries.length / cols);
      const legendH = entries.length ? rows * rowH + 10 : 0;
      const oy = H - legendH - bottomBand;
      let cosE = 0.2;
      for (const lane of model.lanes) cosE = Math.max(cosE, Math.abs(Math.cos(lane.angle)));
      const flight = Math.max(56, shipH * 2.5);
      const horiz = (W / 2 - pad) / cosE - badge - 4;
      const vert = oy - topReserve - flight - badge;
      const s = Math.max(30, Math.min(horiz, vert)) / model.maxR;
      const blockW = cols * colW + (cols - 1) * colGap;
      const x0 = Math.round(Math.max(pad, (W - blockW) / 2));
      const y0 = Math.round(oy + bottomBand + 4);
      entries.forEach((e, i) => {
        e.x = x0 + (i % cols) * (colW + colGap);
        e.y = y0 + Math.floor(i / cols) * rowH;
        e.h = rowH;
        e.twoLine = twoLine;
      });
      mode = { kind: "legend", oy, s, entries, badge };
    }

    const { oy, s } = mode;
    const p = Math.max(1, Math.round(s * BUILDING_UNIT));
    const bLeft = Math.round(cx - (BUILDING[0].length / 2) * p);
    const bTop = Math.round(oy - BUILDING.length * p);
    const L = { W, H, pad, fs, lh, q, shipW, shipH, oy, cx, shipY, s, p, bLeft, bTop, cg, mono, outFont, nameFont, topReserve, bottomBand };
    L.mode = mode.kind;
    L.callouts = mode.callouts || [];
    L.entries = mode.entries || [];
    L.badge = mode.badge || 0;

    L.buildingSprite = renderSprite(BUILDING, p, buildingPalette());
    L.shipSprites = [renderSprite(SHIP, q, shipPalette(colors.amber)), renderSprite(SHIP, q, shipPalette(colors.coral))];
    L.hit = new Map();
    for (const lane of model.lanes) L.hit.set(lane.index, buildingHit(L, lane.angle));

    // Visual top of each lane (an empty lane shows its dashed ghost slot).
    let visMax = SHIELD_BASE + GHOST_DEPTH;
    L.visTop = new Map();
    for (const lane of model.lanes) {
      const top = Math.max(model.laneTop(lane.index), SHIELD_BASE + GHOST_DEPTH);
      L.visTop.set(lane.index, top * s);
      visMax = Math.max(visMax, top);
    }
    L.rayEnd = visMax * s + 24;

    // Firing positions: on the lane's ray when there's room for a straight shot,
    // otherwise lifted clear of the shield (the shot then curves into its lane).
    L.rTop = oy - shipY;
    L.shipPos = new Map();
    const disk = visMax * s + shipH / 2 + 26;
    for (const lane of model.lanes) {
      const c = Math.cos(lane.angle);
      const sn = Math.max(0.05, Math.sin(lane.angle));
      const rMax = Math.min(Math.abs(c) > 1e-3 ? (W / 2 - pad - shipW / 2 - 2) / Math.abs(c) : Infinity, L.rTop / sn);
      const r = Math.min(L.rTop, rMax);
      let x;
      let y;
      if (r >= L.visTop.get(lane.index) + shipH / 2 + 34) {
        [x, y] = pt(L, r, lane.angle);
      } else {
        x = clamp(cx + c * disk, pad + shipW / 2 + 2, W - pad - shipW / 2 - 2);
        const dx = x - cx;
        y = Math.max(shipY, oy - Math.sqrt(Math.max(0, disk * disk - dx * dx)));
      }
      L.shipPos.set(lane.index, { x, y, a: Math.atan2(oy - y, x - cx), r: Math.hypot(x - cx, oy - y) });
    }
    L.stars = makeStars(W, H);
    return L;
  }

  function placeCallouts(L, metrics) {
    const placed = [];
    return metrics.map((m) => {
      const lane = model.laneMap.get(m.lane);
      const angle = lane ? lane.angle : Math.PI / 2;
      const top = Math.max(model.laneTop(m.lane), SHIELD_BASE + GHOST_DEPTH);
      let r = top * L.s + L.cg;
      let box = null;
      let clear = false;
      for (let attempt = 0; attempt < 4 && !clear; attempt += 1) {
        box = calloutBox(L, angle, r, m.w, m.h);
        clear = !placed.some((b) => overlaps(b, box, 3));
        if (!clear) r += m.h * 0.75 + 4;
      }
      placed.push(box);
      return { ...m, box, angle, ok: clear && !box.clamped && box.y >= L.topReserve - 1 };
    });
  }

  function calloutBox(L, angle, r, w, h) {
    const c = Math.cos(angle);
    const px = L.cx + r * c;
    const py = L.oy - r * Math.sin(angle);
    let x;
    let y;
    if (c > 0.35) { x = px; y = py - h / 2; }
    else if (c < -0.35) { x = px - w; y = py - h / 2; }
    else { x = px - w / 2; y = py - h; }
    const cx2 = clamp(x, L.pad, L.W - L.pad - w);
    const cy2 = clamp(y, L.pad, L.oy - h - 2);
    const clamped = Math.abs(cx2 - x) > 1 || Math.abs(cy2 - y) > 1;
    return { x: Math.round(cx2), y: Math.round(cy2), w, h, clamped };
  }

  // Where a lane's ray first touches the building silhouette (screen px).
  function buildingHit(L, angle) {
    const cols = BUILDING[0].length;
    const rows = BUILDING.length;
    const start = Math.hypot(cols * L.p, rows * L.p);
    for (let r = start; r > 0; r -= 0.5) {
      const x = L.cx + r * Math.cos(angle);
      const y = L.oy - r * Math.sin(angle);
      const col = Math.floor((x - L.bLeft) / L.p);
      const row = Math.floor((y - L.bTop) / L.p);
      if (row >= 0 && row < rows - 1 && col >= 0 && col < cols && BUILDING[row][col] !== ".") {
        return { x, y, r };
      }
    }
    return { x: L.cx, y: L.oy - L.p * 4, r: L.p * 4 };
  }

  /* ---------------- drawing ---------------- */

  function draw() {
    if (destroyed || !layout) return;
    const L = layout;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.ink;
    ctx.fillRect(0, 0, L.W, L.H);

    drawBackdrop(L);
    drawLanes(L);
    drawPieces(L);
    drawLaneFlashes(L);
    drawBuilding(L);
    drawBursts(L);
    drawCallouts(L);
    drawProjectiles(L);
    drawShip(L);
    drawCompany(L);
  }

  function drawBackdrop(L) {
    const twinkle = !done && !opts.reducedMotion;
    for (const star of L.stars) {
      const a = twinkle ? star.a * (0.65 + 0.35 * Math.sin(t * star.rate + star.phase)) : star.a;
      ctx.fillStyle = rgba(star.warm ? colors.paper : colors.cyan, a);
      ctx.fillRect(Math.round(star.x), Math.round(star.y), star.size, star.size);
    }
    // Radar rings and faint lane rays around the org.
    ctx.lineWidth = 1;
    for (let r = SHIELD_BASE; r * L.s < Math.max(L.W, L.H); r += 0.5) {
      ctx.strokeStyle = rgba(colors.cyan, r === SHIELD_BASE ? 0.1 : 0.05);
      ctx.beginPath();
      ctx.arc(L.cx, L.oy, r * L.s, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = rgba(colors.cyan, 0.07);
    for (const lane of model.lanes) {
      const a = pt(L, SHIELD_BASE * L.s, lane.angle);
      const b = pt(L, L.rayEnd, lane.angle);
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Ground.
    ctx.fillStyle = rgba("#050a0e", 0.85);
    ctx.fillRect(0, L.oy, L.W, L.H - L.oy);
    const grad = ctx.createLinearGradient(0, 0, L.W, 0);
    grad.addColorStop(0, rgba(colors.cyan, 0));
    grad.addColorStop(0.5, rgba(colors.cyan, 0.55));
    grad.addColorStop(1, rgba(colors.cyan, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, Math.round(L.oy), L.W, 1);
  }

  function drawLanes(L) {
    for (const lane of model.lanes) {
      const [a0, a1] = laneSpan(lane);
      sectorPath(ctx, L.cx, L.oy, SHIELD_BASE * L.s, model.maxR * L.s, a0, a1);
      ctx.fillStyle = rgba(colors.cyan, 0.025);
      ctx.fill();
      const filled = model.pieces.some((piece, k) => t >= tl.pieces[k].land && piece.lanes.has(lane.index));
      if (!filled) {
        sectorPath(ctx, L.cx, L.oy, SHIELD_BASE * L.s + 1, (SHIELD_BASE + GHOST_DEPTH) * L.s, a0, a1);
        ctx.fillStyle = rgba(colors.coral, 0.05);
        ctx.fill();
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = rgba(colors.muted, 0.55);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function drawPieces(L) {
    model.pieces.forEach((piece, k) => {
      const timing = tl.pieces[k];
      if (t < timing.start) return;
      const u = clamp((t - timing.start) / DROP_DUR, 0, 1);
      // Gravity in, then a tiny settle bounce.
      const fall = u < 1 ? (1 - u * u) * model.maxR * 1.1 * L.s : 0;
      const since = t - timing.land;
      const bounce = since >= 0 && since < 0.14 ? Math.sin((since / 0.14) * Math.PI) * 2 : 0;
      const fadeIn = clamp(u * 3, 0, 1);
      for (const seg of piece.segments) drawSegment(L, piece, seg, fall + bounce, fadeIn);
      if (since >= 0 && since < 0.25) {
        // Landing flash on the piece edges.
        const a = 0.7 * (1 - since / 0.25);
        for (const seg of piece.segments) {
          const lane = model.laneMap.get(seg.lane);
          if (!lane) continue;
          const [a0, a1] = laneSpan(lane);
          sectorPath(ctx, L.cx, L.oy, seg.inner * L.s + SEAM, seg.outer * L.s - SEAM, a0, a1);
          ctx.strokeStyle = rgba(colors.paper, a);
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    });
  }

  function drawSegment(L, piece, seg, lift, fadeIn) {
    const lane = model.laneMap.get(seg.lane);
    if (!lane) return;
    const [a0, a1] = laneSpan(lane);
    const r0 = seg.inner * L.s + SEAM + lift;
    const r1 = Math.max(r0 + 2, seg.outer * L.s - SEAM + lift);
    const base = componentColor(piece.component);
    const alpha = (piece.cracked ? 0.42 : 0.88) * fadeIn;
    const fill = piece.foundation ? mix(base, colors.ink, 0.25) : base;

    sectorPath(ctx, L.cx, L.oy, r0, r1, a0, a1);
    ctx.fillStyle = rgba(fill, alpha);
    ctx.fill();

    // Cell seams so a segment reads as Tetris blocks.
    const midR = (r0 + r1) / 2;
    const cells = clamp(Math.round(((a1 - a0) * midR) / 26), 1, 5);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(colors.ink, 0.55 * fadeIn);
    for (let c = 1; c < cells; c += 1) {
      const a = a0 + ((a1 - a0) * c) / cells;
      const p0 = pt(L, r0, a);
      const p1 = pt(L, r1, a);
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.stroke();
    }
    // Inner shadow line (bevel).
    if (r1 - r0 > 6) {
      ctx.strokeStyle = rgba(colors.ink, 0.35 * fadeIn);
      ctx.beginPath();
      ctx.arc(L.cx, L.oy, r0 + 2, -a1, -a0);
      ctx.stroke();
    }
    // Thin bright edge, brighter on the outer face.
    const edge = mix(base, "#ffffff", 0.45);
    sectorPath(ctx, L.cx, L.oy, r0, r1, a0, a1);
    ctx.strokeStyle = rgba(edge, (piece.cracked ? 0.6 : 0.8) * fadeIn);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(L.cx, L.oy, r1 - 1, -a1, -a0);
    ctx.strokeStyle = rgba(edge, 0.95 * fadeIn);
    ctx.lineWidth = 2;
    ctx.stroke();

    if (piece.cracked) drawCracks(L, piece, seg, r0, r1, a0, a1, fadeIn);
  }

  function drawCracks(L, piece, seg, r0, r1, a0, a1, fadeIn) {
    const rand = rng(`${piece.id}:${seg.lane}`);
    ctx.strokeStyle = rgba(colors.paper, 0.85 * fadeIn);
    ctx.lineWidth = 1;
    for (let n = 0; n < 2; n += 1) {
      let a = a0 + (a1 - a0) * (0.25 + 0.5 * rand());
      let r = r1;
      const steps = 4;
      ctx.beginPath();
      let p = pt(L, r, a);
      ctx.moveTo(p[0], p[1]);
      for (let k = 1; k <= steps; k += 1) {
        r = r1 - ((r1 - r0) * 0.85 * k) / steps;
        a = clamp(a + (rand() - 0.5) * (a1 - a0) * 0.35, a0 + 0.01, a1 - 0.01);
        p = pt(L, r, a);
        ctx.lineTo(p[0], p[1]);
      }
      ctx.stroke();
    }
  }

  function drawLaneFlashes(L) {
    model.shots.forEach((shot, i) => {
      const lane = model.laneMap.get(shot.lane);
      if (!lane) return;
      const T = tl.shots[i];
      const [a0, a1] = laneSpan(lane);
      // Targeting laser while the shot is lined up and in flight.
      if (t >= T.moveEnd - 0.1 && t < T.impact) {
        const a = pt(L, L.hit.get(shot.lane).r, lane.angle);
        const b = pt(L, L.rayEnd, lane.angle);
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = rgba(SHIP_RED.h, 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const since = t - T.impact;
      if (since < 0 || since > 0.7) return;
      const k = 1 - since / 0.7;
      const top = Math.max(model.laneTop(shot.lane), SHIELD_BASE + GHOST_DEPTH);
      sectorPath(ctx, L.cx, L.oy, SHIELD_BASE * L.s, top * L.s, a0, a1);
      ctx.fillStyle = rgba(outcomeColor(shot.outcome), 0.4 * k);
      ctx.fill();
      ctx.strokeStyle = rgba("#ffffff", 0.6 * k);
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function drawBuilding(L) {
    ctx.drawImage(L.buildingSprite, L.bLeft, L.bTop);
    // Beacon blink on the antenna.
    const on = done || opts.reducedMotion ? true : Math.sin(t * 5) > -0.2;
    if (on) {
      const col = BUILDING[0].indexOf("g");
      ctx.fillStyle = colors.coral;
      ctx.fillRect(L.bLeft + col * L.p, L.bTop, L.p * 2, L.p);
      ctx.fillStyle = rgba(colors.coral, 0.25);
      ctx.fillRect(L.bLeft + (col - 1) * L.p, L.bTop - L.p, L.p * 4, L.p * 3);
    }
    // Lasting scorch marks where attacks got through.
    model.shots.forEach((shot, i) => {
      const T = tl.shots[i];
      if (T.burst === null || t < T.burst) return;
      const hit = L.hit.get(shot.lane);
      const rand = rng(`scorch:${i}`);
      const n = 3 + Math.round(shot.damage * 30);
      const P = L.p;
      for (let k = 0; k < n; k += 1) {
        const dx = Math.round((rand() - 0.5) * 4) * P;
        const dy = Math.round(rand() * 3) * P;
        const x = Math.round(hit.x / P) * P + dx;
        const y = Math.round(hit.y / P) * P + dy;
        if (y >= L.oy) continue;
        ctx.fillStyle = k % 3 === 0 ? rgba(colors.coral, 0.9) : rgba("#05080b", 0.85);
        ctx.fillRect(x, y, P, P);
      }
    });
  }

  function drawBursts(L) {
    model.shots.forEach((shot, i) => {
      const T = tl.shots[i];
      if (T.burst === null) return;
      const since = t - T.burst;
      if (since < 0 || since > 0.75) return;
      const hit = L.hit.get(shot.lane);
      const k = since / 0.75;
      const rand = rng(`burst:${i}`);
      const n = 10 + Math.round(shot.damage * 70);
      const size = Math.max(2, L.p);
      // Flash ring.
      ctx.strokeStyle = rgba(colors.coral, 0.8 * (1 - k));
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, 4 + k * (14 + shot.damage * 120), 0, Math.PI * 2);
      ctx.stroke();
      for (let j = 0; j < n; j += 1) {
        const ang = Math.PI * (0.05 + 0.9 * rand()) + (rand() - 0.5) * 0.6;
        const speed = (30 + rand() * 70) * (0.6 + shot.damage * 3);
        const x = hit.x + Math.cos(ang) * speed * since;
        const y = hit.y - Math.sin(ang) * speed * since + 60 * since * since;
        const pick = rand();
        const col = pick < 0.45 ? colors.coral : pick < 0.8 ? colors.amber : colors.paper;
        ctx.fillStyle = rgba(col, 1 - k);
        ctx.fillRect(Math.round(x), Math.round(y), size, size);
      }
    });
  }

  function drawCallouts(L) {
    model.shots.forEach((shot, i) => {
      const since = t - tl.shots[i].impact;
      if (since < 0) return;
      const pop = since < 0.2 ? 1 + 0.25 * (1 - since / 0.2) : 1;
      const alpha = since < 1.0 ? 1 : since < 1.6 ? 1 - 0.25 * ((since - 1.0) / 0.6) : 0.75;
      const color = outcomeColor(shot.outcome);
      const textColor = shot.outcome === "prevented" ? mix(color, colors.paper, 0.45) : color;
      if (L.mode === "legend") drawLegendEntry(L, shot, i, since, pop, color, textColor);
      else drawCalloutCard(L, L.callouts[i], pop, alpha, color, textColor);
      // Impact spark at the shield face (or the building).
      if (since < 0.3) {
        const lane = model.laneMap.get(shot.lane);
        if (!lane) return;
        const k = 1 - since / 0.3;
        const ip = impactPoint(L, shot);
        const arm = (4 + 10 * (1 - k)) | 0;
        const sz = Math.max(2, L.p);
        ctx.fillStyle = rgba("#ffffff", k);
        ctx.fillRect(ip[0] - sz, ip[1] - sz, sz * 2, sz * 2);
        ctx.fillStyle = rgba(color, k);
        for (const [dx, dy] of [[arm, 0], [-arm, 0], [0, arm], [0, -arm]]) {
          ctx.fillRect(Math.round(ip[0] + dx - sz / 2), Math.round(ip[1] + dy - sz / 2), sz, sz);
        }
      }
    });
  }

  function drawCalloutCard(L, c, pop, alpha, color, textColor) {
    const { x, y, w, h } = c.box;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + w / 2, y + h / 2);
    ctx.scale(pop, pop);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = rgba(colors.ink, 0.88);
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rgba(color, 0.9);
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 3, h);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    c.lines.forEach((line, k) => {
      ctx.font = L.nameFont;
      ctx.fillStyle = rgba(colors.paper, 0.85);
      ctx.fillText(line, 8, 3 + L.lh * (k + 0.5) + 0.5);
    });
    ctx.font = L.outFont;
    ctx.fillStyle = textColor;
    ctx.fillText(c.text, 8, 3 + L.lh * (c.lines.length + 0.5) + 0.5);
    ctx.restore();
  }

  // Legend mode: a numbered badge at the lane tip, and a row "N  Name · OUTCOME" below the ground.
  function drawLegendEntry(L, shot, i, since, pop, color, textColor) {
    const lane = model.laneMap.get(shot.lane);
    const e = L.entries[i];
    const b = L.badge;
    const num = String(i + 1);
    const glow = since < 1.0 ? 1 : 0;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.font = L.outFont;
    if (lane) {
      const tip = pt(L, L.visTop.get(lane.index) + b / 2 + 3, lane.angle);
      const bx = clamp(tip[0] - b / 2, L.pad / 2, L.W - L.pad / 2 - b);
      const by = clamp(tip[1] - b / 2, L.pad / 2, L.oy - b - 1);
      ctx.save();
      ctx.translate(bx + b / 2, by + b / 2);
      ctx.scale(pop, pop);
      ctx.fillStyle = color;
      ctx.fillRect(-b / 2, -b / 2, b, b);
      ctx.strokeStyle = rgba("#ffffff", 0.35 + 0.4 * glow);
      ctx.lineWidth = 1;
      ctx.strokeRect(-b / 2 + 0.5, -b / 2 + 0.5, b - 1, b - 1);
      ctx.fillStyle = colors.ink;
      ctx.fillText(num, 0, 0.5);
      ctx.restore();
    }
    if (!e) return;
    const rowAlpha = since < 0.25 ? since / 0.25 : 1;
    ctx.save();
    ctx.globalAlpha = rowAlpha;
    if (glow) {
      ctx.fillStyle = rgba(color, 0.12);
      ctx.fillRect(e.x - 3, e.y, Math.min(L.W - e.x - 2, (e.twoLine ? L.W - L.pad * 2 : e.w) + 6), e.h - 3);
    }
    const midY = e.twoLine ? e.y + L.lh / 2 + 2 : e.y + (e.h - 3) / 2;
    ctx.fillStyle = color;
    ctx.fillRect(e.x, Math.round(midY - b / 2), b, b);
    ctx.fillStyle = colors.ink;
    ctx.fillText(num, e.x + b / 2, midY + 0.5);
    ctx.textAlign = "left";
    ctx.font = L.nameFont;
    ctx.fillStyle = colors.paper;
    const tx = e.x + b + 6;
    ctx.fillText(e.name, tx, midY + 0.5);
    if (e.twoLine) {
      ctx.font = L.outFont;
      ctx.fillStyle = textColor;
      ctx.fillText(e.text, tx, midY + L.lh + 0.5);
    } else {
      const nw = ctx.measureText(e.name).width;
      ctx.fillStyle = rgba(colors.muted, 0.7);
      ctx.fillText(" · ", tx + nw, midY + 0.5);
      const sw = ctx.measureText(" · ").width;
      ctx.font = L.outFont;
      ctx.fillStyle = textColor;
      ctx.fillText(e.text, tx + nw + sw, midY + 0.5);
    }
    ctx.restore();
  }

  function impactPoint(L, shot) {
    const lane = model.laneMap.get(shot.lane);
    if (shot.outcome === "unprotected") {
      const hit = L.hit.get(shot.lane);
      return [hit.x, hit.y];
    }
    return pt(L, model.laneTop(shot.lane) * L.s, lane.angle);
  }

  function drawProjectiles(L) {
    model.shots.forEach((shot, i) => {
      const lane = model.laneMap.get(shot.lane);
      if (!lane) return;
      const T = tl.shots[i];
      const dirX = -Math.cos(lane.angle);
      const dirY = Math.sin(lane.angle);
      const hit = L.hit.get(shot.lane);
      const rImpact = shot.outcome === "unprotected" ? hit.r : model.laneTop(shot.lane) * L.s;
      if (t >= T.fire && t < T.impact) {
        // Quadratic path from the ship that finishes along the lane's ray. When the ship
        // sits on the ray the control point is on the line, so the shot flies straight.
        const ship = L.shipPos.get(shot.lane);
        const p2 = pt(L, rImpact, lane.angle);
        const toX = p2[0] - ship.x;
        const toY = p2[1] - ship.y;
        const len = Math.hypot(toX, toY) || 1;
        const p0 = [ship.x + (toX / len) * L.shipH * 0.5, ship.y + (toY / len) * L.shipH * 0.5];
        const c = pt(L, rImpact + Math.hypot(p2[0] - p0[0], p2[1] - p0[1]) * 0.55, lane.angle);
        c[0] = clamp(c[0], L.pad, L.W - L.pad);
        c[1] = clamp(c[1], L.pad, L.oy);
        const u = (t - T.fire) / SHOT_TRAVEL;
        const e = u * (0.6 + 0.4 * u);
        const m = 1 - e;
        const p = [m * m * p0[0] + 2 * m * e * c[0] + e * e * p2[0], m * m * p0[1] + 2 * m * e * c[1] + e * e * p2[1]];
        let vx = 2 * m * (c[0] - p0[0]) + 2 * e * (p2[0] - c[0]);
        let vy = 2 * m * (c[1] - p0[1]) + 2 * e * (p2[1] - c[1]);
        const vl = Math.hypot(vx, vy) || 1;
        vx /= vl;
        vy /= vl;
        drawBolt(L, p, vx, vy, 1, SHIP_RED.h);
        drawFlightLabel(L, shot.label, p, vx, vy, lane.angle);
      }
      // Reduced: a weaker leak continues through the shield to the building.
      if (T.leak && t >= T.impact && t < T.burst) {
        const u = (t - T.impact) / LEAK_DUR;
        const r = rImpact + (hit.r - rImpact) * u;
        const p = pt(L, r, lane.angle);
        drawBolt(L, p, dirX, dirY, 0.55, colors.coral);
      }
    });
  }

  function drawBolt(L, p, dx, dy, scale, color) {
    const sz = Math.max(2, Math.round(L.q * 1.5 * scale));
    const trail = 26 * scale + 10;
    const grad = ctx.createLinearGradient(p[0], p[1], p[0] - dx * trail, p[1] - dy * trail);
    grad.addColorStop(0, rgba(color, 0.9));
    grad.addColorStop(1, rgba(color, 0));
    ctx.strokeStyle = grad;
    ctx.lineWidth = sz;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] - dx * trail, p[1] - dy * trail);
    ctx.stroke();
    for (let k = 0; k < 3; k += 1) {
      const x = Math.round(p[0] - dx * k * sz - sz / 2);
      const y = Math.round(p[1] - dy * k * sz - sz / 2);
      ctx.fillStyle = k === 0 ? "#ffffff" : rgba(color, 1 - k * 0.25);
      ctx.fillRect(x, y, sz, sz);
    }
  }

  function drawFlightLabel(L, text, p, dx, dy, angle) {
    ctx.font = `700 ${L.fs}px ${L.mono}`;
    const w = Math.ceil(ctx.measureText(text).width) + 10;
    const h = L.fs + 8;
    // Perpendicular to the ray, on the lane's outer side.
    let nx = -dy;
    let ny = dx;
    const side = Math.cos(angle) >= 0 ? 1 : -1;
    if (Math.sign(nx || side) !== side) { nx = -nx; ny = -ny; }
    const off = 10 + L.q * 3;
    const ax = p[0] + nx * off;
    const ay = p[1] + ny * off;
    let x = Math.abs(nx) > 0.5 ? (nx > 0 ? ax : ax - w) : ax - w / 2;
    let y = ay - h / 2;
    x = clamp(x, L.pad, L.W - L.pad - w);
    y = clamp(y, L.pad, L.oy - h - 2);
    ctx.fillStyle = rgba(colors.ink, 0.85);
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
    ctx.strokeStyle = rgba(SHIP_RED.h, 0.6);
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, w - 1, h - 1);
    ctx.fillStyle = colors.paper;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(text, Math.round(x) + 5, Math.round(y) + h / 2 + 0.5);
  }

  function drawShip(L) {
    const state = shipState(L);
    if (!state) return;
    const sprite = L.shipSprites[Math.floor(t * 12) % 2];
    ctx.save();
    ctx.translate(Math.round(state.x), Math.round(state.y));
    // Soft red underglow.
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, L.shipW * 0.8);
    glow.addColorStop(0, rgba(SHIP_RED.R, 0.28));
    glow.addColorStop(1, rgba(SHIP_RED.R, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(-L.shipW, -L.shipW, L.shipW * 2, L.shipW * 2);
    ctx.rotate(state.rot);
    ctx.drawImage(sprite, -Math.round(L.shipW / 2), -Math.round(L.shipH / 2));
    ctx.restore();
  }

  function shipState(L) {
    const top = { a: Math.PI / 2, r: L.rTop };
    const toXY = (a, r) => ({ x: L.cx + r * Math.cos(a), y: L.oy - r * Math.sin(a) });
    const bank = (a) => (Math.PI / 2 - a) * 0.35;
    if (t < tl.shipIn || t >= tl.total) return null;
    if (t < tl.sweepStart) {
      const u = easeOut((t - tl.shipIn) / SHIP_ENTER);
      return { x: L.cx, y: -L.shipH + (L.shipY + L.shipH) * u, rot: 0 };
    }
    if (t < tl.shotsStart) {
      const u = (t - tl.sweepStart) / SHIP_SWEEP;
      const amp = L.W / 2 - L.pad - L.shipW / 2 - 4;
      const x = L.cx + amp * Math.sin(u * Math.PI * 4);
      const tilt = Math.cos(u * Math.PI * 4) * 0.12;
      return { x, y: L.shipY + Math.sin(u * Math.PI * 8) * 2, rot: tilt };
    }
    const polar = (i) => {
      const lane = model.laneMap.get(model.shots[i].lane);
      const pos = lane && L.shipPos.get(lane.index);
      return pos ? { a: pos.a, r: pos.r } : top;
    };
    if (t < tl.exitStart) {
      let i = 0;
      while (i + 1 < model.shots.length && t >= tl.shots[i + 1].start) i += 1;
      const T = tl.shots[i];
      const from = i === 0 ? top : polar(i - 1);
      const to = polar(i);
      const u = easeInOut(clamp((t - T.start) / SHOT_MOVE, 0, 1));
      const a = from.a + (to.a - from.a) * u;
      let r = from.r + (to.r - from.r) * u;
      const recoil = t >= T.fire && t < T.fire + 0.15 ? (1 - (t - T.fire) / 0.15) * L.q * 3 : 0;
      r += recoil;
      const pos = toXY(a, r);
      const hover = Math.sin(t * 6) * 1.5;
      return { x: pos.x, y: pos.y + hover, rot: bank(a) };
    }
    const last = model.shots.length ? polar(model.shots.length - 1) : top;
    const e = t - tl.exitStart;
    if (e < SHIP_EXIT / 2) {
      const u = easeInOut(e / (SHIP_EXIT / 2));
      const a = last.a + (top.a - last.a) * u;
      const r = last.r + (top.r - last.r) * u;
      const pos = toXY(a, r);
      return { x: pos.x, y: pos.y, rot: bank(a) };
    }
    const u = (e - SHIP_EXIT / 2) / (SHIP_EXIT / 2);
    return { x: L.cx, y: L.shipY - (L.shipY + L.shipH * 2) * u * u, rot: 0 };
  }

  function drawCompany(L) {
    const label = String(model.company || "").toUpperCase();
    if (!label) return;
    ctx.font = `${L.fs + 1}px ${colors.headingFont}`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(label).width + 16;
    const y = L.oy + L.bottomBand / 2 + 1;
    ctx.fillStyle = rgba(colors.cyan, 0.08);
    ctx.fillRect(Math.round(L.cx - w / 2), Math.round(y - L.fs / 2 - 3), Math.round(w), L.fs + 6);
    ctx.fillStyle = colors.paper;
    ctx.fillText(label, L.cx, y);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  }

  /* ---------------- helpers bound to this mount ---------------- */

  function laneSpan(lane) {
    return [lane.angle - model.halfSpan, lane.angle + model.halfSpan];
  }

  function componentColor(component) {
    switch (component) {
      case "define": return colors.cyan;
      case "evaluate": return colors.amber;
      case "integrate": return colors.coral;
      case "measure": return colors.teal;
      default: return colors.muted;
    }
  }

  function outcomeColor(outcome) {
    if (outcome === "prevented") return colors.teal;
    if (outcome === "reduced") return colors.amber;
    return colors.coral;
  }

  function buildingPalette() {
    return {
      e: mix(colors.cyan, colors.ink, 0.35),
      w: "#1b2a33",
      c: colors.cyan,
      a: colors.amber,
      d: "#0a1218",
      f: mix(colors.cyan, colors.ink, 0.55),
      g: mix(colors.coral, colors.ink, 0.3)
    };
  }

  function shipPalette(thruster) {
    return {
      k: mix(colors.cyan, colors.ink, 0.25),
      K: "#ffffff",
      h: SHIP_RED.h,
      R: SHIP_RED.R,
      r: SHIP_RED.r,
      y: colors.amber,
      t: thruster
    };
  }

  function call(fn, ...args) {
    if (typeof fn !== "function") return;
    try { fn(...args); } catch (err) { console.error(err); }
  }

  return { skip, destroy };
}

/* ---------------- model + timeline (pure) ---------------- */

function prepare(sim) {
  const lanes = (Array.isArray(sim.lanes) ? sim.lanes : [])
    .map((lane, i) => ({ index: Number.isInteger(lane.index) ? lane.index : i, angle: Number(lane.angle) }))
    .filter((lane) => Number.isFinite(lane.angle));
  const laneMap = new Map(lanes.map((lane) => [lane.index, lane]));
  const sorted = lanes.map((lane) => lane.angle).sort((a, b) => a - b);
  let spacing = 0.6;
  for (let i = 1; i < sorted.length; i += 1) spacing = Math.min(spacing, sorted[i] - sorted[i - 1]);
  const gap = Math.min(0.056, spacing * 0.11); // per side; ~6 degrees between neighbouring lanes
  const halfSpan = Math.max(0.02, spacing / 2 - gap);

  const pieces = (Array.isArray(sim.pieces) ? sim.pieces : [])
    .map((piece, i) => ({
      id: String(piece.id ?? i),
      component: piece.component,
      foundation: Boolean(piece.foundation),
      cracked: Boolean(piece.cracked),
      order: Number.isFinite(piece.dropOrder) ? piece.dropOrder : i,
      segments: (Array.isArray(piece.segments) ? piece.segments : [])
        .filter((seg) => laneMap.has(seg.lane) && Number.isFinite(seg.inner) && Number.isFinite(seg.outer))
    }))
    .sort((a, b) => a.order - b.order);
  for (const piece of pieces) piece.lanes = new Set(piece.segments.map((seg) => seg.lane));

  const tops = Array.isArray(sim.laneTops) ? sim.laneTops : [];
  const laneTop = (index) => {
    const fromSim = Number(tops[index]);
    if (Number.isFinite(fromSim)) return fromSim;
    let top = SHIELD_BASE;
    for (const piece of pieces) for (const seg of piece.segments) if (seg.lane === index) top = Math.max(top, seg.outer);
    return top;
  };
  let maxR = MIN_WORLD_R;
  for (const lane of lanes) maxR = Math.max(maxR, laneTop(lane.index));
  for (const piece of pieces) for (const seg of piece.segments) maxR = Math.max(maxR, seg.outer);

  const shots = (Array.isArray(sim.shots) ? sim.shots : []).map((shot) => ({
    raw: shot,
    lane: shot.lane,
    label: String(shot.label ?? ""),
    outcome: shot.outcome === "prevented" || shot.outcome === "reduced" ? shot.outcome : "unprotected",
    reduction: Number(shot.reduction) || 0,
    damage: Math.max(0, Number(shot.damage) || 0)
  }));

  return { company: sim.company, lanes, laneMap, halfSpan, pieces, laneTop, maxR, shots };
}

function buildTimeline(model) {
  const pieces = model.pieces.map((_, k) => {
    const start = 0.25 + k * DROP_STAGGER;
    return { start, land: start + DROP_DUR };
  });
  const dropEnd = pieces.length ? pieces[pieces.length - 1].land + 0.35 : 0.5;
  const shipIn = dropEnd;
  const sweepStart = shipIn + SHIP_ENTER;
  const shotsStart = sweepStart + SHIP_SWEEP;
  const n = model.shots.length;
  const tail = SHIP_EXIT + 0.2;
  const interval = n ? clamp((TARGET_TOTAL - shotsStart - tail) / n, SHOT_GAP_MIN, SHOT_GAP_MAX) : 0;
  const shots = model.shots.map((shot, i) => {
    const start = shotsStart + i * interval;
    const moveEnd = start + SHOT_MOVE;
    const fire = moveEnd + 0.05;
    const impact = fire + SHOT_TRAVEL;
    const leak = shot.outcome !== "unprotected" && shot.damage > 1e-9 && shot.outcome !== "prevented";
    const burst = shot.damage > 1e-9 && shot.outcome !== "prevented" ? (leak ? impact + LEAK_DUR : impact) : null;
    return { start, moveEnd, fire, impact, leak, burst };
  });
  const exitStart = shotsStart + n * interval;
  const total = exitStart + tail;
  return { pieces, shipIn, sweepStart, shotsStart, shots, exitStart, total };
}

/* ---------------- small pure helpers ---------------- */

function readColors() {
  const out = { ...FALLBACK, monoFont: '"SFMono-Regular", Consolas, "Liberation Mono", ui-monospace, monospace', headingFont: '"Aldrich", "Avenir Next", "Segoe UI", system-ui, sans-serif' };
  if (typeof document === "undefined") return out;
  const style = getComputedStyle(document.documentElement);
  for (const key of Object.keys(FALLBACK)) {
    const value = style.getPropertyValue(`--${key}`).trim();
    if (value && parseColor(value)) out[key] = value;
  }
  const mono = style.getPropertyValue("--font-mono").trim();
  const heading = style.getPropertyValue("--font-heading").trim();
  if (mono) out.monoFont = mono;
  if (heading) out.headingFont = heading;
  return out;
}

// Greedy word wrap of `text` to `width` px with the current ctx font; long words stay whole.
function wrapWordsWith(ctx, text, width) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  for (const word of words) {
    const last = lines[lines.length - 1];
    if (last && ctx.measureText(`${last} ${word}`).width <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
}

// Floors with the same float guard as percent() in app.js, so the canvas never shows
// "RISK CUT 48%" for an attack the report lists as 47%.
function outcomeText(shot) {
  if (shot.outcome === "prevented") return "PREVENTED";
  if (shot.outcome === "reduced") return `RISK CUT ${Math.floor(clamp(shot.reduction, 0, 1) * 100 + 1e-6)}%`;
  return "UNPROTECTED";
}

function renderSprite(grid, size, palette) {
  const sprite = document.createElement("canvas");
  sprite.width = grid[0].length * size;
  sprite.height = grid.length * size;
  const g = sprite.getContext("2d");
  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const color = palette[row[x]];
      if (!color) continue;
      g.fillStyle = color;
      g.fillRect(x * size, y * size, size, size);
    }
  });
  return sprite;
}

function makeStars(W, H) {
  const rand = rng(`stars:${Math.round(W)}x${Math.round(H)}`);
  const count = Math.round((W * H) / 2600);
  const stars = [];
  for (let i = 0; i < count; i += 1) {
    stars.push({
      x: rand() * W,
      y: rand() * H,
      size: rand() < 0.15 ? 2 : 1,
      a: 0.15 + rand() * 0.45,
      rate: 1 + rand() * 3,
      phase: rand() * Math.PI * 2,
      warm: rand() < 0.3
    });
  }
  return stars;
}

function sectorPath(ctx, cx, cy, r0, r1, a0, a1) {
  ctx.beginPath();
  ctx.arc(cx, cy, r1, -a1, -a0, false);
  ctx.arc(cx, cy, Math.max(0, r0), -a0, -a1, true);
  ctx.closePath();
}

function pt(L, r, a) {
  return [L.cx + r * Math.cos(a), L.oy - r * Math.sin(a)];
}

function overlaps(a, b, m) {
  return a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m;
}

function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

function easeOut(u) {
  const x = clamp(u, 0, 1);
  return 1 - (1 - x) * (1 - x);
}

function easeInOut(u) {
  const x = clamp(u, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function rng(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i += 1) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const colorCache = new Map();
function parseColor(value) {
  if (colorCache.has(value)) return colorCache.get(value);
  let out = null;
  const v = String(value).trim();
  let m = /^#([0-9a-f]{3})$/i.exec(v);
  if (m) out = m[1].split("").map((c) => parseInt(c + c, 16));
  m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) out = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i.exec(v);
  if (m) out = [Number(m[1]), Number(m[2]), Number(m[3])];
  colorCache.set(value, out);
  return out;
}

function rgba(color, alpha) {
  const c = parseColor(color) || [255, 255, 255];
  return `rgba(${c[0]},${c[1]},${c[2]},${clamp(alpha, 0, 1).toFixed(3)})`;
}

function mix(a, b, k) {
  const x = parseColor(a) || [255, 255, 255];
  const y = parseColor(b) || [0, 0, 0];
  const c = x.map((v, i) => Math.round(v + (y[i] - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
