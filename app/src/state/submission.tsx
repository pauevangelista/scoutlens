// In-memory state for one session. Nothing is persisted or uploaded; reloading the page clears it.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { PhotoStats } from '@/scoring/score';

/** Consent comes before anything else; every statement must be ticked. */
export const CONSENT_STATEMENTS = [
  'I am 18 or older.',
  'I understand that in this prototype my photos stay on my device. Nothing is uploaded or saved, and closing this page deletes everything.',
  'I understand the feedback is a demo. It checks how complete and technically clear my photos and details are, not how I look.',
];
const NO_CONSENT = CONSENT_STATEMENTS.map(() => false);

export type Photo = PhotoStats & { uri: string };

/** Optional disclosures for bias testing only. Kept apart from the submission and never scored. */
export type GroupAttributes = { gender: string | null; ageBand: string | null };

type Store = {
  consentChecks: boolean[];
  setConsentCheck: (index: number, v: boolean) => void;
  /** True only when every consent statement is ticked. */
  consented: boolean;
  photos: Record<string, Photo | undefined>;
  setPhoto: (slot: string, photo: Photo | undefined) => void;
  measurements: Record<string, string>;
  setMeasurement: (field: string, value: string) => void;
  age: string;
  setAge: (v: string) => void;
  /** Experience level id from the rubric. */
  experience: string | null;
  setExperience: (v: string | null) => void;
  /** Division the applicant chose for each agency, keyed by agency id, using that agency's own categories. */
  divisions: Record<string, string | null>;
  setDivision: (agencyId: string, divisionId: string | null) => void;
  /** Opt-in to see published bust/waist/hips ranges. Off by default. */
  showRanges: boolean;
  setShowRanges: (v: boolean) => void;
  groupAttributes: GroupAttributes;
  setGroupAttributes: (g: GroupAttributes) => void;
  /** Clears photos, the model card, division choices, disclosures and consent. */
  reset: () => void;
};

const EMPTY_GROUP: GroupAttributes = { gender: null, ageBand: null };

const SubmissionContext = createContext<Store | null>(null);

export function SubmissionProvider({ children }: { children: ReactNode }) {
  const [consentChecks, setConsentChecks] = useState<boolean[]>(NO_CONSENT);
  const [photos, setPhotos] = useState<Record<string, Photo | undefined>>({});
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [age, setAge] = useState('');
  const [experience, setExperience] = useState<string | null>(null);
  const [divisions, setDivisions] = useState<Record<string, string | null>>({});
  const [showRanges, setShowRanges] = useState(false);
  const [groupAttributes, setGroupAttributes] = useState<GroupAttributes>(EMPTY_GROUP);

  const store = useMemo<Store>(
    () => ({
      consentChecks,
      setConsentCheck: (index, v) => setConsentChecks((prev) => prev.map((x, i) => (i === index ? v : x))),
      consented: consentChecks.every(Boolean),
      photos,
      setPhoto: (slot, photo) => setPhotos((prev) => ({ ...prev, [slot]: photo })),
      measurements,
      setMeasurement: (field, value) => setMeasurements((prev) => ({ ...prev, [field]: value })),
      age,
      setAge,
      experience,
      setExperience,
      divisions,
      setDivision: (agencyId, divisionId) => setDivisions((prev) => ({ ...prev, [agencyId]: divisionId })),
      showRanges,
      setShowRanges,
      groupAttributes,
      setGroupAttributes,
      reset: () => {
        setPhotos({});
        setMeasurements({});
        setAge('');
        setExperience(null);
        setDivisions({});
        setShowRanges(false);
        setGroupAttributes(EMPTY_GROUP);
        setConsentChecks(NO_CONSENT);
      },
    }),
    [consentChecks, photos, measurements, age, experience, divisions, showRanges, groupAttributes],
  );

  return <SubmissionContext.Provider value={store}>{children}</SubmissionContext.Provider>;
}

export function useSubmission(): Store {
  const store = useContext(SubmissionContext);
  if (!store) throw new Error('useSubmission must be used inside SubmissionProvider');
  return store;
}
