// Turns the internal rubric scores into what users see: per check a status, a reason and a tip. No numbers.
// Photo feedback takes photos only. The model card, the chosen divisions and the optional fairness answers
// are never passed to it, so it cannot differ by gender, age, experience or anything else about the person.
import { slotCopy } from '@/scoring/photo-slots';
import { experienceLevels, measurementFields, requiredPhotos, rubric } from '@/scoring/rubric';
import { parseMeasurement, scoreSubmission, type PhotoStats } from '@/scoring/score';

export type Status = 'good' | 'improve' | 'missing' | 'not-measured';

export const STATUS_LABEL: Record<Status, string> = {
  good: 'Good',
  improve: 'Improve',
  missing: 'Missing',
  'not-measured': 'Not measured',
};

export type Check = {
  id: string;
  name: string;
  status: Status;
  reason: string;
  tip: string;
  /** Section of the "How to take digitals" guide the tip links to, or null when no section applies. */
  guide: string | null;
};

/** Keyed by photo slot id from the rubric. Missing key means no photo. */
export type PhotoInput = Record<string, PhotoStats | undefined>;

/** What the applicant typed on the model card. There is no weight field and no BMI. */
export type ModelCard = {
  /** Raw text keyed by measurement field id from the rubric. */
  measurements: Record<string, string | undefined>;
  age: string;
  /** Experience level id from the rubric, or null when not chosen. */
  experience: string | null;
};

export type Feedback = { photos: Check[]; details: Check[] };

const NOTHING_TO_CHANGE = 'Nothing to change.';
const MEASURING = rubric.criteria.find((c) => c.id === 'meas')?.guide ?? 'measuring';

const MEASURE_TIPS: Record<string, string> = {
  height: 'Measure without shoes, heels against a wall.',
  chest: 'Measure around the fullest part, under the arms.',
  waist: 'Measure around your natural waist, breathing normally.',
  hips: 'Measure around the fullest part of your hips, feet together.',
  shoe: 'Add the EU size you usually wear.',
};

export function photoFeedback(photos: PhotoInput): Check[] {
  const setGuide = rubric.criteria.find((c) => c.id === 'set')?.guide ?? 'shots';
  const slots: Check[] = requiredPhotos.map((slot) => {
    const copy = slotCopy(slot);
    const have = Boolean(photos[slot]);
    return {
      id: `photo-${slot}`,
      name: copy.name,
      status: have ? 'good' : 'missing',
      reason: have ? `Your ${copy.name.toLowerCase()} photo is added.` : `You haven't added a ${copy.name.toLowerCase()} photo yet.`,
      tip: have ? NOTHING_TO_CHANGE : `Take it like this: ${copy.tip.charAt(0).toLowerCase()}${copy.tip.slice(1)}`,
      guide: setGuide,
    };
  });

  const anyPhoto = Object.values(photos).some(Boolean);
  // Measurements are not an input to any photo check; pass none so the report depends on photos alone.
  const report = scoreSubmission({ photos, measurements: {} });
  const quality: Check[] = report.criteria
    .filter((r) => r.criterion.id !== 'set' && r.criterion.id !== 'meas')
    .map((r) => {
      const status: Status = !anyPhoto
        ? 'missing'
        : r.score === null
          ? 'not-measured'
          : r.score >= rubric.feedback.goodFrom
            ? 'good'
            : 'improve';
      return {
        id: r.criterion.id,
        name: r.criterion.name,
        status,
        reason: r.reason,
        tip: status === 'good' ? NOTHING_TO_CHANGE : r.tip,
        guide: r.criterion.guide,
      };
    });

  return [...slots, ...quality];
}

function numberCheck(
  id: string,
  label: string,
  raw: string | undefined,
  range: { min: number; max: number; unit: string },
  howTo: string,
): Check {
  const v = parseMeasurement(raw);
  const base = { id, name: label, guide: MEASURING };
  if (v === null) return { ...base, status: 'missing', reason: 'Not filled in yet.', tip: howTo };
  if (Number.isNaN(v) || v < range.min || v > range.max) {
    return {
      ...base,
      status: 'improve',
      reason: `"${raw!.trim()}" is outside the range we accept for ${label.toLowerCase()} (${range.min} to ${range.max} ${range.unit}), so it may be a typo.`,
      tip: `Check the number and that it is in ${range.unit}.`,
    };
  }
  return { ...base, status: 'good', reason: `Added: ${v} ${range.unit}.`, tip: NOTHING_TO_CHANGE };
}

export function detailsFeedback(card: ModelCard): Check[] {
  const measurements = measurementFields.map((f) =>
    numberCheck(f.id, f.label, card.measurements[f.id], f, MEASURE_TIPS[f.id] ?? `Add it in ${f.unit}.`),
  );

  const ageField = rubric.modelCard.age;
  let age = numberCheck('age', ageField.label, card.age, ageField, 'Add your age in years.');
  const ageValue = parseMeasurement(card.age);
  if (ageValue !== null && ageValue < ageField.min) {
    age = {
      ...age,
      reason: `ScoutLens is for people ${ageField.min} and over.`,
      tip: 'Check the age you entered.',
    };
  }

  const level = experienceLevels.find((l) => l.id === card.experience);
  const experience: Check = {
    id: 'experience',
    name: 'Experience',
    status: level ? 'good' : 'missing',
    reason: level ? `Added: ${level.label.toLowerCase()}.` : 'Not chosen yet.',
    tip: level ? NOTHING_TO_CHANGE : 'Choose the option closest to your experience. Every level is welcome.',
    guide: null,
  };

  return [...measurements, age, experience];
}

export function buildFeedback(input: { photos: PhotoInput; card: ModelCard }): Feedback {
  return { photos: photoFeedback(input.photos), details: detailsFeedback(input.card) };
}
