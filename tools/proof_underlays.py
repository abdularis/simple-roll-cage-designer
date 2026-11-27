#!/usr/bin/env python3
"""Draw the keep-out footprints from car-lc12b1.js over each Top-view underlay.

Run from the project root:
    python3 tools/proof_underlays.py

Writes proof/underlay-<id>.png (gitignored). Use it after changing a crop,
an origin, or a keep-out to check that the boxes sit on the drawing.
"""
import json
import os

from PIL import Image, ImageDraw

PX_PER_MM = 3.0


def main():
    src = open('car-lc12b1.js').read()
    marker = 'globalThis.CAR_LC12B1 ='
    car = json.loads(src[src.index(marker) + len(marker):].strip().rstrip(';'))
    os.makedirs('proof', exist_ok=True)
    for key, u in car['underlays'].items():
        W, H = 420, 260  # mm canvas, origin in the middle
        img = Image.new('RGB', (int(W * PX_PER_MM), int(H * PX_PER_MM)), 'white')
        lay = Image.open(u['src'])
        k = u['mmPerPx'] * PX_PER_MM
        lay = lay.resize((round(lay.width * k), round(lay.height * k)), Image.Resampling.LANCZOS)
        # screen = centre + (X, -Y) * PX_PER_MM ; image px (ox, oy) is the car origin
        left = img.width / 2 - u['ox'] * k
        top = img.height / 2 - u['oy'] * k
        img.paste(Image.new('RGB', lay.size, (60, 60, 60)), (round(left), round(top)), lay)
        d = ImageDraw.Draw(img)
        to = lambda X, Y: (img.width / 2 + X * PX_PER_MM, img.height / 2 - Y * PX_PER_MM)
        for ko in car['keepouts']:
            (cx, cy, _), (sx, sy, _) = ko['c'], ko['s']
            if ko['kind'] == 'wheel':
                sy = ko['s'][1]
            a, b = to(cx - sx / 2, cy + sy / 2), to(cx + sx / 2, cy - sy / 2)
            d.rectangle([a, b], outline=(220, 40, 40) if ko['check'] else (40, 120, 220), width=2)
        # axles and centreline
        for X in (-115, 115):
            d.line([to(X, -110), to(X, 110)], fill=(0, 160, 0))
        d.line([to(-210, 0), to(210, 0)], fill=(0, 160, 0))
        out = f'proof/underlay-{key}.png'
        img.save(out)
        print(out)


if __name__ == '__main__':
    main()
