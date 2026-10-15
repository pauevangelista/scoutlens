/// <reference types="node" />
// Unit tests for the pixel analysis behind the lighting criteria. Synthetic images only, built in memory.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { analyzePixels } from '@/photo/analyze';
import { criterion } from '@/scoring/rubric';

type RGB = [number, number, number];

const highlights = criterion('highlights')!.params;
const shadows = criterion('shadows')!.params;
const sharpness = criterion('sharpness')!.params;
const cast = criterion('cast')!.params;

function image(width: number, height: number, colourAt: (x: number, y: number) => RGB): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) rgba.set([...colourAt(x, y), 255], (y * width + x) * 4);
  }
  return rgba;
}

const solid = (width: number, height: number, c: RGB) => image(width, height, () => c);

describe('clipped highlights and shadows', () => {
  test('shares are exact on a known image', () => {
    // 10 x 10 = 100 pixels: 7 white, 3 black, the rest mid grey.
    const rgba = image(10, 10, (x, y) => {
      const i = y * 10 + x;
      if (i < 7) return [255, 255, 255];
      if (i < 10) return [0, 0, 0];
      return [128, 128, 128];
    });
    const r = analyzePixels(rgba, 10, 10, { highlights, shadows });
    assert.equal(r.highlightShare, 0.07);
    assert.equal(r.shadowShare, 0.03);
  });

  test('a highlight needs one channel at clipLevel; a shadow needs every channel at clipLevel', () => {
    const hi = highlights.clipLevel;
    const lo = shadows.clipLevel;
    const row: RGB[] = [
      [hi, 0, 128], // highlight: one channel reaches the level
      [hi - 1, hi - 1, hi - 1], // neither
      [lo, lo, lo], // shadow: every channel at the level
      [lo, lo, lo + 1], // neither: one channel above it
    ];
    const r = analyzePixels(image(4, 1, (x) => row[x]), 4, 1, { highlights, shadows });
    assert.equal(r.highlightShare, 1 / 4);
    assert.equal(r.shadowShare, 1 / 4);
  });

  test('criteria without params come back as null', () => {
    const r = analyzePixels(solid(4, 4, [128, 128, 128]), 4, 4, {});
    assert.deepEqual(r, { highlightShare: null, shadowShare: null, sharpness: null, cast: null });
  });
});

describe('sharpness', () => {
  const W = 64;
  const H = 64;
  const edge = (x: number) => (x < W / 2 ? 50 : 200);
  const crisp = image(W, H, (x) => [edge(x), edge(x), edge(x)]);
  // The same edge with a 9-pixel horizontal box blur.
  const blurred = image(W, H, (x) => {
    let s = 0;
    for (let d = -4; d <= 4; d++) s += edge(Math.min(W - 1, Math.max(0, x + d)));
    const v = Math.round(s / 9);
    return [v, v, v];
  });

  test('a crisp edge scores higher than the same edge blurred', () => {
    const a = analyzePixels(crisp, W, H, { sharpness }).sharpness!;
    const b = analyzePixels(blurred, W, H, { sharpness }).sharpness!;
    assert.ok(a > b, `crisp ${a} should beat blurred ${b}`);
    assert.ok(a >= sharpness.fullAbove, `crisp edge ${a} should reach full marks (${sharpness.fullAbove})`);
  });

  test('edge contrast does not change the value', () => {
    const step = (lo: number, hi: number) => image(W, H, (x) => (x < W / 2 ? [lo, lo, lo] : [hi, hi, hi]));
    const strong = analyzePixels(step(50, 200), W, H, { sharpness }).sharpness!;
    for (const [lo, hi] of [[190, 200], [120, 140], [10, 40], [200, 238]]) {
      const v = analyzePixels(step(lo, hi), W, H, { sharpness }).sharpness!;
      assert.ok(Math.abs(v - strong) < 1e-6, `edge ${lo} to ${hi}: ${v} vs ${strong}`);
    }
  });

  test('a flat image has zero edge sharpness', () => {
    assert.equal(analyzePixels(solid(W, H, [128, 128, 128]), W, H, { sharpness }).sharpness, 0);
  });
});

describe('colour cast', () => {
  const W = 120;
  const H = 160;
  const castOf = (rgba: Uint8ClampedArray) => analyzePixels(rgba, W, H, { cast }).cast;

  test('a grey background reads as neutral', () => {
    const c = castOf(solid(W, H, [200, 200, 200]));
    assert.ok(c && c !== 'no-neutral');
    assert.ok(c.chroma < 0.5, `chroma ${c.chroma}`);
  });

  const tints: { name: string; rgb: RGB; axis: 'a' | 'b'; sign: 1 | -1 }[] = [
    { name: 'yellow', rgb: [205, 200, 175], axis: 'b', sign: 1 },
    { name: 'blue', rgb: [185, 195, 220], axis: 'b', sign: -1 },
    { name: 'green', rgb: [185, 205, 185], axis: 'a', sign: -1 },
    { name: 'magenta', rgb: [210, 190, 210], axis: 'a', sign: 1 },
  ];
  for (const t of tints) {
    test(`${t.name}-tinted grey leans ${t.name}`, () => {
      const c = castOf(solid(W, H, t.rgb));
      assert.ok(c && c !== 'no-neutral');
      const other = t.axis === 'a' ? 'b' : 'a';
      // Same rule the score uses to name the direction: the larger of |a*| and |b*|, then its sign.
      assert.ok(Math.abs(c[t.axis]) > Math.abs(c[other]), JSON.stringify(c));
      assert.equal(Math.sign(c[t.axis]), t.sign, JSON.stringify(c));
      assert.ok(c.chroma > cast.fullMax, `a visible tint should be above fullMax: ${c.chroma}`);
    });
  }

  test("a saturated orange edge band gives 'no-neutral'", () => {
    assert.equal(castOf(solid(W, H, [255, 140, 0])), 'no-neutral');
  });

  test('a face-sized skin ellipse gives the same result for light, mid and dark skin', () => {
    const grey: RGB = [200, 200, 200];
    // Large enough to reach into the edge band (about 28% of band pixels), as a close-up would.
    const withFace = (skin: RGB) =>
      image(W, H, (x, y) => (((x + 0.5 - 60) / 55) ** 2 + ((y + 0.5 - 80) / 75) ** 2 <= 1 ? skin : grey));
    const skins: RGB[] = [
      [240, 215, 200],
      [198, 150, 120],
      [110, 75, 55],
    ];
    const baseline = castOf(solid(W, H, grey));
    assert.ok(baseline && baseline !== 'no-neutral');
    for (const skin of skins) {
      const c = castOf(withFace(skin));
      const label = `skin rgb(${skin.join(',')}): ${JSON.stringify(c)}`;
      assert.ok(c && c !== 'no-neutral', label);
      // Equal up to float summation order (dark skin falls below minLightness, so fewer pixels are averaged).
      for (const k of ['a', 'b', 'chroma'] as const) assert.ok(Math.abs(c[k] - baseline[k]) < 1e-9, label);
    }
  });
});
