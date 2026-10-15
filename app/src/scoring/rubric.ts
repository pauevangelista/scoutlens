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
export type SharpnessParams = { tileGrid: number; topTileShare: number; zeroBelow: number; fullAbove: number };
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

export type Criterion =
  | { id: 'set'; name: string; weight: number; description: string; params: SetParams }
  | { id: 'res'; name: string; weight: number; description: string; params: ResParams }
  | { id: 'highlights'; name: string; weight: number; description: string; params: ClipParams }
  | { id: 'shadows'; name: string; weight: number; description: string; params: ClipParams }
  | { id: 'sharpness'; name: string; weight: number; description: string; params: SharpnessParams }
  | { id: 'cast'; name: string; weight: number; description: string; params: CastParams }
  | { id: 'meas'; name: string; weight: number; description: string; params: MeasParams };

export type Rubric = {
  version: string;
  status: string;
  note: string;
  analysis: { shortSidePx: number };
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
  }
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
