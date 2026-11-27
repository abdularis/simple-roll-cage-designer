# Example cage: EMB-DT cabin, desert buggy tail

The example design in `car-lc12b1.js` is a first cage that is meant to be built. It loads when you open the app (or press **Reset to example**).

## Inspiration

LC Racing's own **EMB-DT** desert truck is built on a very similar platform: 235 mm wheelbase, 340 × 205 mm, 120 mm tall, against the LC12B1's 230 mm and 352 × 205 mm. Its cage (part L6062) is moulded plastic, but the cabin carries over to rod:

- a tall cabin with a main hoop and a windshield hoop leaning back toward it
- a braced roof (the EMB-DT has an X)
- side door bars and low rocker rails
- the whole cage pops off after pulling a few pins, which keeps the electronics reachable

Behind the cabin it follows a desert buggy rather than a truck: instead of a flat bed, rear down tubes slope from the roof to a point near the rear axle, and lower bars rise from the floor rails to meet them. From the side the tail is a wedge.

Sources: [LC Racing L6062 DT Roll Cage Set](https://shop.lcracing.net/products/l6062), [AsiaTees EMB-DTH debut article and photos](https://www.asiatees.com/article?id=847), [AsiaTees EMB-DT listing (specs)](https://www.asiatees.com/display?brand=LC+Racing&model=EMB-DT&id=88924).

## What was simplified

Only **four parts are bent**: the main hoop, the front hoop, the front nose hoop and the rear down hoop. Everything else is straight 3 mm rod, so a first build needs a few good bends and a lot of brazing practice rather than a 3D bending setup. All four bent parts are flat, so each gets a full-size template.

| Part | Qty | Cut (mm) | Bends | Closest to the car |
|---|---|---|---|---|
| Main hoop | 1 | 296.8 | 4 (11.3°, 78.7°, 78.7°, 11.3°) | 6.5 mm, motor |
| Front hoop | 1 | 301.5 | 2 (82.7°, 82.7°) | 4.2 mm, ESC |
| Floor rail | 2 | 188.0 | 0 | 6.4 mm, ESC |
| Roof rail | 2 | 70.3 | 0 | 70 mm |
| Roof brace | 1 | 105.4 | 0 | 70 mm |
| Front nose hoop | 1 | 260.6 | 2 × 84.2° | 7.5 mm, front shocks |
| Nose brace | 1 | 136.2 | 0 | 7.5 mm, front shocks |
| Door bar | 2 | 110.0 | 0 | 8.6 mm, ESC |
| Rear stay | 2 | 111.6 | 0 | 5.6 mm, motor |
| Rear down hoop | 1 | 319.6 | 2 × 92.0° | 3.5 mm, rear shocks |
| Rear lower bar | 2 | 68.3 | 0 | 3.5 mm, rear shocks |
| Rear brace | 1 | 157.9 | 0 | 3.5 mm, rear shocks |

17 pieces, about 2.3 m and 130 g of 3 mm mild steel rod, cut from three 1 m rods. Cut lengths include 10 mm extra per end with the default settings. Clearances are against the keep-outs, whose **heights are estimates** until you measure your car.

## Why the parts sit where they do

- **Roof at Z 125**: about 1.5 m at 1/12, or 1.75 times the rear tyre diameter, which is in the range of a real desert buggy. The earlier Z 105 roof looked squat next to the 67–71 mm tyres.
- **Main hoop at X −20**: just behind the spur and between the motor (left) and the battery (right). Its legs go straight up to Z 70 before leaning in, to clear the motor, which is about 48 mm tall.
- **Front hoop feet at X 78**: in front of the ESC and servo and behind the steering links (X 90) and front shocks. The top sits at X 30, Z 120, so the windshield leans back about 26°.
- **Front nose hoop at Z 75**: a flat U from the front hoop legs forward to a crossbar at X 145, just inside the front of the tyres (X 148.5), like the nose of a desert buggy. It passes 7.5 mm over the front shock tower (top at about Z 66) and stays above the tyres (Z 67), so steering doesn't reach it. The nose brace makes it a triangle so it can't fold sideways.
- **Floor rails at Y ±47, Z 21**: along the chassis edge, outside the battery (Y −37) and the motor (Y +39). They tie every foot together so the cage is one removable unit.
- **Rear down hoop**: one U-shaped part from the main hoop at Z 115 down to a crossbar at X −118, Z 60, a slope of about 30°. The tip has to stop there: the rear shocks start at X −123 and rise to about Z 75, and the wing posts and wing fill the space above and behind them. **Measure the rear shocks before bending this hoop.**
- **Rear lower bars**: from the rear end of each floor rail (X −90) up to the corners of the rear down hoop. They stay outside the rear gearbox (Y ±37) and close the wedge.
- **Rear stays**: from the main hoop at Z 80 down to the rear end of each floor rail, splitting each side bay into triangles. The busiest joint is the floor rail's rear end, where the floor rail, rear stay and rear lower bar meet: braze it in that order.
- **Rear brace**: one diagonal across the sloping tail so it doesn't twist.
- **Door bars and roof brace**: turn the side and roof rectangles into triangles, so the cage doesn't fold when it lands on its roof.

## Ideas for a second version

- A roof light bar (the EMB-DT has one) on the front hoop.
- A spare tyre carried flat on the rear down tubes.
- Mount the wing on the cage instead of the stock posts. That frees the space over the rear shocks so the tail can run further back, like a full-length buggy.
- A post from the middle of the nose crossbar down to the front bumper, with a screw or clip there. The nose hoop is held only at the front hoop legs, so a hard nose-first landing can bend it down toward the shock tower.
