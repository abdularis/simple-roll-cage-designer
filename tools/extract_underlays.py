#!/usr/bin/env python3
"""Re-create the Top-view underlays in assets/ from the LC12B1 manual.

Run from the project root:
    python3 tools/extract_underlays.py "LC12B1 Ver 2.30.pdf"

Needs: poppler-utils (pdftoppm) and Pillow.

Each page is rendered with its long side at 2422 px (1743 x 2422), the same
render that docs/MANUAL-MEASUREMENTS.md measures in. The car region is cropped,
turned into a black line mask with transparency, rotated so the car's front
points right (+X) and its left side points up (+Y), and saved as PNG.

The script prints the UNDERLAYS block for index.html. If you change a crop,
paste the new numbers into index.html.
"""
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image

# id: page, crop box in page pixels, car origin in page pixels (centreline, midway between axles),
#     mm per page pixel (from the 230 mm wheelbase), output scale
SOURCES = {
    'chassis': dict(page=30, crop=(720, 290, 1270, 1090), origin=(988.0, 734.0), mm_per_px=230 / 542, scale=1.0,
                    label='Chassis, manual p.30'),
    'body':    dict(page=31, crop=(470, 270, 1310, 1660), origin=(890.0, 1065.0), mm_per_px=230 / 898, scale=0.6,
                    label='Body and wing, manual p.31'),
}


def render(pdf, page, tmp):
    base = os.path.join(tmp, f'p{page}')
    subprocess.run(['pdftoppm', '-f', str(page), '-l', str(page), '-scale-to', '2422', '-png', pdf, base], check=True)
    name = [f for f in os.listdir(tmp) if f.startswith(f'p{page}')][0]
    return Image.open(os.path.join(tmp, name)).convert('L')


def main():
    pdf = sys.argv[1] if len(sys.argv) > 1 else 'LC12B1 Ver 2.30.pdf'
    os.makedirs('assets', exist_ok=True)
    meta = {}
    with tempfile.TemporaryDirectory() as tmp:
        for key, s in SOURCES.items():
            page = render(pdf, s['page'], tmp)
            x0, y0, x1, y1 = s['crop']
            img = page.crop(s['crop'])
            w = x1 - x0
            # dark line -> opaque black, white paper -> transparent
            alpha = img.point(lambda v: max(0, min(255, int((255 - v) * 1.25))))
            mask = Image.merge('LA', (Image.new('L', img.size, 0), alpha))
            mask = mask.transpose(Image.Transpose.ROTATE_90)  # front (image bottom) -> right
            ox, oy = s['origin'][0] - x0, s['origin'][1] - y0
            # ROTATE_90: (x, y) -> (y, w - 1 - x)
            rx, ry = oy, (w - 1) - ox
            k = s['scale']
            if k != 1.0:
                mask = mask.resize((round(mask.width * k), round(mask.height * k)), Image.Resampling.LANCZOS)
            out = f'assets/underlay-{key}.png'
            mask.save(out, optimize=True)
            meta[key] = dict(src=out, label=s['label'], ox=round(rx * k, 2), oy=round(ry * k, 2),
                             mmPerPx=round(s['mm_per_px'] / k, 5), w=mask.width, h=mask.height)
            print(f'{out}: {mask.width} x {mask.height}, {os.path.getsize(out) // 1024} KB')
    print('\nconst UNDERLAYS = ' + json.dumps(meta, indent=2) + ';')


if __name__ == '__main__':
    main()
