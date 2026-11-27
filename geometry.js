/* Cage Bender geometry: pure functions, no DOM.
 * Loaded by index.html (window.CageGeo) and by tools/check.mjs (globalThis.CageGeo).
 * Units: millimetres and degrees. Axes: X forward, Y to the car's left, Z up. */
(function (root) {
  "use strict";
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  const MATERIALS = {
    // rho g/cm³. E (GPa) and fy (yield, MPa) are typical handbook values for the strength check, not measured:
    // check your supplier. Brazing heat softens all of them; aluminium's fy is the annealed figure for that reason.
    steel: { label: "Mild steel", rho: 7.85, E: 200, fy: 250 },
    stainless: { label: "Stainless 304", rho: 8.0, E: 193, fy: 215 },
    brass: { label: "Brass", rho: 8.5, E: 100, fy: 200 },
    copper: { label: "Copper", rho: 8.96, E: 117, fy: 70 },
    aluminium: { label: "Aluminium 6061", rho: 2.7, E: 69, fy: 55 },
  };

  const V = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.hypot(a[0], a[1], a[2]),
    norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]); return l > 1e-12 ? [a[0] / l, a[1] / l, a[2] / l] : [0, 0, 0]; },
  };
  const mirrorPt = (p) => [p[0], -p[1], p[2]];
  const num = (v, fb = 0) => (Number.isFinite(+v) ? +v : fb);
  const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : "–");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /** Grams per mm of rod or tube. wall 0 (or too thick) means solid. */
  function linearDensity(stock) {
    const od = num(stock.od), wall = num(stock.wall);
    const id = wall > 0 && wall * 2 < od ? od - 2 * wall : 0;
    return Math.PI / 4 * (od * od - id * id) * (MATERIALS[stock.material]?.rho || 7.85) / 1000;
  }

  /** Signed distance from point p to a keep-out (negative inside). Wheels are cylinders on the Y axis. */
  function sdf(ko, p) {
    const c = ko.c, s = ko.s;
    if (ko.kind === "wheel") {
      const r = Math.hypot(p[0] - c[0], p[2] - c[2]) - s[0] / 2;
      const a = Math.abs(p[1] - c[1]) - s[1] / 2;
      return Math.hypot(Math.max(r, 0), Math.max(a, 0)) + Math.min(Math.max(r, a), 0);
    }
    const q = [Math.abs(p[0] - c[0]) - s[0] / 2, Math.abs(p[1] - c[1]) - s[1] / 2, Math.abs(p[2] - c[2]) - s[2] / 2];
    return Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0)) + Math.min(Math.max(q[0], q[1], q[2]), 0);
  }

  /** Does the ray o + t·d (t > 0) pass through the keep-out? The 3D view asks this from each tube piece toward the
   * viewer to find the pieces a car part hides. Boxes are axis-aligned; wheels are cylinders on the Y axis. */
  function rayHitsKeepout(ko, o, d) {
    const c = ko.c, s = ko.s;
    let t0 = 1e-9, t1 = Infinity;
    const slab = (k, h) => { // keep the part of the ray with |o[k] + t·d[k] − c[k]| ≤ h
      const oc = o[k] - c[k];
      if (Math.abs(d[k]) < 1e-12) return Math.abs(oc) <= h;
      let a = (-h - oc) / d[k], b = (h - oc) / d[k];
      if (a > b) [a, b] = [b, a];
      t0 = Math.max(t0, a); t1 = Math.min(t1, b);
      return t0 <= t1;
    };
    if (ko.kind === "wheel") {
      if (!slab(1, s[1] / 2)) return false;
      const R = s[0] / 2, ox = o[0] - c[0], oz = o[2] - c[2];
      const A = d[0] * d[0] + d[2] * d[2], B = 2 * (ox * d[0] + oz * d[2]), C = ox * ox + oz * oz - R * R;
      if (A < 1e-12) return C <= 0; // looking along the axle
      const disc = B * B - 4 * A * C;
      if (disc < 0) return false;
      const q = Math.sqrt(disc);
      t0 = Math.max(t0, (-B - q) / (2 * A)); t1 = Math.min(t1, (-B + q) / (2 * A));
      return t0 <= t1;
    }
    return slab(0, s[0] / 2) && slab(1, s[1] / 2) && slab(2, s[2] / 2);
  }

  function densify(pts, step) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const k = Math.max(1, Math.ceil(V.len(V.sub(b, a)) / step));
      for (let j = 1; j <= k; j++) out.push(V.add(a, V.mul(V.sub(b, a), j / k)));
    }
    return out;
  }

  /**
   * Turn a tube's corner points into everything the shop needs.
   * Each interior point is a bend of radius st.bender.clr; straights are what is left between bends.
   * Returns bends (marks measured from the start end of the cut rod, extra included), cut length,
   * drawn centreline samples, shape kind (straight / planar / 3d), weight and clearance to keep-outs.
   */
  function computeTube(t, st) {
    const R = Math.max(0, num(st.bender.clr));
    const od = num(st.stock.od);
    const res = { errors: [], warnings: [], bends: [], tangents: [], samples: [], frame: [], developed: 0, cut: 0, planar: true, kind: "straight", clearance: null, hits: [], P: [], U: [], status: "ok", weight: 0, lastStraight: 0 };
    const P = [];
    for (const p of t.pts) {
      const q = [num(p[0]), num(p[1]), num(p[2])];
      if (P.length && V.len(V.sub(q, P[P.length - 1])) < 1e-6) { res.warnings.push("Two neighbouring points are in the same place. One was ignored."); continue; }
      P.push(q);
    }
    res.P = P;
    if (P.length < 2) { res.errors.push("A tube needs at least 2 points."); res.status = "bad"; return res; }
    const n = P.length, U = [], L = [];
    for (let i = 0; i < n - 1; i++) { const d = V.sub(P[i + 1], P[i]); L.push(V.len(d)); U.push(V.mul(d, 1 / V.len(d))); }
    res.U = U;
    const T = new Array(n).fill(0), TH = new Array(n).fill(0), NRM = new Array(n).fill(null);
    for (let i = 1; i < n - 1; i++) {
      const th = Math.acos(Math.min(1, Math.max(-1, V.dot(U[i - 1], U[i]))));
      if (th < 0.1 * D2R) continue; // straight through
      if (th > 175 * D2R) { res.errors.push(`Point ${i + 1} folds the tube back on itself (${fmt(th * R2D, 0)}°). No bender can do that.`); continue; }
      TH[i] = th; T[i] = R * Math.tan(th / 2); NRM[i] = V.norm(V.cross(U[i - 1], U[i]));
    }
    const S = [];
    for (let i = 0; i < n - 1; i++) {
      const s = L[i] - T[i] - T[i + 1];
      S.push(s);
      if (s < -0.05) res.errors.push(`Segment ${i + 1}→${i + 2} is ${fmt(L[i])} mm, but the bends at its ends need ${fmt(T[i] + T[i + 1])} mm. Move the points apart or use a smaller bend radius.`);
      else if (T[i] > 0 && T[i + 1] > 0 && s < num(st.bender.minStraight)) res.warnings.push(`Only ${fmt(s)} mm of straight between the bends at points ${i + 1} and ${i + 2}. Your bender needs ${num(st.bender.minStraight)} mm to grip.`);
    }
    const extra = Math.max(0, num(st.bender.trim));
    const cT = num(st.bender.calTarget), cA = num(st.bender.calActual), off = num(st.bender.markOffset);
    const f = cT > 0 && cA > 0 ? cT / cA : 1;
    let pos = extra, developed = 0, prevN = null;
    for (let i = 0; i < n - 1; i++) {
      const s = Math.max(0, S[i]);
      pos += s; developed += s;
      const v = i + 1;
      if (v < n - 1 && TH[v] > 0) {
        const arc = R * TH[v];
        let rot = null;
        if (prevN) rot = Math.atan2(V.dot(V.cross(prevN, NRM[v]), U[i]), V.dot(prevN, NRM[v])) * R2D;
        res.bends.push({ no: res.bends.length + 1, vertex: v, angle: TH[v] * R2D, bendTo: Math.min(179, TH[v] * R2D * f), mark: pos - off, start: pos, center: pos + arc / 2, end: pos + arc, arc, rot, straightBefore: S[i] });
        res.tangents.push({ v, A: V.sub(P[v], V.mul(U[i], T[v])), B: V.add(P[v], V.mul(U[v], T[v])), ua: U[i], ub: U[v] });
        pos += arc; developed += arc; prevN = NRM[v];
      }
    }
    res.lastStraight = S[n - 2];
    res.developed = developed;
    res.cut = developed + 2 * extra;
    res.planar = res.bends.every((b) => b.rot === null || Math.abs(b.rot) < 0.5 || Math.abs(Math.abs(b.rot) - 180) < 0.5);
    res.kind = res.bends.length === 0 ? "straight" : res.planar ? "planar" : "3d";
    res.weight = developed * linearDensity(st.stock);

    // centreline with real arcs: fine for drawing and clearance (samples), coarse for the strength check (frame)
    const arcPts = (i, m) => {
      const ua = U[i - 1], ub = U[i], th = TH[i];
      const A = V.sub(P[i], V.mul(ua, T[i]));
      const w = V.norm(V.sub(ub, V.mul(ua, V.dot(ua, ub))));
      const C = V.add(A, V.mul(w, R));
      const a = V.sub(A, C), b = V.cross(NRM[i], a);
      const out = [];
      for (let k = 0; k <= m; k++) { const ph = th * k / m; out.push(V.add(C, V.add(V.mul(a, Math.cos(ph)), V.mul(b, Math.sin(ph))))); }
      return out;
    };
    const pts = [P[0]];
    // frame point: { p, corner (index into t.pts for ends, straight-through corners and the middle of a bend, else -1), bend (bend no. on an arc, else 0) }
    const frame = [{ p: P[0], corner: 0, bend: 0 }];
    let bendNo = 0;
    for (let i = 1; i < n - 1; i++) {
      if (!(TH[i] > 0) || R <= 0) { pts.push(P[i]); frame.push({ p: P[i], corner: i, bend: 0 }); continue; }
      bendNo++;
      pts.push(...arcPts(i, Math.max(4, Math.ceil(TH[i] * R2D / 6))));
      const m = 2 * Math.max(1, Math.ceil(TH[i] * R2D / 60)); // even, at most 30° per piece
      arcPts(i, m).forEach((p, k) => frame.push({ p, corner: k === m / 2 ? i : -1, bend: bendNo }));
    }
    pts.push(P[n - 1]);
    frame.push({ p: P[n - 1], corner: n - 1, bend: 0 });
    res.samples = pts;
    res.frame = frame;

    const dense = densify(pts, 2);
    const copies = t.mirror ? [dense, dense.map(mirrorPt)] : [dense];
    let best = { d: Infinity, name: null };
    for (const ko of st.keepouts) {
      if (!ko.check) continue;
      for (const arr of copies) for (const p of arr) {
        const d = sdf(ko, p) - od / 2;
        if (d < best.d) best = { d, name: ko.name };
        if (d < 0 && res.hits.length < 400) res.hits.push(p);
      }
    }
    res.clearance = best.d === Infinity ? null : best;
    if (res.clearance && res.clearance.d < 0) res.errors.push(`Hits ${res.clearance.name} by ${fmt(-res.clearance.d)} mm.`);
    else if (res.clearance && res.clearance.d < num(st.margin)) res.warnings.push(`Only ${fmt(res.clearance.d)} mm from ${res.clearance.name}.`);
    res.status = res.errors.length ? "bad" : res.warnings.length ? "warn" : "ok";
    return res;
  }

  /** First-fit-decreasing cutting plan into stock rods, with a 2 mm saw cut. */
  function stockPlan(st, results) {
    const L = num(st.stockLen, 1000), kerf = 2;
    const pieces = [];
    for (const t of st.tubes) {
      const r = results.get(t.id);
      if (!r || !(r.cut > 0)) continue;
      const q = t.mirror ? 2 : 1;
      for (let i = 0; i < q; i++) pieces.push({ name: t.name + (t.mirror ? (i ? " (R)" : " (L)") : ""), len: r.cut });
    }
    pieces.sort((a, b) => b.len - a.len);
    const bins = [], tooLong = [];
    for (const p of pieces) {
      if (p.len > L) { tooLong.push(p); continue; }
      let bin = bins.find((b) => b.left >= p.len + (b.items.length ? kerf : 0));
      if (!bin) { bin = { left: L, items: [] }; bins.push(bin); }
      bin.left -= p.len + (bin.items.length ? kerf : 0);
      bin.items.push(p);
    }
    return { bins, tooLong, L };
  }

  /**
   * How far to turn the tube in the bender before a bend, clockwise looking from the start end along the tube.
   * `rot` is the angle from the previous bend's plane to this one (right-handed about the rod). Turning the tube by
   * +a carries the earlier bends round by +a while the bender keeps bending in its own plane, so the turn is −rot.
   * tools/check.mjs simulates a bender to keep this honest.
   */
  const turnOf = (rot) => (rot === null ? null : -rot);
  function rotLabel(rot) {
    const t = turnOf(rot);
    if (t === null) return "–";
    if (Math.abs(t) < 0.5) return "0° · same side";
    if (Math.abs(Math.abs(t) - 180) < 0.5) return "180° · flip over";
    return `${fmt(Math.abs(t))}° ${t > 0 ? "↻ clockwise" : "↺ anticlockwise"}`;
  }

  // ---------- print pack ----------
  // Every page is an SVG in millimetres, landscape. Printed at 100 % it is full size, so tubes can be laid on it.

  const PAPERS = {
    a4: { label: "A4", w: 297, h: 210 },
    letter: { label: "US Letter", w: 279.4, h: 215.9 },
    a3: { label: "A3", w: 420, h: 297 },
  };
  const PC = { ink: "#1b1f23", soft: "#5f6870", body: "#dfe4e8", accent: "#9c6b12", trim: "#c9cfd4", bad: "#b3261e" };
  const PM = 6, TOP = 19, FOOT = 10; // page margin (most printers can't reach closer than 3–5 mm), body top, space kept for the footer
  const f2 = (v) => String(Math.round(v * 100) / 100);
  const v2 = {
    add: (a, b) => [a[0] + b[0], a[1] + b[1]],
    sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
    mul: (a, s) => [a[0] * s, a[1] * s],
    dot: (a, b) => a[0] * b[0] + a[1] * b[1],
    len: (a) => Math.hypot(a[0], a[1]),
    norm: (a) => { const l = Math.hypot(a[0], a[1]); return l > 1e-9 ? [a[0] / l, a[1] / l] : [1, 0]; },
  };

  /** Collects SVG elements; all numbers are millimetres. */
  function pen() {
    const out = [];
    const p = {
      raw(s) { out.push(s); return p; },
      text(x, y, s, size = 3.4, o = {}) {
        const rot = o.rot ? ` transform="rotate(${f2(o.rot)} ${f2(x)} ${f2(y)})"` : "";
        const halo = o.halo ? ` stroke="#ffffff" stroke-width="${f2(size * 0.4)}" stroke-linejoin="round" paint-order="stroke"` : "";
        out.push(`<text x="${f2(x)}" y="${f2(y)}" font-size="${f2(size)}" font-weight="${o.weight || 400}" fill="${o.fill || PC.ink}" text-anchor="${o.anchor || "start"}"${rot}${halo}>${esc(s)}</text>`);
        return p;
      },
      line(x1, y1, x2, y2, stroke = PC.ink, w = 0.3, dash = "") {
        out.push(`<line x1="${f2(x1)}" y1="${f2(y1)}" x2="${f2(x2)}" y2="${f2(y2)}" stroke="${stroke}" stroke-width="${f2(w)}"${dash ? ` stroke-dasharray="${dash}"` : ""}/>`);
        return p;
      },
      rect(x, y, w, h, fill = "none", stroke = "none", sw = 0.3) {
        out.push(`<rect x="${f2(x)}" y="${f2(y)}" width="${f2(Math.max(0, w))}" height="${f2(Math.max(0, h))}" fill="${fill}" stroke="${stroke}" stroke-width="${f2(sw)}"/>`);
        return p;
      },
      circle(cx, cy, r, fill = PC.ink, stroke = "none", sw = 0.3) {
        out.push(`<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${fill}" stroke="${stroke}" stroke-width="${f2(sw)}"/>`);
        return p;
      },
      poly(pts, stroke, w, o = {}) {
        if (pts.length < 2) return p;
        const d = pts.map((q, i) => `${i ? "L" : "M"}${f2(q[0])} ${f2(q[1])}`).join(" ");
        out.push(`<path d="${d}" fill="${o.fill || "none"}" stroke="${stroke}" stroke-width="${f2(w)}" stroke-linecap="${o.cap || "round"}" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ""}/>`);
        return p;
      },
      str: () => out.join(""),
    };
    return p;
  }
  /** Rough width of a line of sans-serif text, for layout only. */
  const textW = (s, size) => String(s).length * size * 0.53;
  function wrapText(s, maxW, size) {
    const lines = [];
    for (const para of String(s).split("\n")) {
      let cur = "";
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const next = cur ? cur + " " + w : w;
        if (cur && textW(next, size) > maxW) { lines.push(cur); cur = w; } else cur = next;
      }
      lines.push(cur);
    }
    return lines;
  }
  /** Writes wrapped text with its top at y and returns the y below it. */
  function para(p, x, y, s, maxW, size = 3.2, o = {}) {
    for (const ln of wrapText(s, maxW, size)) { if (ln) p.text(x, y + size, ln, size, o); y += size * 1.38; }
    return y;
  }
  const settingsLine = (st) => {
    const od = num(st.stock.od), wall = num(st.stock.wall), solid = !(wall > 0 && wall * 2 < od);
    return `Ø${fmt(od, 2).replace(/\.?0+$/, "")} mm ${(MATERIALS[st.stock.material]?.label || "").toLowerCase()} ${solid ? "rod" : "tube"} · bend radius ${fmt(num(st.bender.clr))} · springback ${fmt(num(st.bender.calTarget), 0)}°→${fmt(num(st.bender.calActual), 1)}° · mark offset ${fmt(num(st.bender.markOffset))} mm`;
  };

  /** A flat tube turned into 2D: start→end horizontal, most of the shape above. Null for 3D tubes. */
  /** Lays 3D points that share one plane (origin o, first direction e1, normal nrm) flat: start→end horizontal, most of it above. */
  function toPlane(pts3, o, e1, nrm, level) {
    const e2 = V.cross(nrm, e1);
    const to2 = (p) => { const d = V.sub(p, o); return [V.dot(d, e1), V.dot(d, e2)]; };
    let s2 = pts3.map(to2);
    const last = s2[s2.length - 1];
    const ang = level ? Math.atan2(last[1], last[0]) : 0;
    const ca = Math.cos(-ang), sa = Math.sin(-ang);
    const rotp = (q) => [q[0] * ca - q[1] * sa, q[0] * sa + q[1] * ca];
    s2 = s2.map(rotp);
    const flip = s2.reduce((a, q) => a + q[1], 0) / s2.length < 0 ? -1 : 1;
    return { pts: s2.map((q) => [q[0], q[1] * flip]), map: (p) => { const q = rotp(to2(p)); return [q[0], q[1] * flip]; } };
  }
  function flatShape(r) {
    if (r.kind === "3d" || r.samples.length < 2) return null;
    const e1 = r.U[0];
    const nrm = r.bends.length ? V.norm(V.cross(r.tangents[0].ua, r.tangents[0].ub)) : V.norm(V.cross(e1, Math.abs(e1[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
    return { ...toPlane(r.samples, r.P[0], e1, nrm, r.bends.length > 0), sA: 0, sB: r.developed };
  }
  /** Runs of bends that lie in one plane. A flat tube is one run; a 3D tube has one per twist. */
  function sectionsOf(r) {
    const out = [];
    let i0 = 0;
    for (let i = 1; i <= r.bends.length; i++) {
      const t = i < r.bends.length ? turnOf(r.bends[i].rot) : null;
      if (i === r.bends.length || !(Math.abs(t) < 0.5 || Math.abs(Math.abs(t) - 180) < 0.5)) { out.push({ i0, i1: i - 1, no: out.length }); i0 = i; }
    }
    return out;
  }
  /** Part of a 3D polyline between distances a and b along it. */
  function slice3(pts, a, b) {
    const out = [];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const L = V.len(V.sub(pts[i], pts[i - 1]));
      if (L < 1e-9) continue;
      const at = (sv) => V.add(pts[i - 1], V.mul(V.sub(pts[i], pts[i - 1]), (sv - acc) / L));
      if (!out.length && acc + L >= a) out.push(at(Math.max(a, acc)));
      if (out.length) { if (acc + L >= b) { out.push(at(b)); return out; } out.push(pts[i]); }
      acc += L;
    }
    return out;
  }
  /** One flat section of a 3D tube: from the straight before its first bend to the straight after its last. */
  function sectionShape(r, st, sec) {
    const extra = Math.max(0, num(st.bender.trim)), last = r.bends.length - 1;
    const sA = sec.i0 === 0 ? 0 : r.bends[sec.i0 - 1].end - extra;
    const sB = sec.i1 === last ? r.developed : r.bends[sec.i1 + 1].start - extra;
    const pts3 = slice3(r.samples, sA, sB), tg = r.tangents[sec.i0];
    if (pts3.length < 2) return null;
    return { ...toPlane(pts3, pts3[0], tg.ua, V.norm(V.cross(tg.ua, tg.ub)), true), sA, sB };
  }
  const SEC = (i) => String.fromCharCode(65 + i);
  /** Point and direction at distance s along a 2D polyline; before the start or past the end it carries on straight. */
  function along(pts, s) {
    const n = pts.length;
    let i0 = 1; while (i0 < n - 1 && v2.len(v2.sub(pts[i0], pts[0])) < 1e-9) i0++;
    if (s <= 0) { const d = v2.norm(v2.sub(pts[i0], pts[0])); return { p: v2.add(pts[0], v2.mul(d, s)), d }; }
    let acc = 0;
    for (let i = 1; i < n; i++) {
      const L = v2.len(v2.sub(pts[i], pts[i - 1]));
      if (L > 1e-9 && acc + L >= s) { const d = v2.norm(v2.sub(pts[i], pts[i - 1])); return { p: v2.add(pts[i - 1], v2.mul(d, s - acc)), d }; }
      acc += L;
    }
    let j = n - 2; while (j > 0 && v2.len(v2.sub(pts[n - 1], pts[j])) < 1e-9) j--;
    const d = v2.norm(v2.sub(pts[n - 1], pts[j]));
    return { p: v2.add(pts[n - 1], v2.mul(d, s - acc)), d };
  }

  /** Builds a drawing in model millimetres (y up), then renders it with its top-left corner at (0, 0). */
  function canvas() {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const ops = [], texts = [], placed = [];
    const hit = (r) => placed.some((q) => r[0] < q[2] && r[2] > q[0] && r[1] < q[3] && r[3] > q[1]);
    /** Where a label goes: text next to model point q, pushed `dist` along unit vector nn, growing away from q. */
    const spot = (q, nn, dist, s, size) => {
      const pos = v2.add(q, v2.mul(nn, dist)), w = textW(s, size);
      const anchor = nn[0] > 0.35 ? "start" : nn[0] < -0.35 ? "end" : "middle";
      const by = pos[1] + (nn[1] < -0.35 ? -size * 0.85 : nn[1] > 0.35 ? 0 : -size * 0.35);
      const bx = anchor === "start" ? pos[0] : anchor === "end" ? pos[0] - w : pos[0] - w / 2;
      return { x: pos[0], by, anchor, rect: [bx - 0.4, by - size * 0.3, bx + w + 0.4, by + size * 0.95] };
    };
    const c = {
      grow(x, y, pad = 0) { x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad); y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad); },
      op(f) { ops.push(f); },
      /** Places a label at the first candidate [q, nn, dist] that doesn't cover another label. o.optional: drop it if none is free. */
      label(cands, s, size, o = {}) {
        const spots = cands.map(([q, nn, dist]) => spot(q, nn, dist, s, size));
        let sp = spots.find((x) => !hit(x.rect));
        if (!sp) { if (o.optional) return false; sp = spots[0]; }
        placed.push(sp.rect); c.grow(sp.rect[0], sp.rect[1]); c.grow(sp.rect[2], sp.rect[3]);
        texts.push((p, X, Y) => p.text(X(sp.x), Y(sp.by), s, size, { anchor: sp.anchor, halo: true, ...o }));
        return true;
      },
      /** Rotated label centred on pos; rect is its upright bounding box. */
      textAt(pos, s, size, ang, o = {}) {
        const w = textW(s, size), ar = ang * D2R, hw = (Math.abs(w * Math.cos(ar)) + Math.abs(size * Math.sin(ar))) / 2, hh = (Math.abs(w * Math.sin(ar)) + Math.abs(size * Math.cos(ar))) / 2;
        const rect = [pos[0] - hw, pos[1] - hh, pos[0] + hw, pos[1] + hh];
        placed.push(rect); c.grow(rect[0], rect[1]); c.grow(rect[2], rect[3]);
        const base = v2.add(pos, [Math.sin(ar) * -size * 0.35, -Math.cos(ar) * size * 0.35]);
        texts.push((p, X, Y) => p.text(X(base[0]), Y(base[1]), s, size, { anchor: "middle", rot: ang, halo: true, ...o }));
      },
      render(pad = 2) {
        if (!Number.isFinite(x0)) { x0 = 0; x1 = 10; y0 = 0; y1 = 10; }
        const X = (x) => x - x0 + pad, Y = (y) => y1 - y + pad, p = pen(), bb = { x0, x1, y0, y1 };
        for (const f of ops) f(p, X, Y, bb);
        for (const f of texts) f(p, X, Y, bb);
        return { w: x1 - x0 + 2 * pad, h: y1 - y0 + 2 * pad, el: p.str() };
      },
    };
    return c;
  }

  /**
   * Straight-line distance between the two finished ends, at the tube centres. When both ends cross that line
   * roughly square (like hoop legs), also edge to edge, which is what a ruler can find. Null for straights.
   */
  function endSpan(r, od) {
    if (!r.bends.length || r.P.length < 2) return null;
    const a = r.P[0], b = r.P[r.P.length - 1], d = V.sub(b, a), span = V.len(d);
    if (!(span >= 5)) return null;
    const u = V.mul(d, 1 / span), sinTo = (e) => Math.sqrt(Math.max(0, 1 - V.dot(e, u) ** 2));
    const sa = sinTo(r.U[0]), sb = sinTo(r.U[r.U.length - 1]);
    const square = sa > 0.85 && sb > 0.85, ea = od / 2 / sa, eb = od / 2 / sb;
    return { span, ea, eb, inside: square ? span - ea - eb : null, outside: square ? span + ea + eb : null };
  }
  const spanText = (sp) => (sp.inside === null ? `${fmt(sp.span)} mm between the tube centres` : `inside edges ${fmt(sp.inside)} mm, outside edges ${fmt(sp.outside)} mm`);

  /** Full-size flat shape of a bent tube with the pen lines, bend angles and straight lengths. */
  function shapeDrawing(r, st, sec) {
    const fs = sec ? sectionShape(r, st, sec) : flatShape(r); if (!fs) return null;
    const od = Math.max(0.5, num(st.stock.od, 3)), extra = Math.max(0, num(st.bender.trim));
    const pts = fs.pts, n = pts.length, cv = canvas(), sA = fs.sA, len = fs.sB - fs.sA;
    const i0 = sec ? sec.i0 : 0, i1 = sec ? sec.i1 : r.bends.length - 1, inSec = (i) => i >= i0 && i <= i1;
    const first = i0 === 0, last = i1 === r.bends.length - 1;
    const cen = pts.reduce((a, q) => [a[0] + q[0] / n, a[1] + q[1] / n], [0, 0]);
    const outward = (q, d) => { const a = [-d[1], d[0]]; return v2.dot(a, v2.sub(q, cen)) >= 0 ? a : [d[1], -d[0]]; };
    const across = (q, d, half, stroke, w) => {
      const a = [-d[1], d[0]], p1 = v2.add(q, v2.mul(a, half)), p2 = v2.sub(q, v2.mul(a, half));
      cv.grow(p1[0], p1[1]); cv.grow(p2[0], p2[1]);
      cv.op((p, X, Y) => p.line(X(p1[0]), Y(p1[1]), X(p2[0]), Y(p2[1]), stroke, w));
    };
    // where the tube continues into another section there is no extra: it just stops here on the drawing
    const s0 = along(pts, first ? -extra : 0), s1 = along(pts, len + (last ? extra : 0));
    const startDir = v2.mul(s0.d, -1);
    for (const q of pts) cv.grow(q[0], q[1], od / 2 + 1);
    cv.grow(s0.p[0], s0.p[1], od / 2 + 1); cv.grow(s1.p[0], s1.p[1], od / 2 + 1);
    // the extra at each end, then the tube itself
    cv.op((p, X, Y) => {
      for (const [a, b] of [first && [pts[0], s0.p], last && [pts[n - 1], s1.p]].filter(Boolean)) {
        p.poly([[X(a[0]), Y(a[1])], [X(b[0]), Y(b[1])]], PC.trim, od, { cap: "butt" });
        p.poly([[X(a[0]), Y(a[1])], [X(b[0]), Y(b[1])]], PC.soft, 0.2, { dash: "1 0.8" });
      }
      const sp = pts.map((q) => [X(q[0]), Y(q[1])]);
      p.poly(sp, PC.body, od, { cap: "butt" });
      p.poly(sp, PC.ink, 0.25);
    });
    // bend zones (tangent points) in light orange
    r.tangents.forEach((tg, i) => {
      if (!inSec(i)) return;
      for (const [pt, dir] of [[tg.A, tg.ua], [tg.B, tg.ub]]) {
        const a = fs.map(pt), b = fs.map(V.add(pt, dir));
        across(a, v2.norm(v2.sub(b, a)), od / 2 + 1.2, PC.accent, 0.25);
      }
    });
    // trim lines at the finished ends
    const endA = along(pts, 0), endB = along(pts, len), ends = [first && endA, last && endB].filter(Boolean);
    for (const e of ends) {
      across(e.p, e.d, od / 2 + 2.5, PC.ink, 0.45);
    }
    // a cut end of a section: zig-zag break, and where the tube goes on
    const breakAt = (e, sign, text) => {
      const a = [-e.d[1], e.d[0]], h = od / 2 + 2, w = 1.4;
      const zz = [v2.add(e.p, v2.mul(a, h)), v2.add(v2.add(e.p, v2.mul(a, h / 3)), v2.mul(e.d, w)), v2.sub(v2.sub(e.p, v2.mul(a, h / 3)), v2.mul(e.d, w)), v2.sub(e.p, v2.mul(a, h))];
      for (const q of zz) cv.grow(q[0], q[1]);
      cv.op((p, X, Y) => p.poly(zz.map((q) => [X(q[0]), Y(q[1])]), PC.ink, 0.35));
      cv.label([[e.p, v2.mul(e.d, sign), 2.4]], text, 2.8, { weight: 700, fill: PC.soft });
    };
    if (sec && !first) breakAt(endA, -1, `from section ${SEC(sec.no - 1)}`);
    if (sec && !last) breakAt(endB, 1, `on to section ${SEC(sec.no + 1)}`);
    r.bends.forEach((b, i) => {
      if (!inSec(i)) return;
      const q = along(pts, b.mark - extra - sA), nn = outward(q.p, q.d);
      across(q.p, q.d, od / 2 + 3.5, PC.accent, 0.55);
      cv.label([[q.p, nn, od / 2 + 4.2], [q.p, v2.mul(nn, -1), od / 2 + 4.2]], `B${b.no} · ${fmt(b.mark)}`, 3, { weight: 700, fill: PC.accent });
    });
    if (first) cv.label([[s0.p, startDir, 1.5]], "start end", 2.8, { weight: 700 });
    const sp = sec ? null : endSpan(r, od);
    if (sp) {
      // flatShape puts both ends on y = 0 with the start on the left, so "across the ends" is horizontal here.
      // Inside edges on the upper line, outside edges on the lower one; centres only if the ends aren't square to it.
      const xa = pts[0][0], xb = pts[n - 1][0], ya = pts[0][1], yb = pts[n - 1][1];
      const low = Math.min(...pts.map((q) => q[1]), s0.p[1], s1.p[1]) - od / 2 - 6.5;
      const dims = sp.inside === null
        ? [[xa, xb, low, `${fmt(sp.span)} across the ends (tube centres)`, 1]]
        : [[xa + sp.ea, xb - sp.eb, low, `${fmt(sp.inside)} inside edges`, 1], [xa - sp.ea, xb + sp.eb, low - 6.5, `${fmt(sp.outside)} outside edges`, -1]];
      for (const [l, rr, yl, text, side] of dims) {
        cv.grow(l, yl - 1); cv.grow(rr, yl - 1);
        cv.op((p, X, Y) => {
          p.line(X(l), Y(ya), X(l), Y(yl - 2), PC.ink, 0.18, "1.2 0.8");
          p.line(X(rr), Y(yb), X(rr), Y(yl - 2), PC.ink, 0.18, "1.2 0.8");
          const yy = Y(yl);
          p.line(X(l), yy, X(rr), yy, PC.ink, 0.3);
          p.raw(`<path d="M${f2(X(l))} ${f2(yy)} l2.6 -0.9 v1.8 z M${f2(X(rr))} ${f2(yy)} l-2.6 -0.9 v1.8 z" fill="${PC.ink}"/>`);
        });
        cv.label([[[(l + rr) / 2, yl], [0, side], 1]], text, 3, { weight: 700 });
      }
    }
    for (const e of ends) { const nn = outward(e.p, e.d); cv.label([[e.p, nn, od / 2 + 2.8], [e.p, v2.mul(nn, -1), od / 2 + 2.8]], "trim", 2.6, { fill: PC.soft, optional: true }); }
    // straight lengths along each straight, outside the shape (a section shows the whole straight at each cut end)
    const segs = [];
    let a = pts[0];
    r.bends.forEach((b, i) => { if (!inSec(i)) return; segs.push([a, fs.map(r.tangents[i].A), b.straightBefore]); a = fs.map(r.tangents[i].B); });
    segs.push([a, pts[n - 1], last ? r.lastStraight : r.bends[i1 + 1].straightBefore]);
    for (const [p1, p2, len] of segs) {
      if (!(len >= 3)) continue;
      const d = v2.norm(v2.sub(p2, p1)), mid = v2.mul(v2.add(p1, p2), 0.5), nn = outward(mid, d), size = 2.8, s = `${fmt(len)} straight`;
      let ang = Math.atan2(-d[1], d[0]) * R2D; if (ang > 90) ang -= 180; if (ang <= -90) ang += 180;
      const ar = ang * D2R, up = [Math.sin(ar), Math.cos(ar)]; // text "up" in model coordinates (y up)
      // baseline on the outer side; centre of the text half a line further out
      const pos = v2.add(mid, v2.mul(nn, od / 2 + 1.8 + (v2.dot(up, nn) > 0 ? size * 0.35 : size * 0.8 - size * 0.35)));
      cv.textAt(pos, s, size, ang, { fill: PC.soft });
    }
    // each bend's angle at its corner, where there is room (the steps list has them too)
    r.bends.forEach((b, i) => {
      if (!inSec(i)) return;
      const vtx = fs.map(r.P[r.tangents[i].v]), mid = along(pts, b.center - extra - sA).p;
      cv.label([[vtx, v2.norm(v2.sub(vtx, mid)), 1.2]], `${fmt(b.angle)}°`, 2.8, { fill: PC.accent, optional: true });
    });
    return cv.render(1.5);
  }

  /** Full-size view of the whole cage, for holding parts while they are joined. */
  const PRINT_VIEWS = {
    side: { r: [1, 0, 0], u: [0, 0, 1], name: "Side, from the right", hint: "front of the car →", ground: true },
    top: { r: [1, 0, 0], u: [0, 1, 0], name: "Top", hint: "front of the car →   ·   car's left ↑", centre: "h" },
    front: { r: [0, 1, 0], u: [0, 0, 1], name: "Front", hint: "car's left →", ground: true, centre: "v" },
  };
  function viewDrawing(st, results, vid) {
    const ax = PRINT_VIEWS[vid], od = Math.max(0.5, num(st.stock.od, 3)), cv = canvas();
    const pr = (p) => [V.dot(p, ax.r), V.dot(p, ax.u)];
    const items = [];
    for (const t of st.tubes) {
      const r = results.get(t.id); if (!r || r.samples.length < 2) continue;
      const copies = t.mirror ? [[r.samples, r.P], [r.samples.map(mirrorPt), r.P.map(mirrorPt)]] : [[r.samples, r.P]];
      copies.forEach(([s, P], ci) => items.push({ t, ci, pts: s.map(pr), P: P.map(pr) }));
    }
    for (const it of items) for (const q of it.pts) cv.grow(q[0], q[1], od / 2 + 1);
    if (ax.ground && items.length) cv.grow(items[0].pts[0][0], -1); // keep the ground line on the sheet
    cv.op((p, X, Y, bb) => {
      if (ax.ground) { p.line(X(bb.x0), Y(0), X(bb.x1), Y(0), PC.soft, 0.5); p.text(X(bb.x0), Y(0) + 3.5, "ground", 2.6, { fill: PC.soft }); }
      if (ax.centre === "h") p.line(X(bb.x0), Y(0), X(bb.x1), Y(0), PC.soft, 0.25, "6 1.5 1 1.5");
      if (ax.centre === "v") p.line(X(0), Y(bb.y0), X(0), Y(bb.y1), PC.soft, 0.25, "6 1.5 1 1.5");
      for (const it of items) {
        const sp = it.pts.map((q) => [X(q[0]), Y(q[1])]);
        p.poly(sp, PC.ink, od + 0.5); p.poly(sp, PC.body, od); p.poly(sp, PC.soft, 0.15);
      }
      for (const it of items) for (const q of [it.P[0], it.P[it.P.length - 1]]) p.circle(X(q[0]), Y(q[1]), 0.9, PC.ink);
    });
    for (const it of items) {
      if (it.ci) continue;
      const segs = [];
      for (let i = 1; i < it.P.length; i++) segs.push({ L: v2.len(v2.sub(it.P[i], it.P[i - 1])), a: it.P[i - 1], b: it.P[i] });
      segs.sort((a, b) => b.L - a.L);
      const cands = [];
      for (const sg of segs.filter((x) => x.L >= 1)) for (const f of [0.5, 0.3, 0.7, 0.15, 0.85]) {
        const q = v2.add(sg.a, v2.mul(v2.sub(sg.b, sg.a), f)), d = v2.norm(v2.sub(sg.b, sg.a)), up = [-d[1], d[0]][1] >= 0 ? [-d[1], d[0]] : [d[1], -d[0]];
        cands.push([q, up, od / 2 + 2], [q, v2.mul(up, -1), od / 2 + 2]);
      }
      if (cands.length) cv.label(cands, it.t.name, 2.6, { weight: 600 });
    }
    return cv.render(3);
  }

  /** Marking strip: the cut rod at full size, wrapped to the page width. Returns the y below it. */
  function drawStrip(p, x, y, width, r, st) {
    const od = Math.max(0.5, num(st.stock.od, 3)), extra = Math.max(0, num(st.bender.trim)), cut = Math.max(1, r.cut);
    const rows = Math.ceil(cut / width), rowLen = Math.ceil(cut / rows / 10) * 10;
    for (let ri = 0; ri < rows; ri++) {
      const s0 = ri * rowLen, len = Math.min(rowLen, cut - s0), yy = y + 8.5 + od / 2;
      const sx = (s) => x + (s - s0), inRow = (s) => s >= s0 - 1e-6 && s <= s0 + len + 1e-6;
      const band = (a, b, fill, op = 1) => { const ca = Math.max(a, s0), cb = Math.min(b, s0 + len); if (cb > ca) p.raw(`<rect x="${f2(sx(ca))}" y="${f2(yy - od / 2)}" width="${f2(cb - ca)}" height="${f2(od)}" fill="${fill}" fill-opacity="${op}"/>`); };
      p.rect(x, yy - od / 2, len, od, PC.body);
      band(0, extra, PC.trim); band(cut - extra, cut, PC.trim);
      for (const b of r.bends) band(b.start, b.end, PC.accent, 0.28);
      p.rect(x, yy - od / 2, len, od, "none", PC.soft, 0.2);
      for (const s of [extra, cut - extra]) if (extra > 0 && inRow(s)) p.line(sx(s), yy - od / 2 - 1.5, sx(s), yy + od / 2 + 1.5, PC.ink, 0.3, "0.8 0.6");
      let lastEnd = -Infinity, lift = 0;
      for (const b of r.bends) {
        if (!inRow(b.mark)) continue;
        const s = `B${b.no} · ${fmt(b.mark)}`, w = textW(s, 3);
        lift = sx(b.mark) - w / 2 < lastEnd + 1 ? (lift ? 0 : 4) : 0;
        p.line(sx(b.mark), yy - od / 2 - 4 - lift, sx(b.mark), yy + od / 2 + 1.5, PC.accent, 0.55);
        p.text(sx(b.mark), yy - od / 2 - 5 - lift, s, 3, { weight: 700, fill: PC.accent, anchor: "middle" });
        lastEnd = sx(b.mark) + w / 2;
      }
      for (let m = Math.ceil(s0); m <= s0 + len + 1e-6; m++) {
        const big = m % 10 === 0, mid = m % 5 === 0;
        if (!mid && len > 0 && od < 2) continue;
        p.line(sx(m), yy + od / 2 + 0.6, sx(m), yy + od / 2 + 0.6 + (big ? 3 : mid ? 2 : 1), PC.soft, big ? 0.25 : 0.15);
        if (big) p.text(sx(m), yy + od / 2 + 6.4, String(m), 2.2, { fill: PC.soft, anchor: "middle" });
      }
      if (ri < rows - 1) p.text(x + len + 2, yy + 1, "continues below ↓", 2.4, { fill: PC.soft });
      if (ri > 0) p.text(x - 1, yy + 1, "↳", 3, { fill: PC.soft, anchor: "end" });
      y = yy + od / 2 + 8.5;
    }
    return y;
  }

  const rotText = (b) => {
    const t = turnOf(b.rot);
    if (t === null) return "";
    if (Math.abs(t) < 0.5) return "Same way as the last bend. ";
    if (Math.abs(Math.abs(t) - 180) < 0.5) return "Turn the tube over first (half a turn), so this one bends the other way. ";
    return `First turn the tube ${fmt(Math.abs(t), 0)}° ${t > 0 ? "clockwise ↻" : "anticlockwise ↺"} (looking from the start end), using the protractor. `;
  };

  /** Bend steps ②–④ in a column. `where` says where the drawing is. Returns the y below them. */
  function drawSteps(p, x, y, colW, t, r, where, od) {
    y = para(p, x, y, "② BEND, one at a time, starting from the start end.", colW, 3.4, { weight: 700 }) + 1;
    for (const b of r.bends) {
      p.text(x, y + 4.2, `B${b.no}`, 4.2, { weight: 700, fill: PC.accent });
      y = para(p, x + 11, y, `Line on 0, pull to ${Math.round(b.bendTo)}°`, colW - 11, 3.8, { weight: 700 });
      y = para(p, x + 11, y, `${rotText(b)}Springs back to ${fmt(b.angle)}°.`, colW - 11, 2.8, { fill: PC.soft }) + 1.6;
    }
    if (r.kind === "planar" && r.bends.every((b) => b.rot === null || Math.abs(b.rot) < 0.5)) y = para(p, x, y, "Keep the tube flat: don't twist it between bends.", colW, 3) + 1.5;
    if (where) y = para(p, x, y, `③ CHECK after every bend: lay the tube on the drawing ${where}. It should follow the drawing up to the next B line. Under-bent? Put it back and pull a little more.`, colW, 3.2, { weight: 700 }) + 1.5;
    else y = para(p, x, y, "③ CHECK each section once its bends are done: lay that part of the tube flat on its full-size drawing (next sheet). Only that part touches the paper; the rest of the tube points up off it.", colW, 3.2, { weight: 700 });
    if (!where) y = para(p, x + 6, y, "The sections can't show which way a twist went. When the part is done, hold it against the full-size Side and Front assembly sheets: a twist the wrong way shows there as a mirror image.", colW - 6, 2.8) + 1.5;
    y = para(p, x, y, "④ TRIM both ends at the trim lines.", colW, 3.2, { weight: 700 });
    const sp = endSpan(r, od);
    y = (sp ? para(p, x + 6, y, `Then measure straight across the ends: ${spanText(sp)}.`, colW - 6, 3.2, { weight: 700 }) : y) + 1.5;
    if (t.mirror) y = para(p, x, y, r.kind === "3d" ? "Make 2: bend the second one with every turn the other way." : "Make 2 the same: the second one just fits turned over.", colW, 3) + 1.5;
    for (const m of r.errors) y = para(p, x, y, "Fix in the app first: " + m, colW, 2.8, { fill: PC.bad });
    for (const m of r.warnings) y = para(p, x, y, m, colW, 2.6, { fill: PC.soft });
    return y;
  }

  /** Full-size protractor for the twists of a 3D tube, as seen from the start end looking along the tube. */
  function protractorDrawing(r, od) {
    const R = 36, cv = canvas();
    const turns = r.bends.map((b) => ({ no: b.no, t: turnOf(b.rot) })).filter((x) => x.t !== null && Math.abs(x.t) >= 0.5);
    const P = (deg, rr) => [Math.cos(-deg * D2R) * rr, Math.sin(-deg * D2R) * rr]; // positive = clockwise on the page
    cv.grow(-R - 3, -R - 3); cv.grow(R + 3, R + 3);
    cv.op((p, X, Y) => {
      p.circle(X(0), Y(0), R, "none", PC.ink, 0.35);
      for (let d = 0; d < 360; d += 5) {
        const big = d % 30 === 0, a = P(d, R), b = P(d, R - (big ? 3.5 : d % 15 === 0 ? 2.4 : 1.4));
        p.line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), PC.ink, big ? 0.3 : 0.18);
        const covered = turns.some(({ t }) => Math.abs((((d - t) % 360) + 540) % 360 - 180) < 7); // a turn line runs through it
        if (big && d && !covered) { const q = P(d, R - 6.2); p.text(X(q[0]), Y(q[1]) + 0.8, String(Math.min(d, 360 - d)), 2.2, { anchor: "middle", fill: PC.soft }); }
      }
      p.line(X(od / 2 + 0.8), Y(0), X(R), Y(0), PC.ink, 0.7);
      p.circle(X(0), Y(0), od / 2, "none", PC.ink, 0.3);
      for (const { t } of turns) { const a = P(t, od / 2 + 0.8), b = P(t, R + 1.5); p.line(X(a[0]), Y(a[1]), X(b[0]), Y(b[1]), PC.accent, 0.6); }
    });
    cv.label([[[R, 0], [1, 0], 1.5]], "0 = part you bent last", 2.6, { weight: 700 });
    cv.label([[[0, 0], [0, -1], od / 2 + 1.5]], "tube", 2.2, { fill: PC.soft });
    for (const { no, t } of turns) {
      const dir = v2.norm(P(t, 1));
      cv.label([[P(t, R + 1.5), dir, 1.2]], `B${no}: ${fmt(Math.abs(t), 0)}° ${Math.abs(Math.abs(t) - 180) < 0.5 ? "over" : t > 0 ? "↻" : "↺"}`, 3, { weight: 700, fill: PC.accent });
    }
    return cv.render(2);
  }

  /** A 3D part: strip, steps and the twist protractor, then each flat section at full size on the next sheet(s). */
  function bent3dPages(t, r, st, paper, head, cutAndMark, od) {
    const W = paper.w, H = paper.h, bottom = H - FOOT, aw = W - 2 * PM;
    const p = pen(), y = cutAndMark(p, PM, TOP, aw);
    const colW = Math.min(112, aw * 0.42), px = PM + colW + 8, pw = W - PM - px;
    drawSteps(p, PM, y, colW, t, r, null, od);
    const prot = protractorDrawing(r, od);
    let yp = para(p, px, y, "TWIST PROTRACTOR (full size)", pw, 3.2, { weight: 700 });
    yp = para(p, px, yp, "Look along the tube from the start end. Put 0 on the part you bent last: it lies flat in the bender. Hold the protractor still and turn the tube until that part points at the line for the next bend.", Math.min(pw, 125), 2.8) + 1.5;
    const protHere = yp + prot.h <= bottom;
    if (protHere) p.raw(`<g transform="translate(${f2(px + Math.max(0, (Math.min(pw, 125) - prot.w) / 2))} ${f2(yp)})">${prot.el}</g>`);
    const pages = [{ head, body: p.str() }];

    const secs = sectionsOf(r);
    const items = secs.map((sec) => {
      const tt = turnOf(r.bends[sec.i0].rot);
      const bendsTxt = sec.i0 === sec.i1 ? `B${sec.i0 + 1}` : `B${sec.i0 + 1}–B${sec.i1 + 1}`;
      return { d: shapeDrawing(r, st, sec), title: `Section ${SEC(sec.no)}: ${bendsTxt}`, sub: sec.no === 0 ? "from the start end" : `after turning ${fmt(Math.abs(tt), 0)}° ${tt > 0 ? "clockwise" : "anticlockwise"} before B${sec.i0 + 1}` };
    }).filter((it) => it.d);
    if (!protHere) items.push({ d: prot, title: "Twist protractor (full size)", sub: "see the steps on the previous sheet" });
    const note = "③ CHECK each section on its drawing: lay that part of the tube flat on it. Only that part touches the paper; the rest points up off it. Each drawing is full size.";
    const shead = { title: `${t.name}: flat sections`, sub: head.sub };
    let q = pen(), top0 = para(q, PM, TOP, note, aw, 3, { weight: 600 }) + 2, x = PM, yy = top0, rowH = 0, used = false;
    const flush = () => { if (used) pages.push({ head: shead, body: q.str() }); q = pen(); top0 = para(q, PM, TOP, note, aw, 3, { weight: 600 }) + 2; x = PM; yy = top0; rowH = 0; used = false; };
    for (const it of items) {
      const bw = Math.max(it.d.w, textW(it.title, 3.2)), bh = it.d.h + 9;
      if (bw > aw || bh > bottom - top0) { flush(); pages.push(...drawingPages(it.d, paper, { title: `${t.name}: ${it.title}`, sub: it.sub }, `${note} ${it.title}, ${it.sub}.`)); continue; }
      if (x > PM && x + bw > PM + aw) { x = PM; yy += rowH + 4; rowH = 0; }
      if (yy + bh > bottom) flush();
      q.text(x, yy + 3.4, it.title, 3.4, { weight: 700 });
      q.text(x, yy + 7.4, it.sub, 2.6, { fill: PC.soft });
      q.raw(`<g transform="translate(${f2(x)} ${f2(yy + 9)})">${it.d.el}</g>`);
      x += bw + 10; rowH = Math.max(rowH, bh); used = true;
    }
    flush();
    return pages;
  }

  /**
   * One bent part, on one page if any of these fit, in this order:
   *  A. strip across the top, steps on the left below it, full-size shape on the right;
   *  B. shape on the right at full height, strip (wrapped to the column) and steps on the left;
   *  C. strip page, then steps next to the shape on a second page;
   *  D. strip and steps, then the shape split over as many sheets as it needs.
   */
  function bentPartPages(t, r, st, paper) {
    const W = paper.w, H = paper.h, bottom = H - FOOT, q = t.mirror ? 2 : 1, od = Math.max(0.5, num(st.stock.od, 3));
    const head = { title: t.name, sub: `Make ${q}${t.mirror ? " (left and right)" : ""} · ${r.bends.length} bend${r.bends.length > 1 ? "s" : ""} · cut ${fmt(r.cut)} mm` };
    const shape = shapeDrawing(r, st);
    const cutAndMark = (p, x, y, w) => {
      y = para(p, x, y, `① CUT AND MARK. Cut ${fmt(r.cut)} mm, lay it on the bar from the left edge and copy every B line onto the tube.`, w, 3.2, { weight: 700 });
      y = drawStrip(p, x, y, w, r, st);
      return para(p, x, y, "Orange = bend zone · grey = extra, trimmed off at the end · tip: a small masking-tape flag with its edge on each line (start-end side) stops the bender rubbing it off.", w, 2.4, { fill: PC.soft }) + 1.5;
    };
    const at = (p, x, y) => p.raw(`<g transform="translate(${f2(x)} ${f2(y)})">${shape.el}</g>`);
    if (r.kind === "3d") return bent3dPages(t, r, st, paper, head, cutAndMark, od);
    // A
    {
      const p = pen(), y = cutAndMark(p, PM, TOP, W - 2 * PM);
      const colW = Math.min(92, (W - 2 * PM) * 0.34), areaX = PM + colW + 4, areaW = W - PM - areaX;
      if (!shape || (shape.w <= areaW && shape.h <= bottom - y)) {
        const ys = drawSteps(p, PM, y, colW, t, r, shape ? "→" : null, od);
        if (shape) at(p, areaX + (areaW - shape.w) / 2, y);
        if (!shape || ys <= bottom) return [{ head, body: p.str() }];
      }
    }
    if (!shape) return [];
    // B
    const leftW = W - 2 * PM - shape.w - 4;
    if (shape.h <= bottom - TOP && leftW >= 110) {
      const p = pen();
      const y = cutAndMark(p, PM, TOP, leftW), ys = drawSteps(p, PM, y, Math.min(leftW, 120), t, r, "→", od);
      if (ys <= bottom) { at(p, W - PM - shape.w, TOP); return [{ head, body: p.str() }]; }
    }
    // C
    const colW = Math.min(92, (W - 2 * PM) * 0.34), areaX = PM + colW + 4, areaW = W - PM - areaX;
    const p = pen(), y = cutAndMark(p, PM, TOP, W - 2 * PM);
    if (shape.w <= areaW && shape.h <= bottom - TOP) {
      para(p, PM, y + 2, "② BEND and ③ CHECK: next page, with the full-size drawing.", W - 2 * PM, 3.4, { weight: 700 });
      const p2 = pen();
      drawSteps(p2, PM, TOP, colW, t, r, "→", od);
      at(p2, areaX + (areaW - shape.w) / 2, TOP);
      return [{ head, body: p.str() }, { head: { title: `${t.name}: bend and check`, sub: head.sub }, body: p2.str() }];
    }
    // D
    drawSteps(p, PM, y, colW, t, r, "on the next sheets", od);
    return [{ head, body: p.str() }, ...drawingPages(shape, paper, { title: `${t.name}: full-size shape`, sub: head.sub }, "③ CHECK after every bend: lay the tube on this drawing. It should follow it up to the next B line.")];
  }

  /** Puts a drawing on as many sheets as it needs, with + marks in the overlaps to line the sheets up. */
  function drawingPages(d, paper, head, note) {
    const W = paper.w, H = paper.h, aw = W - 2 * PM, ov = 14;
    const p0 = pen(), ny0 = para(p0, PM, TOP, note, aw, 3, { weight: 600 }) + 2;
    const ah = H - FOOT - ny0;
    const nx = d.w <= aw ? 1 : Math.ceil((d.w - ov) / (aw - ov)), ny = d.h <= ah ? 1 : Math.ceil((d.h - ov) / (ah - ov));
    if (nx * ny === 1) {
      p0.raw(`<g transform="translate(${f2(PM + (aw - d.w) / 2)} ${f2(ny0)})">${d.el}</g>`);
      return [{ head, body: p0.str() }];
    }
    const marks = pen();
    const cross = (x, y) => { marks.line(x - 3, y, x + 3, y, PC.ink, 0.25).line(x, y - 3, x, y + 3, PC.ink, 0.25).circle(x, y, 1.2, "none", PC.ink, 0.2); };
    for (let i = 1; i < nx; i++) for (let j = 0; j < ny; j++) cross(i * (aw - ov) + ov / 2, j * (ah - ov) + ah / 2);
    for (let j = 1; j < ny; j++) for (let i = 0; i < nx; i++) cross(i * (aw - ov) + aw / 2, j * (ah - ov) + ov / 2);
    const pages = [];
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const p = pen();
      para(p, PM, TOP, `${note} Sheet ${j * nx + i + 1} of ${nx * ny} (row ${j + 1}, column ${i + 1}): overlap the sheets so the + marks line up, then tape them.`, aw, 3, { weight: 600 });
      p.raw(`<svg x="${f2(PM)}" y="${f2(ny0)}" width="${f2(aw)}" height="${f2(ah)}" viewBox="${f2(i * (aw - ov))} ${f2(j * (ah - ov))} ${f2(aw)} ${f2(ah)}" overflow="hidden">${d.el}${marks.str()}</svg>`);
      p.rect(PM, ny0, aw, ah, "none", PC.soft, 0.15);
      pages.push({ head: { ...head, sub: `${head.sub ? head.sub + " · " : ""}sheet ${j * nx + i + 1} of ${nx * ny}` }, body: p.str() });
    }
    return pages;
  }

  /** All straight pieces at full size, as many per sheet as fit. */
  function straightPages(list, st, paper) {
    const W = paper.w, H = paper.h, aw = W - 2 * PM, od = Math.max(0.5, num(st.stock.od, 3));
    const pages = [], at = new Map();
    const intro = "Lay the rod on its bar and mark both dashed lines: that is the length between the centres of the tubes it joins. Cut on the outer ends (the grey part is extra), then file each end until it sits snugly against its tubes.";
    let p = pen(), y = para(p, PM, TOP, intro, aw, 3, { weight: 600 }) + 2;
    for (const { t, r } of list) {
      const need = 6 + Math.ceil(r.cut / aw) * (od + 19);
      if (y + need > H - FOOT && y > TOP + 20) { pages.push({ head: { title: "Straight pieces" }, body: p.str() }); p = pen(); y = para(p, PM, TOP, intro, aw, 3, { weight: 600 }) + 2; }
      at.set(t.id, pages.length);
      y = para(p, PM, y, `${t.name} · make ${t.mirror ? 2 : 1} · ${fmt(r.developed)} mm centre to centre · cut ${fmt(r.cut)} mm`, aw, 3.4, { weight: 700 });
      y = drawStrip(p, PM, y - 4, aw, r, st) + 1;
    }
    pages.push({ head: { title: "Straight pieces" }, body: p.str() });
    return { pages, at };
  }

  /** Test bend on scrap: reads springback and where the bend really starts relative to the line. */
  function testBendPage(st, paper) {
    const W = paper.w, R = Math.max(0, num(st.bender.clr)), od = Math.max(0.5, num(st.stock.od, 3));
    const star = 100 + R + od / 2, hb = R + 8, ht = R + 88;
    const p = pen(), colW = W - 2 * PM - 150;
    let y = para(p, PM, TOP, "Do this once, on a scrap piece, before bending any part. It measures your bender, so the lines and angles in this pack match it.", colW, 3.2, { weight: 700 }) + 2;
    const steps = [
      "1. Cut a scrap about 200 mm long. Draw a line 100 mm from one end.",
      "2. Put the line on the bender's 0, with the 100 mm end on the side that stays still. Bend to 90° on the bender's scale and let go.",
      "3. Lay the piece on the drawing: the 100 mm end against the stop line, that leg on the grey bar, the other leg pointing up.",
      "4. Read both rulers where the outside edge of the upright leg crosses them.",
      "5. Springback: work out TOP − BOTTOM and find it in the table. In the app, enter 90 → that angle under \"Springback test\".",
      `6. Mark offset: BOTTOM − ▲ − (TOP − BOTTOM) ÷ 10. ▲ (${fmt(star)}) is where the edge sits if the bend starts exactly on your line. Enter it as "Mark offset" in the app. More than 0 means the bend starts after your line; the printed lines then move earlier to make up for it.`,
      "7. Print this pack again, so every page uses the new numbers.",
    ];
    for (const s of steps) y = para(p, PM, y, s, colW, 3.1) + 1.2;
    y += 2;
    p.text(PM, y + 3.4, "TOP − BOTTOM   →   angle after springback", 3, { weight: 700 }); y += 6;
    const rows = [[-2.8, 92], [-1.4, 91], [0, 90], [1.4, 89], [2.8, 88], [4.2, 87], [5.6, 86], [7, 85], [8.4, 84], [9.8, 83], [11.2, 82]];
    rows.forEach(([d, a], i) => {
      const cx = PM + (i % 2) * 42, cy = y + Math.floor(i / 2) * 5;
      p.text(cx + 14, cy + 3.4, `${d > 0 ? "+" : d < 0 ? "−" : ""}${fmt(Math.abs(d))} mm`, 3, { anchor: "end" });
      p.text(cx + 18, cy + 3.4, `${a}°`, 3, { weight: 700 });
    });
    // the gauge, full size
    const cv = canvas(), bar = [[0, 0], [100, 0]];
    for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (Math.PI / 2) * k / 12; bar.push([100 + R * Math.cos(a), R + R * Math.sin(a)]); }
    bar.push([100 + R, ht + 10]);
    for (const q of bar) cv.grow(q[0], q[1], od / 2 + 1);
    cv.grow(-4, -10); cv.grow(star + 18, ht + 14);
    cv.op((pp, X, Y) => {
      const sp = bar.map((q) => [X(q[0]), Y(q[1])]);
      pp.poly(sp, PC.body, od, { cap: "butt" }); pp.poly(sp, PC.soft, 0.25);
      pp.line(X(0), Y(-9), X(0), Y(9), PC.ink, 0.7);
      pp.text(X(0) + 1.5, Y(-9) + 0.5, "stop: tube end here", 2.6, { fill: PC.ink });
      pp.line(X(100), Y(-od / 2 - 2.5), X(100), Y(od / 2 + 2.5), PC.accent, 0.55);
      pp.text(X(100), Y(-od / 2 - 2.5) + 3, "your line (100 mm)", 2.6, { fill: PC.accent, anchor: "middle" });
      for (const [h, lab] of [[hb, "BOTTOM"], [ht, "TOP"]]) {
        const yy = Y(h);
        pp.line(X(star - 16), yy, X(star + 16), yy, PC.ink, 0.35);
        for (let m = Math.ceil(star - 16); m <= star + 16; m++) {
          const big = m % 5 === 0;
          pp.line(X(m), yy, X(m), yy - (big ? 3 : 1.6), PC.ink, big ? 0.3 : 0.18);
          if (big) pp.text(X(m), yy - 4, String(m), 2.4, { anchor: "middle" });
        }
        pp.raw(`<path d="M${f2(X(star))} ${f2(yy + 0.6)} l-1.4 2.6 h2.8 z" fill="${PC.accent}"/>`);
        pp.text(X(star - 17), yy + 1, lab, 3, { weight: 700, anchor: "end" });
      }
      pp.text(X(star) + 2.2, Y(hb) + 3.2, fmt(star), 2.6, { fill: PC.accent, weight: 700 });
    });
    const g = cv.render(2);
    p.raw(`<g transform="translate(${f2(W - PM - g.w)} ${f2(TOP)})">${g.el}</g>`);
    return { head: { title: "Test bend: measure your bender", sub: "Scrap piece · ten minutes · once per bender and tube" }, body: p.str() };
  }

  function frame(paper, pg, i, n, st, screen) {
    const W = paper.w, H = paper.h, p = pen();
    p.text(PM, PM + 4.4, pg.head.title, 5, { weight: 700 });
    if (pg.head.sub) p.text(PM + textW(pg.head.title, 5) * 1.12 + 3, PM + 4.4, pg.head.sub, 3, { fill: PC.soft });
    p.text(W - PM, PM + 4.4, `${i} / ${n}`, 3.4, { anchor: "end", weight: 700 });
    p.text(W - PM - textW(`${i} / ${n}`, 3.4) - 4, PM + 4.4, st.name || "", 2.6, { anchor: "end", fill: PC.soft });
    p.line(PM, PM + 7, W - PM, PM + 7, PC.trim, 0.25);
    const by = H - PM - 1.5;
    p.line(PM, by, PM + 50, by, PC.ink, 0.6);
    for (let m = 0; m <= 50; m += 10) p.line(PM + m, by - 1.6, PM + m, by + 1.6, PC.ink, 0.3);
    p.text(PM + 53, by + 1, "50 mm: check it with a ruler. Print at 100 % (actual size).", 2.4);
    p.text(W - PM, by + 1, settingsLine(st), 2.3, { anchor: "end", fill: PC.soft });
    const size = screen ? `width="100%"` : `width="${f2(W)}mm" height="${f2(H)}mm"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" ${size} viewBox="0 0 ${f2(W)} ${f2(H)}" font-family="Arial, Helvetica, sans-serif" role="img" aria-label="${esc(pg.head.title)}"><rect width="${f2(W)}" height="${f2(H)}" fill="#ffffff"/>${pg.body}${p.str()}</svg>`;
  }

  /**
   * The whole print pack: cover, test bend, one page per bent part, straight pieces, full-size assembly views.
   * opts: { paper: key of PAPERS, only: tube id (that part's pages only), screen: SVGs scale to their container, date }.
   */
  function printPack(st, results, opts = {}) {
    const paper = PAPERS[opts.paper] || PAPERS.a4;
    const list = st.tubes.map((t) => ({ t, r: results.get(t.id) })).filter((x) => x.r && x.r.P.length >= 2);
    const bent = list.filter((x) => x.r.bends.length), straight = list.filter((x) => !x.r.bends.length);
    let pages;
    if (opts.only) {
      const it = list.find((x) => x.t.id === opts.only);
      pages = !it ? [] : it.r.bends.length ? bentPartPages(it.t, it.r, st, paper) : straightPages([it], st, paper).pages;
    } else {
      const partPages = [], index = [];
      let no = 3; // 1 cover, 2 test bend
      for (const it of bent) { const pg = bentPartPages(it.t, it.r, st, paper); index.push({ ...it, page: no }); no += pg.length; partPages.push(...pg); }
      const sp = straight.length ? straightPages(straight, st, paper) : { pages: [], at: new Map() };
      for (const it of straight) index.push({ ...it, page: no + sp.at.get(it.t.id) });
      no += sp.pages.length;
      const views = [];
      for (const vid of ["side", "top", "front"]) {
        const d = viewDrawing(st, results, vid);
        views.push(...drawingPages(d, paper, { title: `Assembly: ${PRINT_VIEWS[vid].name}`, sub: PRINT_VIEWS[vid].hint }, "Full size. Tape the parts onto this sheet to hold them while you join them. Dots are tube ends. Tubes that aren't flat to the page look shorter here, so take lengths from the part pages, not from this sheet."));
      }
      pages = [coverPage(st, results, index, no, paper, opts), testBendPage(st, paper), ...partPages, ...sp.pages, ...views];
    }
    return { paper: { ...paper }, pages: pages.map((pg, i) => ({ title: pg.head.title, svg: frame(paper, pg, i + 1, pages.length, st, opts.screen) })) };
  }

  function coverPage(st, results, index, assemblyFrom, paper, opts) {
    const W = paper.w, p = pen(), tw = Math.min(170, (W - 2 * PM) * 0.6), cols = [0, 0.5, 0.62, 0.84, 1];
    let y = TOP;
    p.text(PM, y + 4, "Parts", 4, { weight: 700 }); y += 7;
    const head = ["Part", "Make", "Shape", "Cut (mm)", "Page"];
    head.forEach((h, i) => p.text(PM + tw * cols[i] - (i >= 3 ? 2 : 0), y + 3.4, h, 3, { weight: 700, anchor: i >= 3 ? "end" : "start" }));
    y += 5; p.line(PM, y, PM + tw, y, PC.ink, 0.3);
    let pieces = 0, grams = 0;
    for (const { t, r, page } of index) {
      const q = t.mirror ? 2 : 1; pieces += q; grams += q * r.weight;
      const shape = r.bends.length ? `${r.bends.length} bend${r.bends.length > 1 ? "s" : ""}${r.kind === "3d" ? ", 3D" : ""}` : "straight";
      const cells = [t.name, String(q), shape, fmt(r.cut), String(page)];
      cells.forEach((c, i) => p.text(PM + tw * cols[i] - (i >= 3 ? 2 : 0), y + 4.2, c, 3, { anchor: i >= 3 ? "end" : "start", fill: i === 0 && r.status === "bad" ? PC.bad : PC.ink }));
      y += 5.6; p.line(PM, y, PM + tw, y, PC.trim, 0.2);
    }
    const plan = stockPlan(st, results);
    y = para(p, PM, y + 2, `${pieces} pieces, about ${fmt(grams, 0)} g, cut from ${plan.bins.length} × ${fmt(plan.L, 0)} mm stock. Assembly sheets start on page ${assemblyFrom}.`, tw, 3);
    if (index.some(({ r }) => r.status === "bad")) para(p, PM, y + 1, "Parts in red have errors in the app. Fix them before bending.", tw, 3, { fill: PC.bad });
    const x2 = PM + tw + 10, w2 = W - PM - x2;
    let y2 = TOP;
    p.text(x2, y2 + 4, "How to use this pack", 4, { weight: 700 }); y2 += 7;
    for (const s of [
      "1. Print at 100 % (\"actual size\", not \"fit to page\"). Measure the 50 mm bar at the bottom of any page.",
      "2. Page 2 once: bend a scrap piece and enter what you read in the app. Then print again.",
      "3. Bent parts, one or two pages each: cut, mark, bend, check on the drawing, trim.",
      "4. Straight pieces: lay the rod on its bar, mark, cut, file to fit.",
      "5. Assembly sheets: full-size views to hold the parts while you join them.",
    ]) y2 = para(p, x2, y2, s, w2, 3.1) + 1.4;
    y2 += 3;
    p.text(x2, y2 + 4, "Printed with", 4, { weight: 700 }); y2 += 7;
    y2 = para(p, x2, y2, settingsLine(st).split(" · ").join("\n"), w2, 3.1);
    if (opts.date) para(p, x2, y2 + 1, `Printed ${opts.date}. If you change your rod, bender or the design, print a new pack.`, w2, 2.8, { fill: PC.soft });
    return { head: { title: "Print pack", sub: `${index.length} parts · ${paper.label} landscape` }, body: p.str() };
  }

  /** A standalone HTML file with every page, ready to print. */
  function printPackHTML(pack, title) {
    const { w, h, label } = pack.paper;
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><style>
@page { size: ${f2(w)}mm ${f2(h)}mm; margin: 0; }
html, body { margin: 0; background: #7d848a; }
.bar { font: 15px Arial, Helvetica, sans-serif; color: #fff; text-align: center; padding: 12px 16px; }
.pp-page { width: ${f2(w)}mm; height: ${f2(h - 1)}mm; overflow: hidden; margin: 0 auto 8mm; background: #fff; box-shadow: 0 1px 8px rgba(0,0,0,.35); }
.pp-page svg { display: block; }
@media print {
  html, body { background: #fff; }
  .bar { display: none; }
  .pp-page { margin: 0; box-shadow: none; break-after: page; }
  .pp-page:last-child { break-after: auto; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style></head><body><div class="bar">Print on ${esc(label)}, landscape, at 100 % (actual size). Then check the 50 mm bar with a ruler.</div>
${pack.pages.map((pg) => `<div class="pp-page">${pg.svg}</div>`).join("\n")}
</body></html>`;
  }

  function bendSheetText(t, r, st, designName) {
    const lines = [`${t.name} (${designName})`,
      `Ø${num(st.stock.od)} mm ${MATERIALS[st.stock.material]?.label}, CLR ${num(st.bender.clr)} mm, springback ${num(st.bender.calTarget)}°→${num(st.bender.calActual)}°`,
      `Cut ${fmt(r.cut)} mm (incl. ${fmt(num(st.bender.trim), 0)} mm extra each end), make ${t.mirror ? "2 (mirrored pair)" : "1"}`, "",
      "Bend\tLine on 0\tCentre mark\tAngle\tBend to\tRotate first"];
    for (const b of r.bends) lines.push(`B${b.no}\t${fmt(b.mark)}\t${fmt(b.center)}\t${fmt(b.angle)}°\t${fmt(b.bendTo)}°\t${rotLabel(b.rot)}`);
    if (r.errors.length || r.warnings.length) { lines.push(""); r.errors.concat(r.warnings).forEach((m) => lines.push("! " + m)); }
    return lines.join("\n");
  }

  /** Angle between two lines with directions u and v (need not be unit length, direction sign is ignored).
   * acute is 0 to 90, obtuse = 180 - acute. parallel when under 0.05 degrees apart.
   * directed is the angle between u and v themselves (0 to 180), so it depends on which way each points.
   * Zero-length input gives null. */
  function lineAngle(u, v) {
    const a = V.norm(u), b = V.norm(v);
    if (!V.len(a) || !V.len(b)) return null;
    const d = V.dot(a, b);
    const acute = Math.acos(Math.min(1, Math.abs(d))) * R2D;
    return { acute, obtuse: 180 - acute, parallel: acute < 0.05, directed: Math.acos(Math.max(-1, Math.min(1, d))) * R2D };
  }

  /** Shortest distance (mm) between the infinite lines p0 + s*u and q0 + t*v. Parallel lines give the distance between them. */
  function lineGap(p0, u, q0, v) {
    const a = V.norm(u), b = V.norm(v), w = V.sub(q0, p0), n = V.cross(a, b), nl = V.len(n);
    if (nl < 1e-6) return V.len(V.cross(w, a));
    return Math.abs(V.dot(w, n)) / nl;
  }

  /** Where the infinite lines p0 + s*u and q0 + t*v pass closest. Returns { s, t, pa, pb } (pa on the first line, pb on
   * the second; equal when the lines cross), or null when they are parallel. s and t are in units of u and v. */
  function closestPoints(p0, u, q0, v) {
    const w = V.sub(p0, q0), a = V.dot(u, u), b = V.dot(u, v), c = V.dot(v, v), d = V.dot(u, w), e = V.dot(v, w);
    const den = a * c - b * b;
    if (!(a > 0) || !(c > 0) || den < 1e-9 * a * c) return null;
    const s = (b * e - c * d) / den, t = (a * e - b * d) / den;
    return { s, t, pa: V.add(p0, V.mul(u, s)), pb: V.add(q0, V.mul(v, t)) };
  }

  /** Angle between the lines through segments a0-a1 and b0-b1, in 3D (not as seen in a flat view).
   * skew: the lines never meet (closest approach over 0.5 mm). gap: that closest approach in mm.
   * pa, pb: closest points on the two lines (null when parallel). onA, onB: that point lies on the segment itself (0.5 mm slack). */
  function segmentAngle(a0, a1, b0, b1) {
    const u = V.sub(a1, a0), v = V.sub(b1, b0), ang = lineAngle(u, v);
    if (!ang) return null;
    const gap = lineGap(a0, u, b0, v), cp = ang.parallel ? null : closestPoints(a0, u, b0, v);
    const within = (t, len) => t * len >= -0.5 && t * len <= len + 0.5;
    return { ...ang, gap, skew: !ang.parallel && gap > 0.5, pa: cp && cp.pa, pb: cp && cp.pb,
      onA: cp ? within(cp.s, V.len(u)) : false, onB: cp ? within(cp.t, V.len(v)) : false };
  }

  /** Layout for the angle sketch, in screen angles (radians, y down, like canvas arc()).
   * aDir2 and bDir2 are the two segments' forward directions as seen on screen; directed is their true 3D angle in degrees.
   * Ray A points the way segment A does on screen. Ray B is turned from it by the true angle, to the same side as on screen.
   * Returns { a, b, wedges }: the four wedges between the rays (A, B and their opposites), each { from, to, deg, acute },
   * going clockwise on screen from "from" to "to". acute is true for the wedges under 90 degrees. */
  function angleWedges(aDir2, bDir2, directed) {
    const la = Math.hypot(aDir2[0], aDir2[1]), lb = Math.hypot(bDir2[0], bDir2[1]);
    const a = la > 1e-6 ? Math.atan2(aDir2[1], aDir2[0]) : 0;
    const cross = la > 1e-6 && lb > 1e-6 ? (aDir2[0] * bDir2[1] - aDir2[1] * bDir2[0]) / (la * lb) : 0;
    const b = a + (cross < -1e-3 ? -1 : 1) * num(directed) * D2R;
    const TAU = 2 * Math.PI, norm = (x) => ((x % TAU) + TAU) % TAU;
    const rays = [a, b, a + Math.PI, b + Math.PI].map(norm).sort((x, y) => x - y);
    const wedges = rays.map((from, i) => {
      const to = i + 1 < rays.length ? rays[i + 1] : rays[0] + TAU;
      const deg = (to - from) * R2D;
      return { from, to, deg, acute: deg < 90 - 1e-6 };
    });
    return { a, b, wedges };
  }


  /* ---------- strength check ----------
   * The cage as a 3D frame. Every tube copy becomes a chain of straight beam elements (a bend is cut into pieces of
   * 30° or less), tubes that touch are joined, and mount corners are held. Linear statics, small deflections, rigid
   * brazed joints, steady loads standing in for impacts. Units: mm, N, N/mm² (= MPa).
   * Good for ranking weak spots and comparing designs; the absolute figures rest on guessed loads and typical material
   * values. */

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const G_ACC = 9.81;

  /** Area, second moment, polar moment and outer radius of the rod or tube. */
  function sectionOf(stock) {
    const od = Math.max(0.1, num(stock.od, 3)), wall = num(stock.wall);
    const id = wall > 0 && wall * 2 < od ? od - 2 * wall : 0;
    const I = Math.PI / 64 * (od ** 4 - id ** 4);
    return { od, A: Math.PI / 4 * (od ** 2 - id ** 2), I, J: 2 * I, c: od / 2 };
  }
  /** Stiffness and yield (N/mm²): the design's own figures if set, else the material's typical ones. */
  function materialOf(stock) {
    const m = MATERIALS[stock.material] || MATERIALS.steel;
    const E = num(stock.E) > 0 ? num(stock.E) : m.E, fy = num(stock.fy) > 0 ? num(stock.fy) : m.fy;
    return { E: E * 1000, G: E * 1000 / 2.6, fy, typicalE: !(num(stock.E) > 0), typicalFy: !(num(stock.fy) > 0) };
  }

  /** Closest points between segments p0p1 and q0q1 (Ericson, Real-Time Collision Detection 5.1.9). */
  function segClosest(p0, p1, q0, q1) {
    const d1 = V.sub(p1, p0), d2 = V.sub(q1, q0), r = V.sub(p0, q0);
    const a = V.dot(d1, d1), e = V.dot(d2, d2), f = V.dot(d2, r);
    let s = 0, t = 0;
    if (a < 1e-12 && e >= 1e-12) t = clamp01(f / e);
    else if (a >= 1e-12) {
      const c = V.dot(d1, r);
      if (e < 1e-12) s = clamp01(-c / a);
      else {
        const b = V.dot(d1, d2), den = a * e - b * b;
        s = den > 1e-12 ? clamp01((b * f - c * e) / den) : 0;
        t = (b * s + f) / e;
        if (t < 0) { t = 0; s = clamp01(-c / a); } else if (t > 1) { t = 1; s = clamp01((b - c) / a); }
      }
    }
    const pa = V.add(p0, V.mul(d1, s)), pb = V.add(q0, V.mul(d2, t));
    return { s, t, pa, pb, d: V.len(V.sub(pa, pb)) };
  }

  /**
   * Build the frame from the design.
   * Joints: a tube end within 1.5 × OD of another tube's bent centreline, a tube end placed on another tube's corner
   * point (a bend cuts that corner off), or two tubes crossing within 1.05 × OD. A joint part-way along a tube splits
   * it there. Points within 0.5 mm are merged; ends further apart are bridged by a short link 10× stiffer than the
   * rod (the braze fillet).
   * Mounts: corners within OD/2 + 3 mm of a keep-out marked `mount`, changed by the tube's `mounts` overrides.
   * Returns { nodes, elems, copies, mounts, corners, cornerNodes, floating, held, od }.
   */
  function frameModel(st, results) {
    const od = Math.max(0.1, num(st.stock.od, 3));
    const get = (id) => (results.get ? results.get(id) : results[id]);
    const copies = [];
    for (const t of st.tubes) {
      const r = get(t.id); if (!r || !r.frame || r.frame.length < 2) continue;
      for (const mir of t.mirror ? [false, true] : [false]) copies.push({
        tube: t, mir, name: t.name + (t.mirror ? (mir ? " (R)" : " (L)") : ""),
        pts: r.frame.map((f) => ({ p: mir ? mirrorPt(f.p) : f.p.slice(), corner: f.corner, bend: f.bend })),
        P: r.P.map((q) => (mir ? mirrorPt(q) : q)), splits: [],
      });
    }
    // joint candidates
    const cands = [];
    const side = (ci, i, s, p) => ({ c: ci, i, s, p });
    for (let x = 0; x < copies.length; x++) for (let y = x + 1; y < copies.length; y++) {
      const X = copies[x], Y = copies[y], nx = X.pts.length, ny = Y.pts.length;
      for (let i = 0; i + 1 < nx; i++) for (let j = 0; j + 1 < ny; j++) {
        const c = segClosest(X.pts[i].p, X.pts[i + 1].p, Y.pts[j].p, Y.pts[j + 1].p);
        const endX = (i === 0 && c.s < 1e-6) || (i + 2 === nx && c.s > 1 - 1e-6);
        const endY = (j === 0 && c.t < 1e-6) || (j + 2 === ny && c.t > 1 - 1e-6);
        if (c.d <= (endX || endY ? 1.5 : 1.05) * od) cands.push({ a: side(x, i, c.s, c.pa), b: side(y, j, c.t, c.pb), d: c.d });
      }
      for (const [A, B, ia, ib] of [[X, Y, x, y], [Y, X, y, x]]) for (const ei of [0, A.pts.length - 1]) {
        const e = A.pts[ei].p;
        B.P.forEach((v, ci) => {
          if (V.len(V.sub(e, v)) > 0.5) return;
          const k = B.pts.findIndex((q) => q.corner === ci); if (k < 0) return;
          const sa = side(ia, ei ? ei - 1 : 0, ei ? 1 : 0, e), sb = side(ib, k ? k - 1 : 0, k ? 1 : 0, B.pts[k].p);
          const d = V.len(V.sub(e, B.pts[k].p));
          cands.push(ia === x ? { a: sa, b: sb, d } : { a: sb, b: sa, d });
        });
      }
    }
    cands.sort((u, v) => u.d - v.d);
    const joints = [];
    for (const c of cands) {
      if (joints.some((o) => o.a.c === c.a.c && o.b.c === c.b.c && V.len(V.sub(o.a.p, c.a.p)) < 3 * od && V.len(V.sub(o.b.p, c.b.p)) < 3 * od)) continue;
      joints.push(c);
      copies[c.a.c].splits.push(c.a); copies[c.b.c].splits.push(c.b);
    }
    // nodes along each copy, splitting segments at joints
    const nodes = [];
    copies.forEach((C, ci) => {
      C.seq = []; C.seqBend = [];
      const add = (p, corner, bend) => { const id = nodes.push({ p, copies: [ci], corner: corner >= 0 }) - 1; C.seq.push(id); C.seqBend.push(bend); return id; };
      C.pts.forEach((q, i) => {
        q.node = add(q.p, q.corner, q.bend);
        if (i + 1 >= C.pts.length) return;
        const L = V.len(V.sub(C.pts[i + 1].p, q.p));
        const here = C.splits.filter((r) => r.i === i).sort((u, v) => u.s - v.s);
        let last = null;
        for (const r of here) { // within 0.5 mm of an existing node: use it (a sliver element would wreck the solve)
          if (r.s * L < 0.5) { r.node = q.node; continue; }
          if ((1 - r.s) * L < 0.5) { r.next = true; continue; }
          if (last && (r.s - last.s) * L < 0.5) { r.node = last.node; continue; }
          const onArc = q.bend && C.pts[i + 1].bend === q.bend;
          r.node = add(r.p, -1, onArc ? q.bend : 0); last = r;
        }
      });
      for (const r of C.splits) if (r.next) r.node = C.pts[r.i + 1].node;
    });
    // merge joints that meet exactly, link the ones that nearly do
    const parent = nodes.map((_, i) => i);
    const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    const links = [];
    for (const j of joints) {
      const a = find(j.a.node), b = find(j.b.node);
      if (a === b) continue;
      // ends within 0.5 mm are the same point (rounding in typed coordinates); a link that short would make the solve ill-conditioned
      if (V.len(V.sub(nodes[a].p, nodes[b].p)) <= 0.5) parent[b] = a; else links.push([j.a.node, j.b.node]);
    }
    const remap = new Map(), out = [];
    nodes.forEach((nd, i) => {
      const r = find(i);
      if (!remap.has(r)) { remap.set(r, out.length); out.push({ p: nodes[r].p, copies: [], corner: false }); }
      const o = out[remap.get(r)];
      if (nd.corner) o.corner = true; // a tube end, corner or the middle of a bend: a natural place to brace to
      for (const c of nd.copies) if (!o.copies.includes(c)) o.copies.push(c);
    });
    const id = (i) => remap.get(find(i));
    // elements along each copy; one on a bend's arc (both ends on the same arc) carries that bend's number
    const elems = [];
    copies.forEach((C, ci) => {
      const seq = C.seq.map(id);
      for (let k = 1; k < seq.length; k++) {
        if (seq[k] === seq[k - 1]) continue;
        elems.push({ a: seq[k - 1], b: seq[k], copy: ci, kind: "tube", bend: C.seqBend[k] === C.seqBend[k - 1] ? C.seqBend[k] : 0 });
      }
      C.seq = seq.filter((v, k) => k === 0 || v !== seq[k - 1]);
    });
    for (const [u, v] of links) { const a = id(u), b = id(v); if (a !== b) elems.push({ a, b, copy: -1, kind: "link", bend: 0 }); }
    for (const e of elems) e.L = V.len(V.sub(out[e.b].p, out[e.a].p));
    const live = elems.filter((e) => e.L > 1e-6);
    // mounts
    const mountKos = st.keepouts.filter((k) => k.mount);
    const corners = {}; // tubeId -> { corner: { on, auto } } from the first copy
    const cornerNodes = []; // every tube corner (both copies) and the node it sits at: what the Mounts tool clicks
    const mountSet = new Set();
    copies.forEach((C) => {
      const ov = C.tube.mounts || {};
      C.pts.forEach((q) => {
        if (q.corner < 0) return;
        const p = out[id(q.node)].p;
        const auto = mountKos.some((ko) => sdf(ko, p) - od / 2 <= 3);
        const on = typeof ov[q.corner] === "boolean" ? ov[q.corner] : auto;
        if (!C.mir) (corners[C.tube.id] ||= {})[q.corner] = { on, auto };
        cornerNodes.push({ tubeId: C.tube.id, mir: C.mir, corner: q.corner, node: id(q.node) });
        if (on) mountSet.add(id(q.node));
      });
    });
    const mounts = [...mountSet];
    // what the mounts hold up
    const adj = out.map(() => []);
    for (const e of live) { adj[e.a].push(e.b); adj[e.b].push(e.a); }
    const held = new Uint8Array(out.length), q = [...mounts];
    for (const m of mounts) held[m] = 1;
    while (q.length) { const v = q.pop(); for (const w of adj[v]) if (!held[w]) { held[w] = 1; q.push(w); } }
    for (const e of live) e.held = !!held[e.a];
    const floating = copies.filter((C) => !C.seq.some((v) => held[v])).map((C) => C.name);
    return {
      od, nodes: out, elems: live, mounts, corners, cornerNodes, floating, held,
      copies: copies.map((C) => ({ name: C.name, tubeId: C.tube.id, mir: C.mir, seq: C.seq })),
    };
  }

  /** Reverse Cuthill–McKee node order: keeps the stiffness matrix narrow so the skyline solve stays fast. */
  function rcmOrder(adj, use) {
    const n = adj.length, deg = adj.map((a) => a.length), seen = new Uint8Array(n), order = [];
    const starts = [...Array(n).keys()].filter((i) => use[i]).sort((a, b) => deg[a] - deg[b]);
    for (const s0 of starts) {
      if (seen[s0]) continue;
      seen[s0] = 1; const q = [s0];
      for (let h = 0; h < q.length; h++) {
        order.push(q[h]);
        for (const w of adj[q[h]].slice().sort((a, b) => deg[a] - deg[b])) if (!seen[w]) { seen[w] = 1; q.push(w); }
      }
    }
    return order.reverse();
  }

  /** 3D beam element: local 12×12 stiffness (u v w θx θy θz at each end) and its rotation (rows = local axes). */
  function beamK(pa, pb, A, I, J, E, G) {
    const d = V.sub(pb, pa), L = V.len(d), ex = V.mul(d, 1 / L);
    const ref = Math.abs(ex[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const ey = V.norm(V.cross(ref, ex)), ez = V.cross(ex, ey);
    const k = Array.from({ length: 12 }, () => new Float64Array(12));
    const set = (i, j, v) => { k[i][j] = v; k[j][i] = v; };
    const a = E * A / L, t = G * J / L, b12 = 12 * E * I / L ** 3, b6 = 6 * E * I / L ** 2, b4 = 4 * E * I / L, b2 = 2 * E * I / L;
    set(0, 0, a); set(6, 6, a); set(0, 6, -a);
    set(3, 3, t); set(9, 9, t); set(3, 9, -t);
    set(1, 1, b12); set(7, 7, b12); set(1, 7, -b12); set(1, 5, b6); set(1, 11, b6); set(5, 7, -b6); set(7, 11, -b6);
    set(5, 5, b4); set(11, 11, b4); set(5, 11, b2);
    set(2, 2, b12); set(8, 8, b12); set(2, 8, -b12); set(2, 4, -b6); set(2, 10, -b6); set(4, 8, b6); set(8, 10, b6);
    set(4, 4, b4); set(10, 10, b4); set(4, 10, b2);
    return { k, R: [ex, ey, ez], L };
  }
  // global = local rotated: g = Tᵀ l, l = T g, T = diag(R, R, R, R)
  const toLocal = (R, g) => { const l = new Float64Array(12); for (let b = 0; b < 12; b += 3) for (let i = 0; i < 3; i++) l[b + i] = R[i][0] * g[b] + R[i][1] * g[b + 1] + R[i][2] * g[b + 2]; return l; };
  const toGlobal = (R, l) => { const g = new Float64Array(12); for (let b = 0; b < 12; b += 3) for (let i = 0; i < 3; i++) g[b + i] = R[0][i] * l[b] + R[1][i] * l[b + 1] + R[2][i] * l[b + 2]; return g; };

  /**
   * Linear static solve of the frame for each load case. `cases[i].loads` = [{ node, f: [fx, fy, fz] }].
   * fix = 3 (pinned mounts: position held) or 6 (clamped: position and angle held).
   * Returns { cases: [{ u: [[dx,dy,dz]…] per node, forces: [{ N, T, M: [Ma, Mb], Mv: [[My, Mz] at a, at b] }] per element, stable }], folds }.
   * N is tension-positive. A tiny spring on every rotation (a millionth of a 100 mm rod's) keeps harmless spins (a pinned
   * bar turning about its own axis) from stopping the solve; a case whose loads end up on those springs is unstable.
   */
  function solveFrame(model, sec, mat, cases, fix = 3) {
    const nodes = model.nodes, n = nodes.length, elems = model.elems.filter((e) => e.held !== false);
    const adj = nodes.map(() => []), use = new Uint8Array(n);
    for (const e of elems) { adj[e.a].push(e.b); adj[e.b].push(e.a); use[e.a] = use[e.b] = 1; }
    const isMount = new Uint8Array(n); for (const m of model.mounts) isMount[m] = 1;
    const eq = new Int32Array(6 * n).fill(-1); let neq = 0;
    for (const v of rcmOrder(adj, use)) for (let k = 0; k < 6; k++) if (!(isMount[v] && k < fix)) eq[6 * v + k] = neq++;
    const dofs = (e) => { const d = []; for (let k = 0; k < 6; k++) d.push(eq[6 * e.a + k]); for (let k = 0; k < 6; k++) d.push(eq[6 * e.b + k]); return d; };
    const first = new Int32Array(neq); for (let j = 0; j < neq; j++) first[j] = j;
    const el = elems.map((e) => {
      const s = e.kind === "link" ? 10 : 1;
      const b = beamK(nodes[e.a].p, nodes[e.b].p, sec.A * s, sec.I * s, sec.J * s, mat.E, mat.G);
      const d = dofs(e), lo = Math.min(...d.filter((x) => x >= 0));
      for (const x of d) if (x >= 0 && lo < first[x]) first[x] = lo;
      return { e, ...b, d };
    });
    const ptr = new Int32Array(neq + 1);
    for (let j = 0; j < neq; j++) ptr[j + 1] = ptr[j] + j - first[j] + 1;
    const K = new Float64Array(ptr[neq]);
    const at = (i, j) => ptr[j] + i - first[j];
    for (const x of el) {
      // Kg = Tᵀ k T, 3×3 block by block: Kg_IJ = Rᵀ k_IJ R
      const R = x.R;
      for (let bi = 0; bi < 12; bi += 3) for (let bj = 0; bj < 12; bj += 3) for (let q = 0; q < 3; q++) for (let s2 = 0; s2 < 3; s2++) {
        const I = x.d[bi + q], Jc = x.d[bj + s2];
        if (I < 0 || Jc < 0 || I > Jc) continue;
        let v = 0;
        for (let p2 = 0; p2 < 3; p2++) { const r = R[p2][q]; if (r) for (let t = 0; t < 3; t++) v += r * x.k[bi + p2][bj + t] * R[t][s2]; }
        K[at(I, Jc)] += v;
      }
    }
    let maxDiag = 0; for (let j = 0; j < neq; j++) maxDiag = Math.max(maxDiag, K[at(j, j)]);
    const reg = 1e-6 * mat.E * sec.I / 100; // a millionth of a 100 mm rod's bending stiffness: holds spins, carries ~nothing
    for (let v = 0; v < n; v++) for (let k = 3; k < 6; k++) { const j = eq[6 * v + k]; if (j >= 0) K[at(j, j)] += reg; }
    // LDLᵀ in place: column j holds U_ij (i < j) and d_j on the diagonal
    const folds = [];
    for (let j = 0; j < neq; j++) {
      const fj = first[j];
      for (let i = fj + 1; i < j; i++) {
        const m = Math.max(first[i], fj); let s = 0;
        for (let k = m; k < i; k++) s += K[at(k, i)] * K[at(k, j)];
        K[at(i, j)] -= s;
      }
      let dj = K[at(j, j)];
      for (let i = fj; i < j; i++) { const g = K[at(i, j)], u = g / K[at(i, i)]; K[at(i, j)] = u; dj -= u * g; }
      if (!(dj > 1e-13 * maxDiag)) { folds.push(Math.floor(eq.indexOf(j) / 6)); dj = maxDiag || 1; }
      K[at(j, j)] = dj;
    }
    const solve = (b) => {
      const x = Float64Array.from(b);
      for (let j = 0; j < neq; j++) { let s = 0; for (let i = first[j]; i < j; i++) s += K[at(i, j)] * x[i]; x[j] -= s; }
      for (let j = 0; j < neq; j++) x[j] /= K[at(j, j)];
      for (let j = neq - 1; j >= 0; j--) { const xj = x[j]; for (let i = first[j]; i < j; i++) x[i] -= K[at(i, j)] * xj; }
      return x;
    };
    const out = cases.map((cs) => {
      const b = new Float64Array(neq), F = [0, 0, 0];
      for (const ld of cs.loads) for (let k = 0; k < 3; k++) { const j = eq[6 * ld.node + k]; if (j >= 0) b[j] += ld.f[k]; F[k] += ld.f[k]; }
      const x = solve(b);
      const U = (v, k) => { const j = eq[6 * v + k]; return j >= 0 ? x[j] : 0; };
      const u = nodes.map((_, v) => [U(v, 0), U(v, 1), U(v, 2)]);
      const rot = nodes.map((_, v) => [U(v, 3), U(v, 4), U(v, 5)]);
      const R = [0, 0, 0], RM = [0, 0, 0]; // reaction force, and its moment about the origin
      const addR = (v, fg, o) => { const f = [fg[o], fg[o + 1], fg[o + 2]], mxyz = V.cross(nodes[v].p, f); for (let k = 0; k < 3; k++) { R[k] += f[k]; RM[k] += mxyz[k] + fg[o + 3 + k]; } };
      const forces = el.map((X) => {
        const g = new Float64Array(12);
        for (let k = 0; k < 6; k++) { g[k] = U(X.e.a, k); g[6 + k] = U(X.e.b, k); }
        const l = toLocal(X.R, g), f = new Float64Array(12);
        for (let i = 0; i < 12; i++) { let s = 0; for (let j = 0; j < 12; j++) s += X.k[i][j] * l[j]; f[i] = s; }
        const fg = toGlobal(X.R, f);
        for (const [v, o] of [[X.e.a, 0], [X.e.b, 6]]) if (isMount[v]) addR(v, fg, o);
        // Mv: bending moment inside the element at end a and end b (local y, z). With no load along an element it
        // changes in a straight line between them, so the stress at any point along it can be found.
        return { N: f[6], T: Math.max(Math.abs(f[3]), Math.abs(f[9])), M: [Math.hypot(f[4], f[5]), Math.hypot(f[10], f[11])], Mv: [[-f[4], -f[5]], [f[10], f[11]]] };
      });
      // reaction = element end forces at the mounts minus the loads applied there; it must balance the loads
      // (forces and moments: anything the rotation springs carried instead shows up as a miss)
      const LM = [0, 0, 0];
      for (const ld of cs.loads) {
        const mxyz = V.cross(nodes[ld.node].p, ld.f);
        for (let k = 0; k < 3; k++) { LM[k] += mxyz[k]; if (isMount[ld.node]) { R[k] -= ld.f[k]; RM[k] -= mxyz[k]; } }
      }
      const size = Math.max(1, ...nodes.map((nd) => V.len(nd.p)));
      const Fm = Math.hypot(...F), miss = Math.hypot(R[0] + F[0], R[1] + F[1], R[2] + F[2]), missM = Math.hypot(RM[0] + LM[0], RM[1] + LM[1], RM[2] + LM[2]);
      return { u, rot, forces, reaction: R, miss: [miss / (Fm || 1), missM / ((Fm || 1) * size)], stable: !(Fm > 0) || (miss <= 1e-3 * Fm && missM <= 1e-3 * Fm * size) };
    });
    return { cases: out, elems, folds, neq };
  }

  /** The crash loads: car weight × 9.81 × factor, shared equally by the frame's outermost free nodes in that direction. */
  const LOAD_CASES = [
    { id: "roof", label: "Roof landing", factor: "roof", dir: [0, 0, -1] },
    { id: "left", label: "Side roll, left", factor: "side", dir: [0, -1, 0] },
    { id: "right", label: "Side roll, right", factor: "side", dir: [0, 1, 0] },
    { id: "nose", label: "Nose hit", factor: "nose", dir: [-1, 0, 0] },
    { id: "rear", label: "Rear hit", factor: "rear", dir: [1, 0, 0] },
  ];
  const STRENGTH_DEFAULTS = { weight: 1000, fix: "pinned", factors: { roof: 3, side: 3, nose: 3, rear: 3 } };
  function loadCases(model, strength) {
    const sg = { ...STRENGTH_DEFAULTS, ...(strength || {}), factors: { ...STRENGTH_DEFAULTS.factors, ...((strength || {}).factors || {}) } };
    const isMount = new Set(model.mounts);
    const free = model.nodes.map((nd, i) => i).filter((i) => model.held[i] && !isMount.has(i));
    const zs = free.map((i) => model.nodes[i].p[2]);
    const zmid = (Math.min(...zs) + Math.max(...zs)) / 2;
    return LOAD_CASES.map((lc) => {
      const total = num(sg.weight) / 1000 * G_ACC * Math.max(0, num(sg.factors[lc.factor]));
      const k = lc.dir.findIndex((c) => c !== 0), sgn = lc.dir[k];
      const pool = lc.factor === "side" ? free.filter((i) => model.nodes[i].p[2] >= zmid) : free;
      // the face that meets the ground first: largest coordinate opposite to the push
      const key = (i) => -sgn * model.nodes[i].p[k];
      const top = Math.max(...pool.map(key));
      const pick = pool.filter((i) => key(i) >= top - 5);
      const each = pick.length ? total / pick.length : 0;
      return { ...lc, total, nodes: pick, loads: pick.map((node) => ({ node, f: lc.dir.map((c) => c * each) })) };
    });
  }

  /**
   * Utilisation per element and case: von Mises stress (axial + bending, torsion) / yield, and for straight pieces
   * in compression, the load / Euler buckling load (pinned ends, length between joints or bends).
   * Returns { worst, elems: [{ u: [..per case], b: [..], util, buck, worstCase, bendShare }], spots: [...] }.
   */
  function strengthReport(model, sol, sec, mat, cases) {
    const Z = sec.I / sec.c, Pcr = (L) => Math.PI ** 2 * mat.E * sec.I / (L * L);
    const elems = sol.elems.map((e, ei) => {
      const u = [], b = [], share = [];
      sol.cases.forEach((cs) => {
        const f = cs.forces[ei], ax = Math.abs(f.N) / sec.A, bend = Math.max(...f.M) / Z, tau = f.T * sec.c / sec.J;
        const vm = Math.hypot(ax + bend, Math.sqrt(3) * tau);
        u.push(e.kind === "link" ? 0 : vm / mat.fy);
        b.push(e.kind === "tube" && !e.bend && f.N < 0 ? -f.N / Pcr(e.L) : 0);
        share.push(ax + bend > 0 ? bend / (ax + bend) : 0);
      });
      const score = u.map((x, i) => Math.max(x, b[i]));
      const wc = score.indexOf(Math.max(...score));
      return { e, u, b, util: Math.max(...u), buck: Math.max(...b), score: score[wc], worstCase: wc, bendShare: share[wc] };
    });
    const worst = Math.max(0, ...elems.map((x) => x.score));
    // hot spots: the most loaded elements, one per tube copy and place
    const names = model.copies.map((c) => c.name);
    const placeOf = (x) => {
      const e = x.e, at = [e.a, e.b].map((v) => model.nodes[v]);
      for (const nd of at) if (nd.copies.length > 1) return `at the joint with ${nd.copies.filter((c) => c !== e.copy).map((c) => names[c]).join(" and ")}`;
      for (const v of [e.a, e.b]) if (model.mounts.includes(v)) return "at the mount";
      return e.bend ? `at bend ${e.bend}` : "along the straight";
    };
    const spots = [], seen = new Set();
    for (const x of elems.slice().sort((p, q) => q.score - p.score)) {
      if (x.score <= 0 || x.e.kind !== "tube") continue;
      const place = placeOf(x), key = x.e.copy + place;
      if (seen.has(key)) continue; seen.add(key);
      spots.push({ elem: elems.indexOf(x), copy: x.e.copy, tube: names[x.e.copy], tubeId: model.copies[x.e.copy].tubeId, place, score: x.score, buckling: x.buck >= x.util, caseIdx: x.worstCase, caseLabel: cases[x.worstCase].label, p: V.mul(V.add(model.nodes[x.e.a].p, model.nodes[x.e.b].p), 0.5) });
      if (spots.length >= 8) break;
    }
    return { worst, elems, spots };
  }

  /** Everything at once: model, loads, solve, report; plus brace suggestions when opts.suggest (slower). */
  function strengthCheck(st, results, opts = {}) {
    const model = frameModel(st, results);
    const sec = sectionOf(st.stock), mat = materialOf(st.stock);
    const sg = { ...STRENGTH_DEFAULTS, ...(st.strength || {}) };
    const warnings = [];
    if (!model.mounts.length) {
      // nothing is fixed to the car yet: offer the lowest corners (within 2 mm of the lowest), the usual feet
      const zs = model.cornerNodes.map((c) => model.nodes[c.node].p[2]), z0 = Math.min(...zs);
      const low = model.cornerNodes.filter((c) => model.nodes[c.node].p[2] <= z0 + 2);
      const mk = st.keepouts.filter((k) => k.mount);
      const gap = low.length && mk.length ? Math.min(...low.map((c) => Math.min(...mk.map((k) => sdf(k, model.nodes[c.node].p) - model.od / 2)))) : null;
      warnings.push(`No mounts yet, so nothing can be worked out. Mounts start on corners within 3 mm of a keep-out marked as a mount surface${mk.length ? ` (${mk.map((k) => k.name).join(", ")})` : ""}${gap !== null ? `; your lowest corners are ${fmt(gap)} mm from it` : ""}. Mount the lowest corners with the button below, or click corners with the Mounts tool.`);
      return { model, sec, mat, cases: [], sol: null, report: { worst: 0, elems: [], spots: [] }, warnings, suggestions: [], lowCorners: low };
    }
    if (model.floating.length) warnings.push(`Carries no load: ${model.floating.join(", ")}. Nothing connects these to a mount, through other tubes or directly. Move an end onto a tube that is connected, or mount one of their corners.`);
    const cases = loadCases(model, sg).filter((c) => c.loads.length);
    const sol = solveFrame(model, sec, mat, cases, sg.fix === "clamped" ? 6 : 3);
    const report = strengthReport(model, sol, sec, mat, cases);
    sol.cases.forEach((c, i) => { if (!c.stable) warnings.push(`${cases[i].label}: the cage is not held firmly enough to carry this load. Add mounts, or set mounts to clamped.`); });
    if (sol.folds.length) warnings.push(`The frame can fold near ${[...new Set(sol.folds)].slice(0, 3).map((v) => model.nodes[v].copies.map((c) => model.copies[c].name).join("/")).join(", ")}.`);
    const out = { model, sec, mat, cases, sol, report, warnings, suggestions: null };
    if (opts.suggest && report.worst > 0) out.suggestions = braceSuggestions(st, results, out, opts);
    return out;
  }

  /**
   * Braces that would help, each checked by running the whole analysis again with it added (so this takes a few
   * hundred ms: call it on demand, not on every edit):
   * - diagonal between the joints that pull apart most, for their distance, in the case behind the worst spot
   * - corner bar about 12 mm out along both tubes at a joint that is mostly bending
   * - bar from the middle of a straight that buckles to the nearest joint of another tube
   * Returns [{ kind, a, b, mirror, reason, worstAfter, worstBefore }] best first, only ones that lower the worst spot.
   */
  function braceSuggestions(st, results, res, opts = {}) {
    const { model, report, sol } = res, nodes = model.nodes, od = model.od;
    const deg = nodes.map(() => 0);
    for (const e of sol.elems) { deg[e.a]++; deg[e.b]++; }
    // a link (ends that nearly meet) counts as one joint: both its ends map to one representative node
    const repOf = nodes.map((_, i) => i);
    for (const e of sol.elems) if (e.kind === "link") { const r = Math.min(repOf[e.a], repOf[e.b]); repOf[e.a] = repOf[e.b] = r; }
    const isKey = (v) => deg[v] !== 2 || nodes[v].copies.length > 1 || model.mounts.includes(v) || repOf[v] !== v || sol.elems.some((e) => e.kind === "link" && (e.a === v || e.b === v));
    // joint graph: key nodes joined by chains of ordinary nodes along the tubes
    const nb = new Map(); // key -> Map(key -> [elem indices])
    const elemAt = nodes.map(() => []); sol.elems.forEach((e, i) => { if (e.kind === "tube") { elemAt[e.a].push(i); elemAt[e.b].push(i); } });
    for (let v = 0; v < nodes.length; v++) {
      if (!isKey(v)) continue;
      for (const ei of elemAt[v]) {
        let cur = sol.elems[ei].a === v ? sol.elems[ei].b : sol.elems[ei].a, path = [ei], guard = 0;
        while (!isKey(cur) && guard++ < 500) {
          const nx = elemAt[cur].find((k) => !path.includes(k));
          if (nx === undefined) break;
          path.push(nx); cur = sol.elems[nx].a === cur ? sol.elems[nx].b : sol.elems[nx].a;
        }
        const a = repOf[v], b = repOf[cur];
        if (!isKey(cur) || a === b) continue;
        if (!nb.has(a)) nb.set(a, new Map());
        if (!nb.get(a).has(b)) nb.get(a).set(b, path);
        if (!nb.has(b)) nb.set(b, new Map());
        if (!nb.get(b).has(a)) nb.get(b).set(a, path);
      }
    }
    const cands = [];
    // 1. stretch braces: under the case behind the worst spot, the joints that move apart most for their distance.
    //    A bar between them is pulled (never pushed, so it can't buckle) and resists exactly that movement.
    const top = report.spots[0], u = sol.cases[top.caseIdx].u;
    const keys = [...new Set([...nb.keys(), ...nodes.map((nd, v) => (nd.corner && model.held[v] ? repOf[v] : -1)).filter((v) => v >= 0)])];
    const nearFrame = (p) => sol.elems.some((e) => e.kind === "tube" && segClosest(nodes[e.a].p, nodes[e.b].p, p, p).d < 2 * od);
    const clearOfCar = (pa, pb) => densify([pa, pb], 2).every((p) => st.keepouts.every((ko) => !ko.check || sdf(ko, p) - od / 2 >= num(st.margin)));
    const stretchy = [];
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      const a = keys[i], b = keys[j];
      if (nb.get(a)?.has(b)) continue;
      const d = V.sub(nodes[b].p, nodes[a].p), L = V.len(d);
      if (L < 15 || L > 160) continue;
      const strain = V.dot(V.sub(u[b], u[a]), d) / (L * L);
      if (strain > 0) stretchy.push({ a, b, strain });
    }
    stretchy.sort((p, q) => q.strain - p.strain);
    let taken = 0;
    for (const c of stretchy) {
      if (taken >= 4) break;
      const pa = nodes[c.a].p, pb = nodes[c.b].p;
      if ([0.25, 0.5, 0.75].some((f) => nearFrame(V.add(pa, V.mul(V.sub(pb, pa), f))))) continue; // runs along a tube already there
      if (!clearOfCar(pa, pb)) continue;
      taken++;
      const where = (v) => {
        const vs = [v, ...sol.elems.filter((e) => e.kind === "link" && (e.a === v || e.b === v)).map((e) => (e.a === v ? e.b : e.a))];
        const ns = [...new Set(vs.flatMap((w) => nodes[w].copies))].map((k) => model.copies[k].name);
        return ns.length > 1 ? `the ${ns.join(" / ")} joint` : `the ${ns[0]}${model.mounts.includes(v) ? " mount" : ""}`;
      };
      cands.push({ kind: "diagonal", a: pa, b: pb, reason: `From ${where(c.a)} to ${where(c.b)}: these pull apart in the ${res.cases[top.caseIdx].label.toLowerCase()}. The bar works in tension, so it can't buckle.` });
    }
    // 2. corner bars at bending joints; 3. buckling braces
    const walk = (copy, from, towards, dist) => { // point `dist` along the copy's chain from node `from`, heading to node `towards`
      const seq = model.copies[copy].seq, i0 = seq.indexOf(from), i1 = seq.indexOf(towards);
      if (i0 < 0 || i1 < 0) return null;
      const step = i1 > i0 ? 1 : -1; let left = dist, i = i0;
      while (i + step >= 0 && i + step < seq.length) {
        const p = nodes[seq[i]].p, q = nodes[seq[i + step]].p, L = V.len(V.sub(q, p));
        if (L >= left) return V.add(p, V.mul(V.sub(q, p), left / L));
        left -= L; i += step;
      }
      return null;
    };
    for (const s of report.spots.slice(0, 4)) {
      const x = report.elems[s.elem], e = x.e;
      if (s.buckling) {
        const m = V.mul(V.add(nodes[e.a].p, nodes[e.b].p), 0.5), dir = V.norm(V.sub(nodes[e.b].p, nodes[e.a].p));
        let best = null;
        nodes.forEach((nd, v) => {
          if (nd.copies.includes(e.copy) || !isKey(v)) return;
          const w = V.sub(nd.p, m), L = V.len(w);
          if (L < 3 * od || L > 80 || Math.abs(V.dot(w, dir)) / L > 0.7) return;
          if (!best || L < best.L) best = { L, p: nd.p };
        });
        if (best) cands.push({ kind: "buckling", a: m, b: best.p, reason: `${s.tube} can buckle ${s.place}: a bar from its middle halves the free length.` });
        continue;
      }
      if (x.bendShare < 0.75) continue;
      for (const v of [e.a, e.b]) {
        if (nodes[v].copies.length < 2) continue;
        const other = e.a === v ? e.b : e.a;
        const pa = walk(e.copy, v, other, 12); if (!pa) continue;
        const da = V.norm(V.sub(pa, nodes[v].p));
        let best = null;
        for (const oc of nodes[v].copies) {
          if (oc === e.copy) continue;
          const seq = model.copies[oc].seq, k = seq.indexOf(v);
          for (const nbk of [k - 1, k + 1]) {
            if (nbk < 0 || nbk >= seq.length) continue;
            const pb = walk(oc, v, seq[nbk], 12); if (!pb) continue;
            const ang = Math.acos(clamp01(V.dot(da, V.norm(V.sub(pb, nodes[v].p))))) * R2D;
            if (ang < 25 || ang > 155) continue;
            if (!best || ang < best.ang) best = { ang, pb, oc };
          }
        }
        if (best) cands.push({ kind: "gusset", a: pa, b: best.pb, reason: `${s.tube} bends hard ${s.place}: a short corner bar to ${model.copies[best.oc].name} spreads it.` });
      }
    }
    // mirrored pairs: a brace whose mirror image also lands on the frame is added as one mirrored tube
    const onFrame = (p) => nodes.some((nd) => V.len(V.sub(nd.p, p)) < 0.5) || model.elems.some((e) => segClosest(nodes[e.a].p, nodes[e.b].p, p, p).d < 0.5);
    const seenKey = new Set(), list = [];
    for (const c of cands) {
      const k = (p) => p.map((v) => Math.round(v)).join(",");
      const key = [k(c.a), k(c.b)].sort().join("|"), mkey = [k(mirrorPt(c.a)), k(mirrorPt(c.b))].sort().join("|");
      if (seenKey.has(key) || seenKey.has(mkey)) continue;
      seenKey.add(key);
      c.mirror = Math.abs(c.a[1]) > 1 && Math.abs(c.b[1]) > 1 && Math.sign(c.a[1]) === Math.sign(c.b[1]) && onFrame(mirrorPt(c.a)) && onFrame(mirrorPt(c.b));
      if (V.len(V.sub(c.a, c.b)) < 2 * od) continue;
      list.push(c);
    }
    // check each one for real
    const limit = opts.maxChecks ?? 6, out = [];
    for (const c of list.slice(0, limit)) {
      const t = { id: "__brace", name: "Brace", color: 0, mirror: c.mirror, pts: [c.a.map((v) => +v.toFixed(2)), c.b.map((v) => +v.toFixed(2))] };
      const r = computeTube(t, st);
      if (r.errors.length) continue; // hits the car
      const st2 = { ...st, tubes: [...st.tubes, t] };
      const res2 = new Map(results.get ? results : Object.entries(results)); res2.set(t.id, r);
      const after = strengthCheck(st2, res2);
      if (!(after.report.worst < res.report.worst * 0.95)) continue;
      out.push({ ...c, pts: t.pts, worstBefore: res.report.worst, worstAfter: after.report.worst, weight: r.weight * (c.mirror ? 2 : 1) });
    }
    return out.sort((p, q) => p.worstAfter - q.worstAfter);
  }

  root.CageGeo = { D2R, R2D, MATERIALS, V, mirrorPt, num, fmt, esc, linearDensity, sdf, rayHitsKeepout, densify, sectionOf, materialOf, segClosest, frameModel, solveFrame, LOAD_CASES, STRENGTH_DEFAULTS, loadCases, strengthReport, strengthCheck, braceSuggestions, computeTube, stockPlan, turnOf, rotLabel, sectionsOf, bendSheetText, PAPERS, printPack, printPackHTML, lineAngle, lineGap, closestPoints, segmentAngle, angleWedges };
})(typeof globalThis !== "undefined" ? globalThis : window);
