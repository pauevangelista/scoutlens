// Scoring functions, one per rubric criterion id. Weights and thresholds come from the rubric.
// Group attributes (gender, age band) are deliberately not part of ScoringInput.
import { slotCopy } from './photo-slots';
import { rubric, type Criterion, type LightParams, type MeasParams, type ResParams, type SetParams } from './rubric';

export type PhotoStats = {
  /** Shorter side of the image in pixels. */
  shortSidePx: number;
  /** Average relative luminance from 0 to 1, or null when it could not be measured on this platform. */
  luminance: number | null;
};

export type ScoringInput = {
  /** Keyed by photo slot id from the rubric. Missing key means no photo. */
  photos: Record<string, PhotoStats | undefined>;
  /** Raw text the person typed, keyed by measurement field id. */
  measurements: Record<string, string | undefined>;
};

/** Every score carries a reason and a tip. */
export type CriterionResult = {
  score: number;
  reason: string;
  tip: string;
  ok: boolean;
};

export type ScoredCriterion = CriterionResult & {
  criterion: Criterion;
  /** Points this criterion adds to the total. */
  points: number;
};

export type ScoreReport = {
  rubricVersion: string;
  total: number;
  criteria: ScoredCriterion[];
};

const NOTHING_TO_CHANGE = 'Nothing to change.';
const NO_PHOTOS: CriterionResult = {
  score: 0,
  reason: 'There are no photos to measure.',
  tip: 'Add at least one photo.',
  ok: false,
};

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const mean = (xs: number[]) => sum(xs) / xs.length;

function presentPhotos(input: ScoringInput): PhotoStats[] {
  return Object.values(input.photos).filter((p): p is PhotoStats => Boolean(p));
}

function scoreSet(params: SetParams, input: ScoringInput): CriterionResult {
  const have: string[] = [];
  const missing: string[] = [];
  for (const id of params.required) (input.photos[id] ? have : missing).push(slotCopy(id).name);
  const total = params.required.length;
  const score = Math.round((have.length / total) * 100);
  return {
    score,
    reason:
      `You added ${have.length} of ${total} standard photos` +
      (missing.length ? ` (missing: ${missing.join(', ').toLowerCase()}).` : '.'),
    tip: missing.length ? `Add your ${missing[0].toLowerCase()} photo.` : NOTHING_TO_CHANGE,
    ok: missing.length === 0,
  };
}

function scoreRes(params: ResParams, input: ScoringInput): CriterionResult {
  const sides = presentPhotos(input).map((p) => p.shortSidePx);
  if (!sides.length) return NO_PHOTOS;
  const target = params.targetShortSidePx;
  const score = Math.round(mean(sides.map((v) => Math.min(1, v / target))) * 100);
  const avg = Math.round(mean(sides));
  return {
    score,
    reason: `The shorter side of your photos averages ${avg.toLocaleString('en')} px. Full marks start at ${target.toLocaleString('en')} px.`,
    tip: score >= 100 ? NOTHING_TO_CHANGE : 'Use the original file from your camera, not a screenshot or a messaging-app copy.',
    ok: score >= 100,
  };
}

function luminanceScore(y: number, p: LightParams): number {
  if (y >= p.fullMin && y <= p.fullMax) return 100;
  if (y < p.fullMin) return Math.max(0, ((y - p.zeroLow) / (p.fullMin - p.zeroLow)) * 100);
  return Math.max(0, ((p.zeroHigh - y) / (p.zeroHigh - p.fullMax)) * 100);
}

function scoreLight(params: LightParams, input: ScoringInput): CriterionResult {
  const photos = presentPhotos(input);
  if (!photos.length) return NO_PHOTOS;
  const ys = photos.map((p) => p.luminance).filter((y): y is number => y !== null);
  if (!ys.length) {
    return {
      score: 0,
      reason: "Brightness couldn't be measured on this device yet, so this criterion scores 0.",
      tip: 'Use the web version of ScoutLens to get an exposure score.',
      ok: false,
    };
  }
  const score = Math.round(mean(ys.map((y) => luminanceScore(y, params))));
  const avg = mean(ys);
  // Wording bands follow the prototype: halfway into each falling edge counts as "a little".
  const word =
    avg < 0.2 ? 'too dark'
    : avg < params.fullMin ? 'a little dark'
    : avg <= params.fullMax ? 'well exposed'
    : avg <= 0.85 ? 'a little bright'
    : 'too bright';
  const tip =
    score >= 100 ? NOTHING_TO_CHANGE
    : avg < params.fullMin ? 'Stand facing a window in daylight.'
    : 'Move out of direct sun or switch off the flash.';
  return {
    score,
    reason: `Average brightness across your photos is ${Math.round(avg * 100)}%, which is ${word}.`,
    tip,
    ok: score >= 100,
  };
}

/** Parses typed text into a number, or null when empty. Accepts a comma as decimal separator. */
export function parseMeasurement(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  return parseFloat(raw.replace(',', '.'));
}

function scoreMeas(params: MeasParams, input: ScoringInput): CriterionResult {
  let valid = 0;
  const missing: string[] = [];
  const odd: string[] = [];
  for (const f of params.fields) {
    const v = parseMeasurement(input.measurements[f.id]);
    if (v === null || Number.isNaN(v)) missing.push(f.label.toLowerCase());
    else if (v < f.min || v > f.max) odd.push(`${f.label} ${v} ${f.unit}`);
    else valid++;
  }
  const n = params.fields.length;
  const parts = [`You gave ${valid} of ${n} measurements in a realistic range.`];
  if (odd.length) parts.push(`${odd.join(', ')} looks like a typo.`);
  return {
    score: Math.round((valid / n) * 100),
    reason: parts.join(' '),
    tip: missing.length ? `Add: ${missing.join(', ')}.` : odd.length ? 'Check the value that looks off.' : NOTHING_TO_CHANGE,
    ok: !missing.length && !odd.length,
  };
}

function run(c: Criterion, input: ScoringInput): CriterionResult {
  switch (c.id) {
    case 'set': return scoreSet(c.params, input);
    case 'res': return scoreRes(c.params, input);
    case 'light': return scoreLight(c.params, input);
    case 'meas': return scoreMeas(c.params, input);
  }
}

export function scoreSubmission(input: ScoringInput): ScoreReport {
  const totalWeight = sum(rubric.criteria.map((c) => c.weight));
  const criteria = rubric.criteria.map((criterion) => {
    const r = run(criterion, input);
    return { ...r, criterion, points: Math.round((r.score * criterion.weight) / 100) };
  });
  // Weighted mean, so the total stays out of 100 even if the weights don't add up to 100.
  const total = Math.round(sum(criteria.map((c) => c.score * c.criterion.weight)) / totalWeight);
  return { rubricVersion: rubric.version, total, criteria };
}
