/// <reference types="node" />
// Photo feedback must be the same whoever the person is. Synthetic inputs only.
// 1. Model card details (age, experience, measurements), division choices and the optional fairness answers
//    never change the photo feedback.
// 2. Synthetic photos that differ only in skin tone get the same photo statuses.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildFeedback, photoFeedback, type ModelCard, type PhotoInput } from '@/feedback/feedback';
import { analyzePixels, type PhotoAnalysis } from '@/photo/analyze';
import { criterion, experienceLevels, measurementFields, requiredPhotos } from '@/scoring/rubric';

const GOOD: PhotoAnalysis = { highlightShare: 0, shadowShare: 0, sharpness: 0.6, cast: { a: 0, b: 0, chroma: 0 } };
const all = (shortSidePx: number, analysis: PhotoAnalysis | null): PhotoInput =>
  Object.fromEntries(requiredPhotos.map((id) => [id, { shortSidePx, analysis }]));

const PHOTO_INPUTS: Record<string, PhotoInput> = {
  none: {},
  complete: all(2000, GOOD),
  'one photo': { [requiredPhotos[0]]: { shortSidePx: 800, analysis: GOOD } },
  'not measured on this device': all(2000, null),
  'poor lighting': all(900, { highlightShare: 0.2, shadowShare: 0.05, sharpness: 0.1, cast: { a: 1, b: 9, chroma: Math.hypot(1, 9) } }),
  'no neutral area': all(2000, { ...GOOD, cast: 'no-neutral' }),
};

const midMeasurements = Object.fromEntries(measurementFields.map((f) => [f.id, String(Math.round((f.min + f.max) / 2))]));
const lowMeasurements = Object.fromEntries(measurementFields.map((f) => [f.id, String(f.min)]));
const highMeasurements = Object.fromEntries(measurementFields.map((f) => [f.id, String(f.max)]));

const AGES = ['', '18', '22', '35', '60', '15'];
const EXPERIENCE = [null, ...experienceLevels.map((l) => l.id)];
const MEASUREMENTS = [{}, midMeasurements, lowMeasurements, highMeasurements];
// Smuggled in at runtime as extra fields, the way a careless caller might.
const GROUPS = [
  {},
  { gender: 'Woman', ageBand: '18 to 21' },
  { gender: 'Man', ageBand: '31 or older' },
  { gender: 'Non-binary', ageBand: '22 to 25' },
  { gender: 'Another description', divisions: { minoire: 'men' } },
];

function* cards(): Generator<ModelCard> {
  for (const age of AGES) for (const experience of EXPERIENCE) for (const measurements of MEASUREMENTS) yield { age, experience, measurements };
}

describe('photo feedback is the same across gender, age and experience', () => {
  for (const [name, photos] of Object.entries(PHOTO_INPUTS)) {
    test(`identical for every model card and group (${name})`, () => {
      const baseline = photoFeedback(photos);
      let n = 0;
      for (const card of cards()) {
        for (const group of GROUPS) {
          const input = { photos, card, ...group } as Parameters<typeof buildFeedback>[0];
          assert.deepEqual(buildFeedback(input).photos, baseline, `card ${JSON.stringify(card)} group ${JSON.stringify(group)}`);
          n++;
        }
      }
      assert.equal(n, AGES.length * EXPERIENCE.length * MEASUREMENTS.length * GROUPS.length);
    });
  }

  test('photoFeedback takes photos and nothing else', () => {
    type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
    const onlyPhotos: Equal<Parameters<typeof photoFeedback>, [photos: PhotoInput]> = true;
    assert.equal(onlyPhotos, true);
    // ModelCard has no gender, division or fairness field, and no weight or BMI.
    const cardKeys: Equal<keyof ModelCard, 'measurements' | 'age' | 'experience'> = true;
    assert.equal(cardKeys, true);
  });
});

describe('photo feedback is the same across skin tones', () => {
  // Approximate sRGB values of the 10 Monk Skin Tone scale swatches (Monk, 2019).
  const MONK: [number, number, number][] = [
    [246, 237, 228], [243, 231, 219], [247, 234, 208], [234, 218, 186], [215, 189, 150],
    [160, 126, 86], [130, 92, 67], [96, 65, 52], [58, 49, 42], [41, 36, 32],
  ];
  const W = 384;
  const H = 512;
  const params = {
    highlights: criterion('highlights')!.params,
    shadows: criterion('shadows')!.params,
    sharpness: criterion('sharpness')!.params,
    cast: criterion('cast')!.params,
  };

  /** Plain grey wall, a face-sized ellipse of skin, and optionally sharp-edged clothing below it. */
  function photo(skin: [number, number, number], clothing: boolean): Uint8ClampedArray {
    const rgba = new Uint8ClampedArray(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let c: [number, number, number] = [200, 200, 200];
        if (clothing && y > H * 0.6 && x > W * 0.25 && x < W * 0.75) c = ((x >> 2) + (y >> 2)) % 2 ? [40, 40, 60] : [180, 180, 200];
        if (((x + 0.5 - W / 2) / (W * 0.3)) ** 2 + ((y + 0.5 - H * 0.32) / (H * 0.25)) ** 2 <= 1) c = skin;
        rgba.set([...c, 255], (y * W + x) * 4);
      }
    }
    return rgba;
  }

  const statuses = (skin: [number, number, number], clothing: boolean) =>
    photoFeedback(all(2000, analyzePixels(photo(skin, clothing), W, H, params))).map((c) => `${c.id}:${c.status}`);

  test('same statuses for all 10 Monk tones when the photo has other detail (clothing)', () => {
    const baseline = statuses(MONK[0], true);
    for (const skin of MONK) assert.deepEqual(statuses(skin, true), baseline, `skin rgb(${skin.join(',')})`);
  });

  test('highlights, shadows and colour cast are the same for all 10 Monk tones on a plain photo', () => {
    const pick = (s: string[]) => s.filter((x) => /^(highlights|shadows|cast):/.test(x));
    const baseline = pick(statuses(MONK[0], false));
    for (const skin of MONK) assert.deepEqual(pick(statuses(skin, false)), baseline, `skin rgb(${skin.join(',')})`);
  });

  /** Box blur of the given radius along rows and columns, rounded back to 8 bits like a real photo. */
  function blurred(rgba: Uint8ClampedArray, r: number): Uint8ClampedArray {
    const pass = (src: Uint8ClampedArray, dx: number, dy: number) => {
      const dst = new Uint8ClampedArray(src.length);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          for (let c = 0; c < 4; c++) {
            let s = 0;
            for (let d = -r; d <= r; d++) {
              const xx = Math.min(W - 1, Math.max(0, x + d * dx));
              const yy = Math.min(H - 1, Math.max(0, y + d * dy));
              s += src[(yy * W + xx) * 4 + c];
            }
            dst[(y * W + x) * 4 + c] = Math.round(s / (2 * r + 1));
          }
        }
      }
      return dst;
    };
    return r === 0 ? rgba : pass(pass(rgba, 1, 0), 0, 1);
  }

  // Sharpness is Laplacian energy over gradient energy, so face-to-wall contrast cancels out. With raw Laplacian
  // variance, light skin on a light wall used to get "Improve" where dark skin got "Good" at the same focus.
  for (const r of [0, 1, 2, 4]) {
    test(`sharpness status is the same for all 10 Monk tones on a plain photo (blur radius ${r})`, () => {
      const sharp = (skin: [number, number, number]) => {
        const a = analyzePixels(blurred(photo(skin, false), r), W, H, params);
        const status = photoFeedback(all(2000, a)).find((c) => c.id === 'sharpness')!.status;
        return { status, value: a.sharpness! };
      };
      const baseline = sharp(MONK[0]);
      if (r === 0) assert.equal(baseline.status, 'good');
      if (r === 4) assert.equal(baseline.status, 'improve');
      for (const skin of MONK) {
        const s = sharp(skin);
        assert.equal(s.status, baseline.status, `skin rgb(${skin.join(',')}): ${s.value} vs ${baseline.value}`);
      }
    });
  }
});
