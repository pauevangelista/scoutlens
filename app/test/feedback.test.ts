/// <reference types="node" />
// Unit tests for the user-facing feedback: statuses, reasons, tips and guide links. Synthetic inputs only.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import rawRubric from '../../rubric.json';
import { buildFeedback, detailsFeedback, photoFeedback, type ModelCard, type PhotoInput } from '@/feedback/feedback';
import { GUIDE_IDS } from '@/feedback/guide';
import type { PhotoAnalysis } from '@/photo/analyze';
import { experienceLevels, measurementFields, requiredPhotos, rubric } from '@/scoring/rubric';

const GOOD: PhotoAnalysis = { highlightShare: 0, shadowShare: 0, sharpness: 0.6, cast: { a: 0, b: 0, chroma: 0 } };
const all = (shortSidePx: number, analysis: PhotoAnalysis | null): PhotoInput =>
  Object.fromEntries(requiredPhotos.map((id) => [id, { shortSidePx, analysis }]));
const QUALITY = ['res', 'highlights', 'shadows', 'sharpness', 'cast'];

const validCard = (): ModelCard => ({
  measurements: Object.fromEntries(measurementFields.map((f) => [f.id, String(Math.round((f.min + f.max) / 2))])),
  age: '24',
  experience: experienceLevels[0].id,
});
const emptyCard: ModelCard = { measurements: {}, age: '', experience: null };

const INPUTS: Record<string, { photos: PhotoInput; card: ModelCard }> = {
  empty: { photos: {}, card: emptyCard },
  complete: { photos: all(2000, GOOD), card: validCard() },
  'not measured': { photos: all(2000, null), card: validCard() },
  'poor lighting': {
    photos: all(600, { highlightShare: 0.2, shadowShare: 0.05, sharpness: 0.1, cast: { a: 1, b: 9, chroma: Math.hypot(1, 9) } }),
    card: { ...validCard(), measurements: { waist: '6000' }, age: '16' },
  },
};

describe('feedback', () => {
  for (const [name, input] of Object.entries(INPUTS)) {
    const fb = buildFeedback(input);
    const checks = [...fb.photos, ...fb.details];

    test(`every check has a status, a reason and a tip (${name})`, () => {
      for (const c of checks) {
        assert.ok(['good', 'improve', 'missing', 'not-measured'].includes(c.status), c.id);
        assert.ok(c.reason.trim(), `${c.id} has no reason`);
        assert.ok(c.tip.trim(), `${c.id} has no tip`);
        if (c.guide !== null) assert.ok(GUIDE_IDS.includes(c.guide), `${c.id} links to unknown guide section "${c.guide}"`);
      }
    });

    test(`no score, points or totals reach the user (${name})`, () => {
      for (const c of checks) {
        const text = `${c.name} ${c.reason} ${c.tip}`;
        assert.doesNotMatch(text, /\bscor|\bpoints?\b|\btotal\b|full marks|\/ ?100|out of 100/i, `${c.id}: ${text}`);
      }
    });
  }

  test('photos are grouped first, one row per standard photo, then the photo quality checks', () => {
    const ids = photoFeedback({}).map((c) => c.id);
    assert.deepEqual(ids, [...requiredPhotos.map((s) => `photo-${s}`), ...QUALITY]);
  });

  test('no photos: every photo check is Missing', () => {
    for (const c of photoFeedback({})) assert.equal(c.status, 'missing', c.id);
  });

  test('a complete, well-lit set is Good everywhere', () => {
    for (const c of photoFeedback(all(2000, GOOD))) assert.equal(c.status, 'good', c.id);
    for (const c of detailsFeedback(validCard())) assert.equal(c.status, 'good', c.id);
  });

  test('no pixel data on this device: lighting checks are Not measured, the rest still judged', () => {
    const fb = photoFeedback(all(2000, null));
    for (const c of fb) {
      const expected = ['highlights', 'shadows', 'sharpness', 'cast'].includes(c.id) ? 'not-measured' : 'good';
      assert.equal(c.status, expected, c.id);
    }
  });

  test('low resolution and poor lighting are Improve, with a specific tip', () => {
    for (const c of photoFeedback(INPUTS['poor lighting'].photos).filter((c) => QUALITY.includes(c.id))) {
      assert.equal(c.status, 'improve', c.id);
      assert.notEqual(c.tip, 'Nothing to change.', c.id);
    }
  });

  test('one photo: the other slots are Missing with a how-to tip', () => {
    const fb = photoFeedback({ [requiredPhotos[0]]: { shortSidePx: 2000, analysis: GOOD } });
    for (const slot of requiredPhotos.slice(1)) {
      const c = fb.find((x) => x.id === `photo-${slot}`)!;
      assert.equal(c.status, 'missing');
      assert.match(c.tip, /^Take it like this:/);
    }
  });

  test('details: empty is Missing, a typo is Improve, under 18 is flagged', () => {
    for (const c of detailsFeedback(emptyCard)) assert.equal(c.status, 'missing', c.id);
    const d = detailsFeedback(INPUTS['poor lighting'].card);
    assert.equal(d.find((c) => c.id === 'waist')!.status, 'improve');
    assert.match(d.find((c) => c.id === 'waist')!.reason, /may be a typo/);
    const age = d.find((c) => c.id === 'age')!;
    assert.equal(age.status, 'improve');
    assert.match(age.reason, new RegExp(`${rubric.modelCard.age.min} and over`));
  });

  test('size is never judged: the smallest and largest accepted values are both Good', () => {
    for (const pick of ['min', 'max'] as const) {
      const card = { ...validCard(), measurements: Object.fromEntries(measurementFields.map((f) => [f.id, String(f[pick])])) };
      for (const c of detailsFeedback(card)) assert.equal(c.status, 'good', `${c.id} at ${pick}`);
    }
  });

  test('the rubric and model card never collect weight or BMI', () => {
    // Field ids anywhere in the rubric, plus every model card check. A criterion's numeric "weight" key is its
    // internal importance in the composite, not a body measurement, so keys are not checked, only ids.
    const ids: string[] = [];
    const walk = (v: unknown): void => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) (k === 'id' ? ids.push(String(x)) : walk(x));
    };
    walk(rawRubric);
    ids.push(...detailsFeedback(emptyCard).map((c) => c.id), ...measurementFields.map((f) => f.label));
    for (const id of ids) assert.doesNotMatch(id, /weight|bmi|kg|lb/i, id);
  });

  test('every rubric criterion links to a guide section', () => {
    for (const c of rubric.criteria) assert.ok(GUIDE_IDS.includes(c.guide), `${c.id} -> ${c.guide}`);
  });
});
