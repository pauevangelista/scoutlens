// Loads and checks the rubric. Criteria, weights and thresholds come only from rubric.json.
import rawRubric from '../../../rubric.json';

export type MeasurementField = {
  id: string;
  label: string;
  min: number;
  max: number;
  unit: string;
};

export type SetParams = { required: string[] };
export type ResParams = { targetShortSidePx: number };
export type ClipParams = { clipLevel: number; fullMax: number; zeroAt: number };
export type SharpnessParams = {
  tileGrid: number;
  topTileShare: number;
  noiseTileShare: number;
  zeroBelow: number;
  fullAbove: number;
};
export type CastParams = {
  borderShare: number;
  neutralShare: number;
  minLightness: number;
  maxLightness: number;
  maxNeutralChroma: number;
  fullMax: number;
  zeroAt: number;
};
export type MeasParams = { fields: MeasurementField[] };

/** Shared fields. `guide` is the section of the "How to take digitals" guide that the tip links to. */
type Base = { name: string; weight: number; description: string; guide: string };

export type Criterion = Base &
  (
    | { id: 'set'; params: SetParams }
    | { id: 'res'; params: ResParams }
    | { id: 'highlights'; params: ClipParams }
    | { id: 'shadows'; params: ClipParams }
    | { id: 'sharpness'; params: SharpnessParams }
    | { id: 'cast'; params: CastParams }
    | { id: 'meas'; params: MeasParams }
  );

export type ExperienceLevel = { id: string; label: string };

export type Rubric = {
  version: string;
  status: string;
  note: string;
  analysis: { shortSidePx: number };
  /** How internal scores become the statuses users see. */
  feedback: { goodFrom: number };
  /** Model card fields that are not measurements. Weight and BMI are deliberately absent. */
  modelCard: {
    age: { label: string; min: number; max: number; unit: string };
    experienceLevels: ExperienceLevel[];
  };
  criteria: Criterion[];
};

const KNOWN_IDS = ['set', 'res', 'highlights', 'shadows', 'sharpness', 'cast', 'meas'];

function check(rubric: Rubric): Rubric {
  if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) {
    throw new Error('rubric.json has no criteria.');
  }
  for (const c of rubric.criteria) {
    if (!KNOWN_IDS.includes(c.id)) {
      throw new Error(`rubric.json has criterion "${c.id}", but the app has no scoring function for it.`);
    }
    if (typeof c.weight !== 'number' || c.weight <= 0) {
      throw new Error(`Criterion "${c.id}" in rubric.json needs a positive weight.`);
    }
    if (!c.guide) throw new Error(`Criterion "${c.id}" in rubric.json needs a guide section for its tip.`);
  }
  if (typeof rubric.feedback?.goodFrom !== 'number') throw new Error('rubric.json needs feedback.goodFrom.');
  if (!rubric.modelCard?.experienceLevels?.length) throw new Error('rubric.json needs modelCard.experienceLevels.');
  return rubric;
}

export const rubric: Rubric = check(rawRubric as Rubric);

export function criterion<T extends Criterion['id']>(id: T): Extract<Criterion, { id: T }> | undefined {
  return rubric.criteria.find((c) => c.id === id) as Extract<Criterion, { id: T }> | undefined;
}

/** Photo slots the profile screen shows, in rubric order. */
export const requiredPhotos: string[] = criterion('set')?.params.required ?? [];

/** Measurement fields the profile screen shows. */
export const measurementFields: MeasurementField[] = criterion('meas')?.params.fields ?? [];

/** Experience levels the model card offers, in rubric order. */
export const experienceLevels: ExperienceLevel[] = rubric.modelCard.experienceLevels;
