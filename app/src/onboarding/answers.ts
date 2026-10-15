// Choices offered by the one-per-screen onboarding questions. Display copy only; see docs/design/onboarding-flow.md.
import { experienceLevels } from '@/scoring/rubric';

/** What the applicant is aiming for. Only changes the order of agencies; never hides one. */
export const AIMS = [
  { id: 'runway', label: 'Runway', hint: 'Shows and fashion weeks' },
  { id: 'editorial', label: 'Editorial', hint: 'Magazines and lookbooks' },
  { id: 'commercial', label: 'Commercial', hint: 'Brands and campaigns' },
  { id: 'not-sure', label: 'Not sure yet', hint: 'Show me everything' },
] as const;
export type Aim = (typeof AIMS)[number]['id'];

/** Wording for the experience levels in rubric.json, keyed by level id. The rubric decides which levels exist. */
const EXPERIENCE_COPY: Record<string, { label: string; hint: string }> = {
  new: { label: 'New to modeling', hint: 'No paid work yet' },
  tests: { label: 'Some work', hint: 'A few shoots or shows' },
  signed: { label: 'Signed before', hint: "I've had an agency" },
};

export const EXPERIENCE_OPTIONS = experienceLevels.map((l) => ({ id: l.id, ...(EXPERIENCE_COPY[l.id] ?? { label: l.label, hint: '' }) }));
