// Sanity checks for geometry.js and the LC12B1 example cage.
// Run from the project root: node tools/check.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

for (const f of ["geometry.js", "car-lc12b1.js"]) (0, eval)(readFileSync(f, "utf8"));
const { computeTube, stockPlan, printPack, printPackHTML, PAPERS, turnOf, sectionsOf, V, segmentAngle, closestPoints, angleWedges, rayHitsKeepout, sectionOf, materialOf, frameModel, solveFrame, strengthCheck } = globalThis.CageGeo;
const car = globalThis.CAR_LC12B1;

const base = {
  stock: { material: "steel", od: 3, wall: 0 },
  bender: { clr: 10, calTarget: 90, calActual: 86, trim: 10, minStraight: 6 },
  margin: 3, stockLen: 1000, keepouts: [],
};
const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} != ${b}`);

// 1. One 90° bend: tangent = R, arc = πR/2
{
  const r = computeTube({ pts: [[0, 0, 0], [50, 0, 0], [50, 50, 0]] }, base);
  near(r.bends[0].angle, 90);
  near(r.bends[0].straightBefore, 40);
  near(r.lastStraight, 40);
  near(r.developed, 80 + Math.PI * 5);
  near(r.cut, r.developed + 20);
  near(r.bends[0].start, 10 + 40);
  near(r.bends[0].bendTo, 90 * 90 / 86);
  assert.equal(r.kind, "planar");
}
// 2. S-bend in one plane reads as 180° rotation and stays flat
{
  const r = computeTube({ pts: [[0, 0, 0], [40, 0, 0], [40, 40, 0], [80, 40, 0]] }, base);
  near(Math.abs(r.bends[1].rot), 180);
  assert.equal(r.kind, "planar");
}
// 3. Second bend turned out of plane: +/-90° rotation, 3D
{
  const r = computeTube({ pts: [[0, 0, 0], [40, 0, 0], [40, 40, 0], [40, 40, 40]] }, base);
  near(Math.abs(r.bends[1].rot), 90);
  assert.equal(r.kind, "3d");
}
// 4. Segment too short for the radius is an error
{
  const r = computeTube({ pts: [[0, 0, 0], [15, 0, 0], [15, 15, 0], [0, 15, 0]] }, base);
  assert.ok(r.errors.some((e) => e.startsWith("Segment 2→3")));
}
// 5. Clearance: a rod through a box is a hit
{
  const st = { ...base, keepouts: [{ name: "Box", kind: "box", c: [0, 0, 0], s: [10, 10, 10], check: true }] };
  const r = computeTube({ pts: [[-20, 0, 0], [20, 0, 0]] }, st);
  assert.ok(r.clearance.d < 0 && r.hits.length > 0);
}

// 6. Mark offset moves the line to put on the bender's 0, not the bend itself
{
  const st = { ...base, bender: { ...base.bender, markOffset: 2.5 } };
  const r = computeTube({ pts: [[0, 0, 0], [50, 0, 0], [50, 50, 0]] }, st);
  near(r.bends[0].start, 50);
  near(r.bends[0].mark, 47.5);
}
// 7. A hoop shows the distance across its ends, inside edges and outside edges
{
  const hoop = { id: "h", name: "Hoop", mirror: false, pts: [[0, -47, 21], [0, -47, 90], [0, 47, 90], [0, 47, 21]] };
  const st = { ...base, name: "t", tubes: [hoop] };
  const res = new Map([["h", computeTube(hoop, st)]]);
  const svg = printPack(st, res, { paper: "a4", only: "h" }).pages.map((p) => p.svg).join("");
  assert.ok(svg.includes("91.0 inside edges") && svg.includes("97.0 outside edges"), "edge measurements missing from the drawing");
  const words = [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" "); // wrapped lines joined
  assert.ok(words.includes("inside edges 91.0 mm, outside edges 97.0 mm"), "edge measurements missing from the steps");
}
// 8. Twist direction: simulate a bender (tube along +X through the bend point, start end towards -X, every bend
//    swinging the far part towards +Y). Turning the tube by a, clockwise seen from the start end, must read as turn a.
{
  const rotX = (p, a) => [p[0], p[1] * Math.cos(a) - p[2] * Math.sin(a), p[1] * Math.sin(a) + p[2] * Math.cos(a)];
  const rotZ = (p, a) => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a), p[2]];
  const D = Math.PI / 180;
  for (const turn of [30, 94, -60]) {
    let pts = [[-60, 0, 0], [0, 0, 0]];
    [50, 70, 40].forEach((th, i) => {
      if (i === 1) pts = pts.map((p) => rotX(p, turn * D));
      const nxt = [60 * Math.cos(th * D), 60 * Math.sin(th * D), 0];
      pts.push(nxt);
      pts = pts.map((p) => rotZ(V.sub(p, nxt), -th * D));
    });
    const r = computeTube({ pts }, { ...base, bender: { ...base.bender, clr: 5 } });
    near(turnOf(r.bends[1].rot), turn, 0.05);
    assert.equal(sectionsOf(r).length, 2, "a twisted tube splits into flat sections");
  }
}
// 9. A 3D hoop prints its flat sections, one per twist
{
  const hoop = { id: "h3", name: "Kinked hoop", mirror: false, pts: [[54, -49, 21], [54, -38, 78], [33, -32, 113], [33, 32, 113], [54, 38, 78], [54, 49, 21]] };
  const st = { ...base, name: "t", tubes: [hoop] };
  const r = computeTube(hoop, st);
  assert.equal(r.kind, "3d");
  assert.deepEqual(sectionsOf(r).map((x) => [x.i0, x.i1]), [[0, 0], [1, 2], [3, 3]]);
  const svg = printPack(st, new Map([["h3", r]]), { paper: "a4", only: "h3" }).pages.map((p) => p.svg).join("");
  for (const sec of ["Section A: B1", "Section B: B2–B3", "Section C: B4", "TWIST PROTRACTOR"]) assert.ok(svg.includes(sec), sec + " missing");
  assert.ok(!/NaN|undefined|Infinity/.test(svg), "bad number in the 3D pages");
}
// 10. A part too big for one sheet is split over several, and nothing in the pack is NaN
{
  const big = { id: "big", name: "Big U", mirror: false, pts: [[0, 0, 0], [400, 0, 0], [400, 300, 0], [0, 300, 0]] };
  const st = { ...base, name: "t", tubes: [big] };
  const res = new Map([["big", computeTube(big, st)]]);
  const one = printPack(st, res, { paper: "a4", only: "big" });
  assert.ok(one.pages.length > 2, `expected the big shape on several sheets, got ${one.pages.length}`);
  for (const pg of one.pages) assert.ok(!/NaN|undefined|Infinity/.test(pg.svg), "bad number in " + pg.title);
}

// Angle tool: line-to-line angle in 3D
{
  const A = segmentAngle;
  let a = A([0, 0, 0], [10, 0, 0], [0, 0, 0], [0, 10, 0]);
  near(a.acute, 90); near(a.obtuse, 90); assert.equal(a.skew, false); near(a.gap, 0);
  const c60 = [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3), 0];
  a = A([0, 0, 0], [10, 0, 0], [0, 0, 0], V.mul(c60, 7));
  near(a.acute, 60); near(a.obtuse, 120);
  const b = A([0, 0, 0], [10, 0, 0], V.mul(c60, 7), [0, 0, 0]); // second segment reversed
  near(b.acute, 60); near(b.obtuse, 120);
  a = A([0, 0, 0], [10, 0, 0], [0, 5, 0], [20, 5, 0]); // parallel, 5 mm apart
  assert.equal(a.parallel, true); assert.equal(a.skew, false); near(a.acute, 0); near(a.gap, 5);
  a = A([0, 0, 0], [10, 0, 0], [20, 0, 0], [0, 0, 0]); // antiparallel, collinear
  assert.equal(a.parallel, true); near(a.gap, 0);
  a = A([0, 0, 0], [10, 0, 0], [3, -5, 10], [3, 5, 10]); // crosses over, 10 mm above
  near(a.acute, 90); assert.equal(a.skew, true); near(a.gap, 10);
  a = A([0, 0, 0], [10, 0, 0], [30, 0, 0], [30, 10, 0]); // lines meet outside the segments: still not skew
  assert.equal(a.skew, false);
  assert.equal(A([1, 1, 1], [1, 1, 1], [0, 0, 0], [1, 0, 0]), null); // degenerate segment
}

// Angle sketch: directed angle, closest points, wedge layout
{
  const A = segmentAngle;
  near(A([0, 0, 0], [10, 0, 0], [0, 0, 0], [0, 10, 0]).directed, 90);
  const c60 = [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3), 0];
  const fwd = A([0, 0, 0], [10, 0, 0], [0, 0, 0], V.mul(c60, 7)), rev = A([0, 0, 0], [10, 0, 0], V.mul(c60, 7), [0, 0, 0]);
  near(fwd.directed, 60); near(rev.directed, 120); near(rev.acute, 60);

  // crossing segments: both closest points are the crossing, and it is on both segments
  let a = A([0, 0, 0], [10, 0, 0], [4, -3, 0], [4, 3, 0]);
  near(V.len(V.sub(a.pa, a.pb)), 0); near(a.pa[0], 4); assert.ok(a.onA && a.onB);
  // skew: the closest points are 10 mm apart in Z
  a = A([0, 0, 0], [10, 0, 0], [3, -5, 10], [3, 5, 10]);
  near(V.len(V.sub(a.pa, a.pb)), 10); near(a.pa[2], 0); near(a.pb[2], 10); assert.ok(a.onA && a.onB);
  // lines meet beyond the end of segment B
  a = A([0, 0, 0], [10, 0, 0], [4, 3, 0], [4, 8, 0]);
  near(a.pa[0], 4); near(a.pb[1], 0); assert.ok(a.onA); assert.equal(a.onB, false);
  // parallel: no closest points
  a = A([0, 0, 0], [10, 0, 0], [0, 5, 0], [20, 5, 0]);
  assert.equal(a.pa, null); assert.equal(a.pb, null); assert.equal(a.onA, false);
  assert.equal(closestPoints([0, 0, 0], [1, 0, 0], [0, 1, 0], [2, 0, 0]), null);

  // wedge layout: 60 degrees, B turned clockwise on screen (cross > 0) and anticlockwise (cross < 0)
  for (const sign of [1, -1]) {
    const w = angleWedges([1, 0], [Math.cos(sign * 1), Math.sin(sign * 1)], 60);
    near(w.wedges.reduce((t, x) => t + x.deg, 0), 360, 1e-6);
    near(w.wedges.filter((x) => x.acute).length, 2, 0); near(w.wedges.filter((x) => !x.acute).length, 2, 0);
    for (const x of w.wedges) near(x.deg === x.deg && (x.acute ? x.deg : 180 - x.deg), 60, 1e-6);
    near(w.a, 0, 1e-9); near(w.b, sign * Math.PI / 3, 1e-9);
  }
  // opposite wedges are equal
  const w4 = angleWedges([0, -1], [1, 1], 135).wedges;
  near(w4[0].deg, w4[2].deg, 1e-6); near(w4[1].deg, w4[3].deg, 1e-6);
  // perpendicular: nothing is flagged acute
  assert.ok(angleWedges([1, 0], [0, 1], 90).wedges.every((x) => !x.acute));
  // degenerate screen directions (segment seen end-on): finite numbers, still 360 degrees
  for (const [d1, d2] of [[[0, 0], [1, 0]], [[1, 0], [0, 0]], [[0, 0], [0, 0]]]) {
    const w = angleWedges(d1, d2, 40);
    assert.ok(Number.isFinite(w.a) && Number.isFinite(w.b) && w.wedges.every((x) => Number.isFinite(x.from) && Number.isFinite(x.deg)));
    near(w.wedges.reduce((t, x) => t + x.deg, 0), 360, 1e-6);
  }
}

// 11. Rays toward the viewer: what a keep-out hides in the 3D view
{
  const box = { kind: "box", c: [0, 0, 0], s: [20, 10, 6] };
  assert.equal(rayHitsKeepout(box, [-30, 0, 0], [1, 0, 0]), true, "box straight ahead");
  assert.equal(rayHitsKeepout(box, [30, 0, 0], [1, 0, 0]), false, "box behind the ray start");
  assert.equal(rayHitsKeepout(box, [-30, 6, 0], [1, 0, 0]), false, "passes beside the box");
  assert.equal(rayHitsKeepout(box, [-30, 0, 3.5], [1, 0, 0]), false, "passes just over the box");
  assert.equal(rayHitsKeepout(box, [0, 0, 0], [0, 0, 1]), true, "starts inside");
  assert.equal(rayHitsKeepout(box, [-30, -20, 0], [1, 1, 0]), true, "diagonal through the box");
  assert.equal(rayHitsKeepout(box, [-30, -10, 0], [1, 1, 0]), false, "diagonal past the corner");
  const wheel = { kind: "wheel", c: [0, 50, 20], s: [40, 15, 40] }; // Ø40, 15 wide, axle on Y
  assert.equal(rayHitsKeepout(wheel, [0, 50, 100], [0, 0, -1]), true, "down onto the tyre");
  assert.equal(rayHitsKeepout(wheel, [25, 50, 100], [0, 0, -1]), false, "down past the tyre");
  assert.equal(rayHitsKeepout(wheel, [0, 0, 20], [0, 1, 0]), true, "along the axle into the wheel");
  assert.equal(rayHitsKeepout(wheel, [21, 0, 20], [0, 1, 0]), false, "along the axle outside the rim");
  assert.equal(rayHitsKeepout(wheel, [0, 70, 20], [0, -1, 0]), true, "along the axle from the outside");
  assert.equal(rayHitsKeepout(wheel, [0, 40, 100], [0, 0, -1]), false, "beside the tread");
  assert.equal(rayHitsKeepout(wheel, [-60, 50, -100], [1, 0, 1]), false, "diagonal under the wheel");
  assert.equal(rayHitsKeepout(wheel, [-60, 50, -40], [1, 0, 1]), true, "diagonal through the wheel");
}

// 12. Frame solver against textbook beams (3 mm mild steel rod, mm / N)
{
  const sec = sectionOf({ od: 3, wall: 0 }), mat = materialOf({ material: "steel" });
  const { E, G } = mat, { A, I, J } = sec;
  const frame = (pts, el, mounts) => ({ nodes: pts.map((p) => ({ p, copies: [0] })), elems: el.map(([a, b]) => ({ a, b, kind: "tube", bend: 0, copy: 0 })), mounts });
  const solve = (m, loads, fix) => solveFrame(m, sec, mat, [{ loads }], fix).cases[0];
  const rel = (a, b, tol = 1e-4) => assert.ok(Math.abs(a - b) <= tol * Math.abs(b), `${a} != ${b}`);
  const L = 100, P = 10;
  // cantilever, one element and four
  let c = solve(frame([[0, 0, 0], [L, 0, 0]], [[0, 1]], [0]), [{ node: 1, f: [0, 0, -P] }], 6);
  rel(c.u[1][2], -P * L ** 3 / (3 * E * I)); rel(c.forces[0].M[0], P * L); assert.ok(c.stable);
  // the moment inside the beam runs in a straight line from P·L at the root to 0 at the tip
  near(Math.hypot(...c.forces[0].Mv[0]), P * L, 0.01); near(Math.hypot(...c.forces[0].Mv[1]), 0, 0.01);
  { const m = c.forces[0].Mv, mid = [0, 1].map((k) => (m[0][k] + m[1][k]) / 2); near(Math.hypot(...mid), P * L / 2, 0.01); }
  c = solve(frame([0, 25, 50, 75, 100].map((x) => [x, 0, 0]), [[0, 1], [1, 2], [2, 3], [3, 4]], [0]), [{ node: 4, f: [0, -P, 0] }], 6);
  rel(c.u[4][1], -P * L ** 3 / (3 * E * I));
  // axial stretch, tension positive
  c = solve(frame([[0, 0, 0], [0, 0, L]], [[0, 1]], [0]), [{ node: 1, f: [0, 0, P] }], 6);
  rel(c.u[1][2], P * L / (E * A)); rel(c.forces[0].N, P);
  // L-frame: bending of both legs plus torsion of the first
  const Lx = 80, Ly = 50;
  c = solve(frame([[0, 0, 0], [Lx, 0, 0], [Lx, Ly, 0]], [[0, 1], [1, 2]], [0]), [{ node: 2, f: [0, 0, -P] }], 6);
  rel(c.u[2][2], -(P * Ly ** 3 / (3 * E * I) + P * Lx ** 3 / (3 * E * I) + P * Ly ** 2 * Lx / (G * J)));
  rel(c.forces[0].T, P * Ly);
  // pinned portal, sideways load H: each column top carries H·h/2, reactions balance the load
  const h = 60, b = 80, H = 10;
  c = solve(frame([[0, 0, 0], [0, 0, h], [b, 0, h], [b, 0, 0]], [[0, 1], [1, 2], [2, 3]], [0, 3]), [{ node: 1, f: [H, 0, 0] }], 3);
  rel(c.forces[0].M[1], H * h / 2, 1e-3); rel(c.forces[2].M[0], H * h / 2, 1e-3); near(c.reaction[0], -H, 1e-6); assert.ok(c.stable);
  // a bar on one pin swings: flagged unstable instead of trusted
  c = solve(frame([[0, 0, 0], [L, 0, 0]], [[0, 1]], [0]), [{ node: 1, f: [0, 0, -P] }], 3);
  assert.equal(c.stable, false, "one pin should not hold a bar");
}
// 13. Strength check on the example cage: joints, mounts, balance
{
  const st = { ...base, keepouts: car.keepouts, tubes: car.example.tubes };
  const results = new Map(st.tubes.map((t) => [t.id, computeTube(t, st)]));
  const m = frameModel(st, results);
  const names = (nd) => nd.copies.map((c) => m.copies[c].name);
  const jointOf = (p) => m.nodes.find((nd) => V.len(V.sub(nd.p, p)) < 0.6);
  // part-way joints: Rear stay on Main hoop, Door bar on Front hoop
  assert.deepEqual(names(jointOf([-20, 45, 80])).sort(), ["Main hoop", "Rear stay (L)"]);
  assert.deepEqual(names(jointOf([66.4, 43.6, 45])).sort(), ["Door bar (L)", "Front hoop"]);
  // roof rail meets the Main hoop's top corner, which the bend cuts off by ~3 mm: joined by a link
  const rail = m.copies.findIndex((c) => c.name === "Roof rail (L)"), hoop = m.copies.findIndex((c) => c.name === "Main hoop");
  assert.ok(m.elems.some((e) => e.kind === "link" && [e.a, e.b].some((v) => m.nodes[v].copies.includes(rail)) && [e.a, e.b].some((v) => m.nodes[v].copies.includes(hoop))), "roof rail not joined to main hoop");
  // the six feet sit on the chassis plate (marked as a mount surface): auto mounts
  assert.equal(m.mounts.length, 6); assert.deepEqual(m.floating, []);
  for (const v of m.mounts) near(m.nodes[v].p[2], 21, 0.01);
  const r = strengthCheck(st, results, { suggest: true });
  assert.deepEqual(r.warnings, []);
  assert.equal(r.cases.length, 5);
  r.sol.cases.forEach((c, i) => { assert.ok(c.stable, `${r.cases[i].label} unstable`); near(Math.hypot(...c.reaction.map((v, k) => v + r.cases[i].loads.reduce((t, l) => t + l.f[k], 0))), 0, 1e-6); });
  assert.ok(r.report.worst > 0 && r.report.worst < 5, `worst ${r.report.worst}`);
  assert.ok(r.report.spots.length > 0);
  assert.ok(r.suggestions.length > 0, "no brace suggested");
  for (const sg of r.suggestions) assert.ok(sg.worstAfter < sg.worstBefore);
  console.log(`Strength check: worst ${(r.report.worst * 100).toFixed(0)}% of yield (${r.report.spots[0].tube} ${r.report.spots[0].place}, ${r.report.spots[0].caseLabel}); best brace takes it to ${(r.suggestions[0].worstAfter * 100).toFixed(0)}%`);
  // mount overrides: a foot shared by two tubes stays a mount until both say no (the Mounts tool sets both)
  const off = (over) => ({ ...st, tubes: st.tubes.map((t) => (over[t.name] ? { ...t, mounts: over[t.name] } : t)) });
  assert.equal(frameModel(off({ "Front hoop": { 0: false } }), results).mounts.length, 6);
  // Floor rail is mirrored: its end override applies to both sides, the right foot is still held by the Front hoop
  assert.equal(frameModel(off({ "Front hoop": { 0: false }, "Floor rail": { 1: false } }), results).mounts.length, 5);
}
// 14. A tube that touches nothing is reported, and a design with no mounts says so
{
  const plate = { id: "p", name: "Plate", kind: "box", c: [0, 0, 0], s: [200, 200, 4], check: false, mount: true };
  const hoop = { id: "h", name: "Hoop", pts: [[0, 40, 3.5], [0, 40, 60], [0, -40, 60], [0, -40, 3.5]] };
  const stray = { id: "s", name: "Stray", pts: [[60, 0, 80], [100, 0, 80]] };
  const st = { ...base, keepouts: [plate], tubes: [hoop, stray] };
  const results = new Map(st.tubes.map((t) => [t.id, computeTube(t, st)]));
  const r = strengthCheck(st, results);
  assert.deepEqual(r.model.floating, ["Stray"]);
  assert.ok(r.warnings.some((w) => w.includes("Stray")));
  const none = strengthCheck({ ...st, keepouts: [{ ...plate, mount: false }] }, results);
  assert.ok(none.warnings.some((w) => w.startsWith("No mounts")));
  // with nothing mounted, every tube is "unconnected": say that once, not per tube, and offer the lowest corners
  assert.equal(none.warnings.length, 1);
  assert.deepEqual([...new Set(none.lowCorners.map((c) => `${c.tubeId}:${c.corner}`))].sort(), ["h:0", "h:3"]);
}
// 15. A bare hoop pushed sideways gets a diagonal, and the diagonal helps
{
  const plate = { id: "p", name: "Plate", kind: "box", c: [0, 0, 0], s: [200, 200, 4], check: false, mount: true };
  const hoop = { id: "h", name: "Hoop", pts: [[0, 40, 3.5], [0, 40, 70], [0, -40, 70], [0, -40, 3.5]] };
  const st = { ...base, keepouts: [plate], tubes: [hoop], strength: { factors: { side: 3, roof: 3, nose: 0, rear: 0 } } };
  const results = new Map(st.tubes.map((t) => [t.id, computeTube(t, st)]));
  const r = strengthCheck(st, results, { suggest: true });
  const diag = r.suggestions.find((sg) => sg.kind === "diagonal");
  assert.ok(diag, "no diagonal for a bare hoop");
  assert.ok(diag.worstAfter < 0.7 * r.report.worst, `diagonal only takes ${r.report.worst} to ${diag.worstAfter}`);
}

// Example cage on the measured car
const st = { ...base, keepouts: car.keepouts, tubes: car.example.tubes };
const results = new Map();
console.log("Example cage on the LC12B1 keep-outs:");
for (const t of st.tubes) {
  const r = computeTube(t, st);
  results.set(t.id, r);
  console.log(`  ${t.name.padEnd(12)} cut ${r.cut.toFixed(1).padStart(6)} mm  ${r.kind.padEnd(7)} bends ${r.bends.length}  clearance ${r.clearance.d.toFixed(1)} mm to ${r.clearance.name}  [${r.status}]`);
  for (const m of [...r.errors, ...r.warnings]) console.log("     ! " + m);
}
const plan = stockPlan(st, results);
console.log(`  stock: ${plan.bins.length} x ${plan.L} mm`);
for (const paper of Object.keys(PAPERS)) {
  const pack = printPack({ ...st, name: "Example" }, results, { paper, date: "2026-01-01" });
  assert.ok(pack.pages.length >= 6, "print pack too short");
  pack.pages.forEach((pg, i) => {
    assert.ok(pg.svg.includes(`width="${PAPERS[paper].w}mm"`), "page not sized in mm");
    assert.ok(pg.svg.includes(`>${i + 1} / ${pack.pages.length}<`), "page number missing");
    assert.ok(!/NaN|undefined|Infinity/.test(pg.svg), `bad number on ${paper} page ${i + 1} (${pg.title})`);
  });
  printPackHTML(pack, "Example");
  if (paper === "a4") console.log(`  print pack: ${pack.pages.length} A4 pages: ${pack.pages.map((p) => p.title).join(" | ")}`);
}
console.log("All checks passed.");
