// Scoring functions, one per rubric criterion id. Weights and thresholds come from the rubric.
// Group attributes (gender, age band) are deliberately not part of ScoringInput.
import type { Cast, PhotoAnalysis } from '@/photo/analyze';

import { slotCopy } from './photo-slots';
import {
  rubric,
  type CastParams,
  type ClipParams,
  type Criterion,
  type MeasParams,
  type ResParams,
  type SetParams,
  type SharpnessParams,
} from './rubric';

export type PhotoStats = {
  /** Shorter side of the image in pixels. */
  shortSidePx: number;
  /** Lighting measurements, or null when this platform cannot read pixels. */
  analysis: PhotoAnalysis | null;
};

export type ScoringInput = {
  /** Keyed by photo slot id from the rubric. Missing key means no photo. */
  photos: Record<string, PhotoStats | undefined>;
  /** Raw text the person typed, keyed by measurement field id. */
  measurements: Record<string, string | undefined>;
};

/**
 * Every result carries a reason and a tip. A null score means the criterion could not be measured;
 * it is shown with its reason and left out of the total.
 */
export type CriterionResult = {
  score: number | null;
  reason: string;
  tip: string;
  ok: boolean;
};

export type ScoredCriterion = CriterionResult & {
  criterion: Criterion;
  /** Points this criterion adds to the total, or null when not measured. */
  points: number | null;
};

export type ScoreReport = {
  rubricVersion: string;
  total: number;
  /** Sum of the weights that counted towards the total. */
  countedWeight: number;
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

function presentPhotos(input: ScoringInput): { slot: string; stats: PhotoStats }[] {
  return Object.entries(input.photos)
    .filter((e): e is [string, PhotoStats] => Boolean(e[1]))
    .map(([slot, stats]) => ({ slot, stats }));
}

function photoName(slot: string): string {
  return slotCopy(slot).name.toLowerCase();
}

function notMeasuredOnDevice(what: string): CriterionResult {
  return {
    score: null,
    reason: `This device can't measure ${what} yet, so it is not counted in your total.`,
    tip: 'Use the web version of ScoutLens to get this score.',
    ok: false,
  };
}

/** 100 up to fullMax, falling linearly to 0 at zeroAt. */
function falloff(value: number, fullMax: number, zeroAt: number): number {
  if (value <= fullMax) return 100;
  if (value >= zeroAt) return 0;
  return ((zeroAt - value) / (zeroAt - fullMax)) * 100;
}

function percent(share: number): string {
  const p = share * 100;
  return `${p > 0 && p < 1 ? p.toFixed(1) : Math.round(p)}%`;
}

/** Per-photo values for one lighting measurement, skipping photos where it is null. */
function perPhoto<T>(input: ScoringInput, pick: (a: PhotoAnalysis) => T | null) {
  const photos = presentPhotos(input);
  const values = photos.flatMap(({ slot, stats }) => {
    const v = stats.analysis ? pick(stats.analysis) : null;
    return v === null ? [] : [{ slot, value: v }];
  });
  return { photoCount: photos.length, values };
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
  const sides = presentPhotos(input).map((p) => p.stats.shortSidePx);
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

function scoreClipping(
  params: ClipParams,
  input: ScoringInput,
  kind: 'highlights' | 'shadows',
): CriterionResult {
  const { photoCount, values } = perPhoto(input, (a) => (kind === 'highlights' ? a.highlightShare : a.shadowShare));
  if (!photoCount) return NO_PHOTOS;
  const label = kind === 'highlights' ? 'clipped highlights' : 'clipped shadows';
  if (!values.length) return notMeasuredOnDevice(label);

  const scores = values.map((v) => falloff(v.value, params.fullMax, params.zeroAt));
  const score = Math.round(mean(scores));
  const worst = values.reduce((w, v) => (v.value > w.value ? v : w));
  const what = kind === 'highlights' ? 'blown out to pure white' : 'crushed to pure black';
  const parts = [
    `On average ${percent(mean(values.map((v) => v.value)))} of each photo is ${what}. Up to ${percent(params.fullMax)} gets full marks.`,
  ];
  if (values.length > 1 && score < 100) parts.push(`Your ${photoName(worst.slot)} photo has the most (${percent(worst.value)}).`);
  const fix =
    kind === 'highlights'
      ? 'out of direct sun, or with the flash switched off'
      : 'facing the light source, or add a second lamp or a white reflector';
  return {
    score,
    reason: parts.join(' '),
    tip: score >= 100 ? NOTHING_TO_CHANGE : `Retake your ${photoName(worst.slot)} photo ${fix}.`,
    ok: score >= 100,
  };
}

/** 0 at zeroBelow, 100 from fullAbove, interpolated on a log scale because edge strength spans orders of magnitude. */
function sharpnessScore(v: number, p: SharpnessParams): number {
  if (v <= p.zeroBelow) return 0;
  if (v >= p.fullAbove) return 100;
  return ((Math.log(v) - Math.log(p.zeroBelow)) / (Math.log(p.fullAbove) - Math.log(p.zeroBelow))) * 100;
}

function scoreSharpness(params: SharpnessParams, input: ScoringInput): CriterionResult {
  const { photoCount, values } = perPhoto(input, (a) => a.sharpness);
  if (!photoCount) return NO_PHOTOS;
  if (!values.length) return notMeasuredOnDevice('sharpness');

  const score = Math.round(mean(values.map((v) => sharpnessScore(v.value, params))));
  const avg = Math.round(mean(values.map((v) => v.value)));
  const word = score >= 100 ? 'sharp' : score >= 50 ? 'slightly soft' : 'blurry';
  const worst = values.reduce((w, v) => (v.value < w.value ? v : w));
  const parts = [
    `The sharpest parts of your photos reach an edge strength of ${avg.toLocaleString('en')} on average. Full marks start at ${params.fullAbove}, so they look ${word}.`,
  ];
  if (values.length > 1 && score < 100) parts.push(`Your ${photoName(worst.slot)} photo is the least sharp.`);
  return {
    score,
    reason: parts.join(' '),
    tip:
      score >= 100
        ? NOTHING_TO_CHANGE
        : `Retake your ${photoName(worst.slot)} photo: hold the phone still or use a timer, tap the person to focus, and wipe the lens.`,
    ok: score >= 100,
  };
}

function castDirection(c: Pick<Cast, 'a' | 'b'>): 'yellow' | 'blue' | 'magenta' | 'green' {
  if (Math.abs(c.b) >= Math.abs(c.a)) return c.b >= 0 ? 'yellow' : 'blue';
  return c.a >= 0 ? 'magenta' : 'green';
}

const CAST_TIPS = {
  yellow: 'Switch off warm indoor bulbs and shoot by daylight from a window.',
  blue: 'Avoid open shade and evening light; shoot by daylight from a window.',
  green: 'Avoid fluorescent tube lighting; shoot by daylight from a window.',
  magenta: 'Switch off coloured or LED mood lights; shoot by daylight from a window.',
};

function scoreCast(params: CastParams, input: ScoringInput): CriterionResult {
  const { photoCount, values } = perPhoto(input, (a) => a.cast);
  if (!photoCount) return NO_PHOTOS;
  if (!values.length) return notMeasuredOnDevice('colour cast');

  const measured = values.filter((v): v is { slot: string; value: Cast } => v.value !== 'no-neutral');
  const skipped = values.length - measured.length;
  if (!measured.length) {
    return {
      score: null,
      reason:
        "None of your photos has a plain white or grey area to judge colour from, or the tint is too strong to tell apart from coloured surfaces. It is not counted in your total.",
      tip: 'Use a plain white or light grey background, lit by daylight.',
      ok: false,
    };
  }

  const score = Math.round(mean(measured.map((v) => falloff(v.value.chroma, params.fullMax, params.zeroAt))));
  const avg = { a: mean(measured.map((v) => v.value.a)), b: mean(measured.map((v) => v.value.b)) };
  const strength = Math.hypot(avg.a, avg.b);
  const dir = castDirection(avg);
  const parts = [
    score >= 100
      ? `The plain areas of your photos are close to neutral grey (a tint of ${strength.toFixed(1)}; up to ${params.fullMax} counts as neutral).`
      : `The plain areas of your photos lean ${dir} by ${strength.toFixed(1)}. Up to ${params.fullMax} counts as neutral.`,
  ];
  if (skipped) {
    parts.push(`${skipped} photo${skipped > 1 ? 's' : ''} had no plain area to judge and ${skipped > 1 ? 'were' : 'was'} left out.`);
  }
  return {
    score,
    reason: parts.join(' '),
    tip: score >= 100 ? NOTHING_TO_CHANGE : CAST_TIPS[dir],
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
    case 'highlights': return scoreClipping(c.params, input, 'highlights');
    case 'shadows': return scoreClipping(c.params, input, 'shadows');
    case 'sharpness': return scoreSharpness(c.params, input);
    case 'cast': return scoreCast(c.params, input);
    case 'meas': return scoreMeas(c.params, input);
  }
}

export function scoreSubmission(input: ScoringInput): ScoreReport {
  const criteria = rubric.criteria.map((criterion) => {
    const r = run(criterion, input);
    return { ...r, criterion, points: r.score === null ? null : Math.round((r.score * criterion.weight) / 100) };
  });
  // Weighted mean over the criteria that could be measured, so the total stays out of 100.
  const counted = criteria.filter((c): c is ScoredCriterion & { score: number } => c.score !== null);
  const countedWeight = sum(counted.map((c) => c.criterion.weight));
  const total = countedWeight ? Math.round(sum(counted.map((c) => c.score * c.criterion.weight)) / countedWeight) : 0;
  return { rubricVersion: rubric.version, total, countedWeight, criteria };
}
