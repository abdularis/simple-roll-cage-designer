# How the LC12B1 car data was measured

Source: `LC12B1 Ver 2.30.pdf` (LC Racing manual, 32 image-only pages). Measured 2026-10-11.

## Method

Pages were rendered with `pdftoppm -scale-to 2422` (1743 × 2422 px), the same render `tools/extract_underlays.py` uses. All pixel numbers below are in that render.

Two pages are true orthographic top views:

| Page | Content | Use |
|---|---|---|
| p.30 | Chassis from above, wheels pulled off to the sides, rear at the top | Component footprints, chassis underlay |
| p.31 | Assembled car with body and wing, rear at the top | Wheel size and track, wing, body underlay |

In both, the image's down direction is the car's front (+X) and image right is the car's **left** (+Y): the battery (car right) sits on the image's left.

### Scale

| Page | Axle lines (px) | Wheelbase (px) | Scale | Car centreline x (px) |
|---|---|---|---|---|
| p.30 | rear y 463, front y 1005 | 542 | 230 / 542 = 0.4244 mm/px | 988 |
| p.31 | rear tyre centre y 616, front 1514 | 898 | 230 / 898 = 0.2561 mm/px | 890 |

The 230 mm wheelbase is LC's own figure (retailers also quote 225 and 233 mm). It was checked against p.31 independently: a least-squares fit of the drawing's overall width (812 px) and length (1364 px) to LC's 205 × 352 mm gives 0.2566 mm/px, which implies a 230.4 mm wheelbase. At 0.2561 mm/px the drawing measures 208 × 349 mm overall. p.30's hub-nut tips (490 px apart = 208 mm) agree with p.31's tyre width.

Conversion: `X = (y_px − y_mid) × scale`, `Y = (x_px − x_centre) × scale`.

## Results

| Item | X range | Y range | Source | Confidence |
|---|---|---|---|---|
| Wheelbase | ±115 | | LC spec, both drawings agree | High |
| Front tyres | Ø 67, 28 wide, centre Y ±88.4 | | p.31 | Med (±2 mm) |
| Rear tyres | Ø 71, 35 wide, centre Y ±86.3 | | p.31 | Med (±2 mm) |
| Chassis plate + side guards | −97 … 90 | ±50 | p.30 | Med |
| Battery (rear right) | −97 … −6 | −37 … −5.5 | p.30 | Med; pack is 96 × 30 × 19 mm |
| Motor + mount (mid left) | −59 … −8 | 5 … 39 | p.30 | Med |
| Spur + slipper cover | 0 … 28 | −14 … 18 | p.30 | Med |
| Servo (front right) | 34 … 73 | −31 … −5.5 | p.30 | Med |
| ESC (front left) | 28 … 70 | 7 … 39 | p.30 | Med |
| Top deck | −99 … 98 | ±9.5 | p.30 | Med |
| Rear gearbox + arm mounts | −131 … −99 | ±37 | p.30 | Med |
| Rear shock tower | −144 … −133 | ±34 | p.30 | Med |
| Rear shocks | −150 … −123 | ±24 … ±71 | p.30 | Med |
| Wing mount posts | −180 … −142 | ±12 | p.30 | Med |
| Rear wing | −200.5 … −134.5 | ±77 | p.31 | Med |
| Front gearbox + arm mounts | 96 … 130 | ±30 | p.30 | Med |
| Front shocks + tower | 106 … 132 | ±51 | p.30 | Med |
| Steering links | 90 … 98 | ±80 | p.30 | Med |
| Front bumper | 132 … 139 | ±21 | p.30 | Med |

`tools/proof_underlays.py` draws these boxes over both drawings. Last check: every box sits on its part.

## Heights (Z): estimates

The manual has no side or front view, so every height is an estimate from the 3D drawings and typical 1/12 buggy proportions. **Measure these on the car**:

| Item | Z used (mm) | Basis |
|---|---|---|
| Axle height | 33.5 front, 35.6 rear | Tyre radius from p.31 (ignores sag) |
| Chassis plate | 15 … 19 | Assumed ~15 mm ride height + 2 mm plate + guard lip |
| Battery | 17 … 36 | Plate top + 19 mm pack |
| ESC | 17 … 36 | 16 mm ESC + fins |
| Motor + mount | 17 … 48 | 28 mm can on a mount |
| Spur cover | 17 … 50 | 60T mod 0.5 spur (≈31 mm) + cover |
| Servo | 17 … 40 | Footprint suggests it lies on its side |
| Top deck | 44 … 46 | Above the motor |
| Front shocks/tower | 22 … 66 | Guess |
| Rear shocks/tower | 25 … 75 | Guess |
| Wing posts / wing | 45 … 95 / 95 … 109 | Guess |

## Not modelled

- Receiver: not drawn in the manual (research for the exploded-view project puts it rear-left).
- Steering lock and suspension travel: enlarge the wheel keep-outs if you need the room.
- Body shell: shown only as the p.31 underlay, since the cage may replace it.
