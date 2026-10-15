# Sharpness check: contrast-independent measure

October 2026. Replaces Laplacian variance in `app/src/photo/analyze.ts` (criterion `sharpness` in `rubric.json`).

## Why

The old measure was the variance of the Laplacian over the sharpest tiles. That variance grows with the square of
edge contrast, so it measured "how strong are the edges" as much as "how sharp are they". The fairness test
(`app/test/fairness.test.ts`) uses a synthetic plain photo: grey wall, a face-sized ellipse of skin, no other detail.
On that photo, Monk skin tones 1–5 (close to the wall's brightness) got **Improve** and tones 6–10 got **Good** at
identical focus. That breaks the hard rule that photo feedback must not depend on skin tone, so the test had been
kept as a visible `todo`.

## What changed

Per tile of an 8 × 8 grid, after a light `[1 2 1]` blur of the greyscale image:

    sharpness = Σ Laplacian² / Σ |gradient|²

- **Contrast cancels.** Both sums scale with the square of edge contrast, so the ratio depends only on the edge
  *profile* (how fast it changes), not on how different the two sides are. An ideal step gives about 0.67. A
  1-pixel Gaussian blur gives about 0.3, and 2 pixels about 0.1, at the 512 px analysis size.
- **Which edges.** Tiles are ranked by gradient energy and the top 10 % (`topTileShare`) are pooled. Contrast only
  decides *where* to look, never *how sharp* the result is.
- **Noise floor.** Sensor noise adds the same energy everywhere and makes faint edges look sharp, which would flip
  the bias towards light skin on a light wall. The per-pixel noise energy is read from the flattest 25 % of tiles
  (`noiseTileShare`, normally the plain background) and subtracted before dividing.
- **Rounding.** The `[1 2 1]` pre-blur stops 8-bit rounding steps on faint, blurred edges from reading as detail.

New thresholds: `zeroBelow` 0.05 (about a 3 px Gaussian blur), `fullAbove` 0.40 (Good up to about a 0.6 px blur).
The reason text now reports "edge sharpness" with two decimals.

## Evidence (synthetic only)

- All 10 Monk tones on the plain photo give the same status at box-blur radius 0, 1, 2 and 4 (Good, then Improve
  for the blurred ones). Values agree to within about 0.01, except tone 5 at radius 4 (0.10 vs 0.08), which is
  still clearly Improve.
- A step edge gives the same value at contrasts from 10 to 150 grey levels (`analyze.test.ts`).
- A crisp edge still scores above the same edge with a 9 px blur.

## Known limits

- With added noise (σ = 2 levels) and strong blur, Monk 5 drifts upward. Its face is only about 8 grey levels from
  the 200-grey wall, below what any measure can judge reliably. Real photos also have hair, eyes and clothing
  edges, which dominate the top tiles.
- Fine texture (hair, patterned clothing) reads sharper than a single large edge at the same focus. This applies
  to every skin tone alike.
- Thresholds are calibrated on synthetic blur only. They need checking against scout judgements on consented
  real photos before the thesis analysis.
