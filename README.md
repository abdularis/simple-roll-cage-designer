# Cage Bender

A small browser tool for designing a bent-rod roll cage (exoskeleton) for the **LC Racing LC12B1** 1/12 buggy, and turning it into shop output for a hand bender:

- **Mouse drafting** in Top, Side, Front and 3D views: draw tubes by clicking, drag tubes and corners, snap to other tubes.
- **Car reference** from the official manual (v2.30): the manual's top-view drawings sit under the Top and 3D views, and the main parts are boxes the cage is checked against.
- **Print pack** for working with a hand bender and a ruler, all full size: a parts list, a test bend that measures your bender, one page per bent part (marking strip, bend steps, and the finished shape to check against, with each bend's mark and every straight length), the straight pieces, and side, top and front views to hold parts while you join them. A 3D part (bends in more than one plane) gets one full-size drawing per flat section and a protractor for the twists between them. A4, US Letter or A3, landscape.
- **Bend numbers** per tube if you want them: where each line goes, bend angle, angle to pull to after springback, rotation between bends.
- **Cut list** with weight and a cutting plan for your stock rod length.

It opens with a complete example cage: an EMB-DT style cabin with a sloping desert-buggy tail, a flat nose hoop over the front shocks, four bent parts and thirteen straight rods, about 130 g. See [docs/EXAMPLE-CAGE.md](docs/EXAMPLE-CAGE.md).

No build step and no dependencies beyond Google Fonts.

## Run it

```bash
cd projects/simple-roll-cage-designer
python3 -m http.server 8000      # then open http://localhost:8000
```

Opening `index.html` directly (`file://`) also works in Chrome and Firefox. Designs are saved in the browser's localStorage. Use **File → Save design file** in the top bar to keep a copy (**File → Open design file** loads one back). In Chrome and Edge the file stays linked: every change is saved back into it, and the file's name shows in a chip next to the design name and in the browser tab (browsers only reveal the name, not the folder). <kbd>Ctrl</kbd>+<kbd>S</kbd> saves at once. After a reload, **File → Reopen …** links it again. Firefox and Safari download a copy instead or move it to another machine.

## Use it

| To… | Do this |
|---|---|
| Draw a new tube | **Draw** (or <kbd>D</kbd>), click corners in Top, Side or Front, double-click or <kbd>Enter</kbd> to finish |
| Start or end a tube on another tube | Click near it: a green ring means it will snap. Only tubes at about the same depth (±15 mm) snap; hold <kbd>Shift</kbd> to snap at any depth |
| Choose the depth new corners go to | In Draw mode, drag the dashed plane lines in the other views. Snapping to a tube moves the plane there |
| Move a whole tube | **Select** (<kbd>V</kbd>), drag the tube |
| Measure a distance | **Measure** (<kbd>M</kbd>), click two points in Top, Side or Front. It shows the length on that view's plane and its two parts (for example X and Z in Side). Clicks snap to tubes, <kbd>Shift</kbd> keeps the line level or plumb, <kbd>Esc</kbd> clears |
| Angle between two tubes | **Angle** (<kbd>A</kbd>), click one straight segment, then another, in Top, Side or Front. It shows the true 3D angle (acute / obtuse) and says if the lines are parallel or skew. A sketch where the tubes cross draws both lines (A and B match the two highlighted segments, arrows follow corner order) with all four angles in their own wedges, the acute ones shaded. Mirrored copies can be picked, a third click starts again, <kbd>Esc</kbd> clears |
| Reshape a tube | Drag its round handles. Double-click a segment to add a corner, <kbd>Del</kbd> removes the selected one |
| Fine-tune | Arrow keys nudge the selected corner (or the whole tube) in the last view you clicked, <kbd>Shift</kbd> = ×10 |
| Make a left/right pair | Tick **Mirror pair** on the tube |
| Quick start | **+ Add → Hoop** puts a hoop at the Front plane; **+ Add → Bar** puts a bar at the Top plane |
| See tips for the current tool | **?** at the right of the tool bar. Manual drawing, its strength and grid snap are under **View**. Manual drawing > **Tubes only** hides the car, drawing and grid |
| Type exact numbers | **Exact coordinates** under the selected tube |
| Find weak spots and where to brace | **Strength** in the tool bar turns the strength check on or off. Tubes turn green → amber → red by how hard they work in a roof landing, side roll, nose or rear hit; the **Strength** tab lists the weak spots and braces that help (**Show** previews one, **Add** makes it a tube). Set the car weight and hit factors there, and the rod's stiffness and yield under **Rod & bender**. The **Mounts** tool (only while it is on) marks the corners fixed to the car. Hover a tube for a popup with that spot's load, why (stretch / bending / twisting, buckling), each crash, and the load along the whole tube; the Strength tab shows the same for the selected tube. The % is how close a spot comes to bending for good (100% = stays bent), with a word: Strong under 50%, OK 50–80%, Tight 80–100%, Bends 100% and up. It ranks weak spots; the numbers rest on guessed loads |
| Print templates | **Print** tab under the views: **Print pack** (or **Save as file (HTML)** to print elsewhere). Print at 100 % ("actual size"), landscape, and check the 50 mm bar. **Print this part** in the **Selected part** tab prints only that part |
| Match the prints to your bender | Do the test bend on page 2 of the pack once, then enter the springback and **Mark offset** it gives you under **Rod & bender** in the tool bar, and print again |

Coordinates: millimetres, origin on the ground under the car's centre midway between the axles, X forward, Y to the car's left, Z up.

## Before trusting the clearance check

Footprints come from the manual's orthographic top views and are good to about ±2 mm. **Heights are estimates** because the manual has no side view. Measure the tops of the shock towers, top deck, motor, spur cover and wing on your car and correct them under *Keep-out zones*. See [docs/MANUAL-MEASUREMENTS.md](docs/MANUAL-MEASUREMENTS.md).

## Project map

| File | What it holds | Edit it when… |
|---|---|---|
| `index.html` | UI: views, mouse tools, panels, saving | You change behaviour or layout |
| `geometry.js` | Pure maths: bends, clearance, cutting plan, print pack pages (SVG in mm), strength check (frame model, solver, brace suggestions) | You change how tubes are calculated, printed or checked |
| `car-lc12b1.js` | Car data: keep-outs, underlay calibration, example cage | You correct a measurement |
| `assets/underlay-*.png` | Manual drawings as transparent line art | Re-generated by `tools/extract_underlays.py` |
| `tools/extract_underlays.py` | Rebuilds the underlays from the PDF | You change a crop |
| `tools/proof_underlays.py` | Draws keep-out boxes over the underlays into `proof/` | You changed a keep-out or calibration |
| `tools/check.mjs` | Maths checks + example cage report | Run after any change to `geometry.js` or car data |
| `docs/MANUAL-MEASUREMENTS.md` | How the car data was measured, confidence | You re-measure |
| `docs/DATA.md` | Design file and car data schemas | You change a schema |
| `docs/EXAMPLE-CAGE.md` | The example cage: parts, reasoning, sources | You change the example |

## How to…

### Check the maths after a change
```bash
node tools/check.mjs
```

### Correct a car measurement
1. Edit the keep-out in `car-lc12b1.js` (`c` = centre, `s` = size, both X, Y, Z in mm) and update its `note`.
2. Run `python3 tools/proof_underlays.py` and look at `proof/underlay-*.png`: the box must sit on the drawing.
3. Run `node tools/check.mjs` to see if the example cage still clears.
4. Record the change in `docs/MANUAL-MEASUREMENTS.md`.

A design already saved in the browser keeps its own copy of the keep-outs. Use **Reset to manual layout** in the **Car keep-outs** tab to pull in the new data.

### Rebuild the underlays
```bash
python3 tools/extract_underlays.py "LC12B1 Ver 2.30.pdf"
```
It prints the calibration block. Paste the numbers into `underlays` in `car-lc12b1.js`, then run the proof script.

> **Copyright:** the underlay drawings are LC Racing's, cropped from their public manual. Fine for personal use. Decide for yourself before publishing them.
