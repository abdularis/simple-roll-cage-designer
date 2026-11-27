# Cage Bender: notes for AI assistants

Static browser tool for designing a bent-rod roll cage for the LC Racing LC12B1 (1/12 buggy). Read `README.md` first.

## Rules

- No build step, no npm dependencies. `index.html` loads `geometry.js` and `car-lc12b1.js` with plain `<script>` tags. It must keep working from `file://` and `python3 -m http.server`, so no `fetch()` of local files and no ES modules.
- Keep `geometry.js` pure (no DOM). Put new maths there, and cover it in `tools/check.mjs`.
- Run `node tools/check.mjs` after touching `geometry.js` or `car-lc12b1.js`.
- Car measurements come from the manual. Don't invent numbers: if a value is a guess, say so in the keep-out's `note` and in `docs/MANUAL-MEASUREMENTS.md`. After changing a keep-out or the underlay calibration, run `python3 tools/proof_underlays.py` and look at the images.
- `car-lc12b1.js` must stay valid JSON after `globalThis.CAR_LC12B1 =`.
- The user works with the mouse. New editing features need a mouse path first; typed numbers are optional.
- Colours are CSS tokens on `:root` with dark-mode overrides in two places (media query and `[data-theme="dark"]`). Keep both in sync. Canvas colours are read from the tokens in `readColors()`.
- When opened as a claude.ai artifact the page also saves to the artifact `db` and offers files through `downloads`. Locally it uses localStorage and a normal download link. Keep both paths.
- `LC12B1 Ver 2.30.pdf` (39 MB) is gitignored. Don't commit it.

## Where things are

- Mouse tools, snapping and drawing planes: `index.html`, sections "hit testing and snapping", "tools" and "view interaction".
- Bend maths, clearance, print pack pages: `geometry.js` (`printPack`). Check page changes by rendering `printPackHTML` and looking at it.
- Strength check: maths in `geometry.js` (`frameModel`, `solveFrame`, `loadCases`, `strengthReport`, `braceSuggestions`, `strengthCheck`), tested against textbook beams in `tools/check.mjs`. UI in `index.html`, section "strength check (Strength button)": it only runs while the button is on. Material E / yield and the load factors are typical values, not measurements: say so wherever they appear.
- Schemas: `docs/DATA.md`.
