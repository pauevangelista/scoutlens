/// <reference types="node" />
// Unit tests for scoreSubmission. Inputs are synthetic; weights and thresholds are read from rubric.json,
// so these tests follow rubric changes and fail when a formula stops matching it.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { PhotoAnalysis } from '@/photo/analyze';
import { criterion, measurementFields, requiredPhotos, rubric } from '@/scoring/rubric';
import { scoreSubmission, type ScoringInput, type ScoreReport } from '@/scoring/score';

const LIGHTING = ['highlights', 'shadows', 'sharpness', 'cast'];

const GOOD_ANALYSIS: PhotoAnalysis = {
  highlightShare: 0,
  shadowShare: 0,
  sharpness: 1000,
  cast: { a: 0, b: 0, chroma: 0 },
};

/** Valid value for every measurement field: the middle of its range. */
const validMeasurements = () =>
  Object.fromEntries(measurementFields.map((f) => [f.id, String(Math.round((f.min + f.max) / 2))]));

function input(analysis: PhotoAnalysis | null, shortSidePx = 2000): ScoringInput {
  return {
    photos: Object.fromEntries(requiredPhotos.map((id) => [id, { shortSidePx, analysis }])),
    measurements: validMeasurements(),
  };
}

const byId = (report: ScoreReport, id: string) => report.criteria.find((c) => c.criterion.id === id)!;

const INPUTS: Record<string, ScoringInput> = {
  empty: { photos: {}, measurements: {} },
  complete: input(GOOD_ANALYSIS),
  'not measured on this device': input(null),
  'one small photo': { photos: { [requiredPhotos[0]]: { shortSidePx: 300, analysis: null } }, measurements: {} },
  'poor lighting': input({ highlightShare: 0.2, shadowShare: 0.05, sharpness: 30, cast: { a: 1, b: 9, chroma: Math.hypot(1, 9) } }),
  'no neutral area': input({ ...GOOD_ANALYSIS, cast: 'no-neutral' }),
  'typo in measurements': { ...input(GOOD_ANALYSIS), measurements: { ...validMeasurements(), waist: '6000' } },
};

describe('scoreSubmission', () => {
  for (const [name, inp] of Object.entries(INPUTS)) {
    test(`every criterion has a reason and a tip (${name})`, () => {
      const report = scoreSubmission(inp);
      assert.equal(report.criteria.length, rubric.criteria.length);
      for (const c of report.criteria) {
        assert.ok(c.reason.trim().length > 0, `${c.criterion.id} has no reason`);
        assert.ok(c.tip.trim().length > 0, `${c.criterion.id} has no tip`);
        if (c.score !== null) assert.ok(c.score >= 0 && c.score <= 100, `${c.criterion.id} score ${c.score}`);
      }
    });

    test(`total is the weighted mean of measured criteria (${name})`, () => {
      const report = scoreSubmission(inp);
      const counted = report.criteria.filter((c) => c.score !== null);
      const weight = counted.reduce((s, c) => s + c.criterion.weight, 0);
      const weighted = counted.reduce((s, c) => s + c.score! * c.criterion.weight, 0);
      assert.equal(report.countedWeight, weight);
      assert.equal(report.total, weight ? Math.round(weighted / weight) : 0);
    });
  }

  test('a complete, well-lit submission gets full marks', () => {
    const report = scoreSubmission(input(GOOD_ANALYSIS));
    assert.equal(report.total, 100);
    for (const c of report.criteria) assert.equal(c.score, 100, c.criterion.id);
    assert.equal(report.rubricVersion, rubric.version);
  });

  test('a null analysis leaves the lighting criteria unmeasured and out of countedWeight', () => {
    const report = scoreSubmission(input(null));
    for (const id of LIGHTING) {
      const c = byId(report, id);
      assert.equal(c.score, null, id);
      assert.equal(c.points, null, id);
      assert.equal(c.ok, false, id);
      assert.match(c.reason, /can't measure/, id);
    }
    const measuredWeight = rubric.criteria.filter((c) => !LIGHTING.includes(c.id)).reduce((s, c) => s + c.weight, 0);
    assert.equal(report.countedWeight, measuredWeight);
    // Everything that was measured is perfect, so the unmeasured criteria must not drag the total down.
    assert.equal(report.total, 100);
  });

  test('worked example: one 600 px photo, no lighting data, all measurements', () => {
    const half = criterion('res')!.params.targetShortSidePx / 2;
    const report = scoreSubmission({
      photos: { [requiredPhotos[0]]: { shortSidePx: half, analysis: null } },
      measurements: validMeasurements(),
    });
    const set = Math.round(100 / requiredPhotos.length);
    assert.equal(byId(report, 'set').score, set);
    assert.equal(byId(report, 'res').score, 50);
    assert.equal(byId(report, 'meas').score, 100);
    const w = (id: 'set' | 'res' | 'meas') => criterion(id)!.weight;
    const expected = Math.round((set * w('set') + 50 * w('res') + 100 * w('meas')) / (w('set') + w('res') + w('meas')));
    assert.equal(report.total, expected);
  });

  test("an out-of-range measurement is called out as a typo", () => {
    const meas = byId(scoreSubmission(INPUTS['typo in measurements']), 'meas');
    const n = measurementFields.length;
    assert.match(meas.reason, /Waist 6000 cm looks like a typo\./);
    assert.match(meas.reason, new RegExp(`You gave ${n - 1} of ${n} measurements`));
    assert.equal(meas.score, Math.round(((n - 1) / n) * 100));
    assert.equal(meas.tip, 'Check the value that looks off.');
    assert.equal(meas.ok, false);
  });

  test('a comma decimal separator is accepted', () => {
    const report = scoreSubmission({ ...input(GOOD_ANALYSIS), measurements: { ...validMeasurements(), waist: '62,5' } });
    assert.equal(byId(report, 'meas').score, 100);
  });

  test('cast reason names the direction of the tint', () => {
    const report = scoreSubmission(INPUTS['poor lighting']);
    assert.match(byId(report, 'cast').reason, /lean yellow/);
  });

  test("a photo with no neutral area leaves colour cast unmeasured", () => {
    const report = scoreSubmission(INPUTS['no neutral area']);
    assert.equal(byId(report, 'cast').score, null);
    assert.equal(report.countedWeight, rubric.criteria.reduce((s, c) => s + c.weight, 0) - criterion('cast')!.weight);
  });
});

describe('group attributes', () => {
  // Type-level: ScoringInput has exactly these keys. Adding gender, age band or any other field fails `tsc --noEmit`.
  type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
  const keysAreExact: Equal<keyof ScoringInput, 'photos' | 'measurements'> = true;

  test('are not part of ScoringInput', () => {
    assert.equal(keysAreExact, true);
    // @ts-expect-error gender is not a scoring input
    const typed: ScoringInput = { photos: {}, measurements: {}, gender: 'female' };
    assert.ok(typed);
  });

  test('extra fields smuggled in at runtime do not change the score', () => {
    const base = input(GOOD_ANALYSIS, 900);
    const withGroups = { ...base, gender: 'female', ageBand: '18-24' };
    assert.deepEqual(scoreSubmission(withGroups), scoreSubmission(base));
  });
});
