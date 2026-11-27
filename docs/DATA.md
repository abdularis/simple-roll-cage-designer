# Data formats

All lengths are millimetres, angles degrees. Axes: X forward, Y to the car's left, Z up. Origin on the ground, on the car's centreline, midway between the axles.

## Design (saved in localStorage as `cage-bender.design.v2`, and by "Save file" in the top bar)

```jsonc
{
  "v": 2,
  "name": "EMB-DT style cage (example)",
  "notes": "Build order…",  // free text, shown under Design notes
  "stock":  { "material": "steel", "od": 3, "wall": 0,            // material: key of MATERIALS in geometry.js; wall 0 = solid rod
              "E": 200, "fy": 250 },                               // optional, strength check only: stiffness (GPa) and yield (MPa).
                                                                   // Absent = the material's typical value in MATERIALS (a guess: check your supplier)
  "bender": { "clr": 10, "calTarget": 90, "calActual": 86,         // CLR = bend radius to rod centre; springback test angles
              "markOffset": 0,                                     // how far after the line the bender starts bending (test bend); lines print that much earlier
              "trim": 10, "minStraight": 6 },                      // extra length per end; grip needed between bends
  "margin": 3,            // clearance below this is a warning
  "stockLen": 1000,       // stock rod length for the cutting plan
  "snap": 1,              // grid snap for mouse edits, 0 = off
  "paper": "a4",          // print pack paper: key of CageGeo.PAPERS (a4, letter, a3), always landscape
  "underlay": "chassis",  // key of CAR_LC12B1.underlays, "none" (no drawing, keep-outs still shown; labelled "Car keep-outs only"), or "tubes" (views show only the tubes: no grid, drawing or keep-outs)
  "underlayAlpha": 0.45,
  "planes": { "top": 95, "side": 40, "front": 30 },   // depth new corners get in each view (Z, Y, X)
  "tubes": [
    { "id": "t1", "name": "Main hoop", "color": 0,     // color: index into TUBE_COLORS in index.html
      "mirror": false,                                 // true = also make the copy mirrored across Y = 0
      "hidden": false,                                 // true = not drawn in the views (still in cut list and print pack)
      "group": null,                                   // group name, or null. Groups exist only while a tube names them
      "mounts": { "0": true, "3": false },             // optional, strength check: corner index -> fixed to the car or not.
                                                       // Unlisted corners are auto (on if within OD/2 + 3 mm of a keep-out with mount: true).
                                                       // A mirrored tube's overrides apply to both copies
      "pts": [[-20, 48, 21], [-20, 40, 95], [-20, -40, 95], [-20, -48, 21]] }  // corners, start end first
  ],
  "keepouts": [ /* same shape as the car data below; a design carries its own copy */ ],
  "strength": {           // strength check inputs (starting guesses, not measured)
    "weight": 1000,       // car ready to run, grams
    "fix": "pinned",      // "pinned": mounts hold position, free to tilt; "clamped": position and angle
    "factors": { "roof": 3, "side": 3, "nose": 3, "rear": 3 }  // each crash pushes weight × 9.81 × factor newtons
  }
}
```

`migrate()` in `index.html` fills missing fields from the example and drops malformed tubes and keep-outs, so older or hand-edited files still open.

## Car data (`car-lc12b1.js`)

`globalThis.CAR_LC12B1 = { … }`. Everything after the `=` must stay valid JSON, because `tools/proof_underlays.py` parses it.

| Key | Meaning |
|---|---|
| `underlays.<id>` | `src` PNG, `label`, `ox`/`oy` = image pixel at the car origin, `mmPerPx`, `w`/`h`. The PNG is already turned so +X is image right and +Y is image up |
| `keepouts[]` | `{ id, name, kind: "box" \| "wheel", c: [x,y,z] centre, s: [size x, size y, size z], check, mount, note }`. `mount: true` = the cage can be fixed to it (only the chassis plate in the car data); tube corners resting on it start as mounts in the strength check. For a wheel, `s[0]` is the diameter and `s[1]` the width (axis along Y) |
| `example` | `{ name, notes, tubes }`, the starting design (see docs/EXAMPLE-CAGE.md) |

## Tube results (`CageGeo.computeTube`)

`bends[]` = `{ no, vertex, angle, bendTo, mark, start, center, end, arc, rot, straightBefore }`. `start`/`center`/`end` are where the bend really is, measured from the start end of the cut rod, including `bender.trim`. `mark` is where to draw the line that goes on the bender's 0: `start − bender.markOffset`. `rot` is the angle from the previous bend's plane to this bend's plane, right-handed about the rod (−180…180, null for the first). The turn to make in the bender, clockwise looking from the start end, is `turnOf(rot)` = −rot: turning the tube carries the earlier bends round while the bender keeps bending in its own plane. `tools/check.mjs` simulates a bender to check this. `sectionsOf(r)` splits a 3D tube into flat runs of bends (one per twist); the print pack draws each one full size. Also `cut`, `developed`, `kind` (`straight` / `planar` / `3d`), `weight`, `clearance { d, name }`, `errors[]`, `warnings[]`, `status` (`ok` / `warn` / `bad`).

## Print pack (`CageGeo.printPack(state, results, opts)`)

Returns `{ paper: { label, w, h }, pages: [{ title, svg }] }`. Each page is an SVG sized in millimetres (`opts.screen` makes it scale to its container instead). Order: cover with parts list, test bend, bent parts (one or two pages each, more if a shape needs several sheets), straight pieces, then side, top and front assembly views. `opts.only` = a tube id gives just that part's pages. `printPackHTML(pack, title)` wraps the pages in a standalone printable HTML file.

## Strength check (`CageGeo.strengthCheck(state, results, { suggest })`)

The cage as a 3D frame of beams: linear statics, rigid brazed joints, steady loads standing in for impacts. Units mm, N, MPa. Read the results as a ranking of weak spots: loads and material values are guesses.

- `frameModel(state, results)` → `{ nodes: [{ p, copies, corner }], elems: [{ a, b, copy, kind: "tube" | "link", bend, L, held }], copies: [{ name, tubeId, mir, seq }], mounts: [node], cornerNodes: [{ tubeId, mir, corner, node }], floating: [name], held, od }`. Each tube copy is cut at its corners, every ≤ 30° of bend (from `computeTube`'s `frame` points) and at joints. A joint is a tube end within 1.5 × OD of another tube's centreline, an end on another tube's corner point, or a crossing within 1.05 × OD. Points within 0.5 mm merge; wider gaps get a `link` element 10× stiffer than the rod.
- `loadCases(model, strength)` → five cases (`LOAD_CASES`: roof, side left, side right, nose, rear), each `{ id, label, dir, total, nodes, loads: [{ node, f }] }`. The push is shared equally by the free nodes within 5 mm of the outermost point in that direction (side cases: upper half only).
- `solveFrame(model, section, material, cases, fix)` → `{ cases: [{ u, rot, forces: [{ N, T, M: [Ma, Mb], Mv: [[My, Mz] at a, at b] }], reaction, stable }], elems, folds }`. `Mv` is the bending moment inside the element at each end; it varies linearly between them (no load along an element), which the tube-detail strip uses. 3D beam elements, Reverse Cuthill–McKee order, skyline LDLᵀ. `stable` is false when the reactions don't balance the loads (the cage isn't held firmly enough).
- `strengthReport(...)` → `{ worst, elems: [{ e, u: [per case], b: [per case], util, buck, score, worstCase, bendShare }], spots: [{ tube, tubeId, place, score, buckling, caseIdx, caseLabel, p }] }`. `u` = von Mises stress / yield, `b` = compression / Euler buckling load (straight pieces, pinned ends). `score` = the larger, worst case.
- `braceSuggestions(...)` (also `result.suggestions` with `suggest: true`) → `[{ kind: "diagonal" | "gusset" | "buckling", pts: [a, b], mirror, reason, worstBefore, worstAfter, weight }]`. Each brace is checked by running the whole analysis again with it added; only braces that lower the worst score by 5 % or more and clear the car are kept, best first.

