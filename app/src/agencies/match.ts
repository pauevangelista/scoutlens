// Rule-based agency matcher. Compares the applicant's own declared height, age and experience with each
// agency's published criteria for the division the applicant chose, and explains every result.
// Every agency is always returned: nothing is hidden or ranked away. Bust, waist and hips ranges are shown
// for information only, when the agency publishes them and the user opts in; they never decide a match.
// Gender and the optional fairness answers are not inputs here.
import rawSeed from '../../../data/agencies.seed.json';

export type Source = { url: string; kind: string; found_on?: string };
export type Range = { min_cm: number | null; max_cm: number | null; source: Source };
export type RangeField = 'chest' | 'waist' | 'hips';

export type Division = {
  id: string;
  label: string;
  min_height_cm?: number | null;
  max_height_cm?: number | null;
  notes?: string;
  measurements?: Partial<Record<RangeField, Range>>;
};

export type Agency = {
  id: string;
  name: string;
  type: string;
  markets: string[];
  divisions: Division[];
  age: { min: number | null; max: number | null; notes?: string };
  /** Experience level ids (from rubric.json) the agency says it accepts, when it publishes this. */
  experience?: { accepts: string[]; source?: Source } | null;
  /** Aim ids (runway, editorial, commercial) the agency says it focuses on, when it publishes this. Only orders the list. */
  focus?: { aims: string[]; source: Source } | null;
  how_to_apply: string;
  upfront_fees: boolean | null;
  /** Date the record was checked against the agency's own page, or null if it never was. */
  last_verified: string | null;
  past_event?: boolean;
  sources: Source[];
  confidence: string;
};

export type Seed = { version: string; status: string; agencies: Agency[] };

/** The applicant's declared details. Only what agencies publish requirements for. */
export type MatchInput = {
  heightCm: number | null;
  ageYears: number | null;
  experience: string | null;
};

export type MatchOptions = {
  /** Division the applicant chose for this agency, from the agency's own list. */
  divisionId: string | null;
  /** Opt-in to see published bust/waist/hips ranges. */
  showRanges: boolean;
  today: Date;
};

export type ReasonOutcome = 'match' | 'no-match' | 'unknown' | 'not-published';
export type Reason = { topic: 'Division' | 'Height' | 'Age' | 'Experience'; outcome: ReasonOutcome; text: string };
export type Verdict = 'match' | 'not-a-match' | 'nothing-published' | 'choose-division' | 'add-details';

export type AgencyMatch = {
  agency: Agency;
  division: Division | null;
  verdict: Verdict;
  verdictText: string;
  reasons: Reason[];
  /** Empty unless the user opted in and the chosen division publishes ranges. */
  ranges: { field: RangeField; text: string; source: Source }[];
  freshness: { lastVerified: string | null; stale: boolean; text: string };
  fees: { warn: boolean; text: string };
};

export const STALE_AFTER_MONTHS = 6;

export const VERDICT_TEXT: Record<Verdict, string> = {
  match: 'Matches the published requirements',
  'not-a-match': 'Not a match',
  'nothing-published': 'No published requirements to compare',
  'choose-division': 'Choose a division to check',
  'add-details': 'Add your details to check',
};

const RANGE_LABEL: Record<RangeField, string> = { chest: 'Bust or chest', waist: 'Waist', hips: 'Hips' };

function checkSeed(seed: Seed): Seed {
  for (const a of seed.agencies) {
    if (!a.sources?.length) throw new Error(`Agency "${a.id}" needs at least one source.`);
    if ((a as Partial<Agency>).last_verified === undefined) throw new Error(`Agency "${a.id}" needs last_verified (null if never verified).`);
    if (a.last_verified !== null && !/^\d{4}-\d{2}-\d{2}$/.test(a.last_verified)) {
      throw new Error(`Agency "${a.id}" has last_verified "${a.last_verified}"; use YYYY-MM-DD or null.`);
    }
    if (a.focus && !a.focus.source?.url) throw new Error(`Agency "${a.id}" has a focus with no source.`);
    if (!a.divisions?.length) throw new Error(`Agency "${a.id}" needs its own list of divisions.`);
    for (const d of a.divisions) {
      for (const [field, r] of Object.entries(d.measurements ?? {})) {
        if (!r?.source?.url) throw new Error(`Agency "${a.id}" division "${d.id}" has a ${field} range with no source.`);
      }
    }
  }
  return seed;
}

export const seed: Seed = checkSeed(rawSeed as unknown as Seed);
export const agencies: Agency[] = seed.agencies;

function ageRangeText(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${min} to ${max}`;
  if (min !== null) return `${min} and over`;
  return `up to ${max}`;
}

/** Stale when never verified, or verified more than STALE_AFTER_MONTHS before today. */
export function freshness(lastVerified: string | null, today: Date): AgencyMatch['freshness'] {
  if (lastVerified === null) {
    return {
      lastVerified,
      stale: true,
      text: "Not yet verified on the agency's own site. Treat these requirements as unconfirmed.",
    };
  }
  const cutoff = new Date(today);
  cutoff.setMonth(cutoff.getMonth() - STALE_AFTER_MONTHS);
  const stale = new Date(`${lastVerified}T00:00:00`) < cutoff;
  return {
    lastVerified,
    stale,
    text: stale
      ? `Last verified ${lastVerified}, more than ${STALE_AFTER_MONTHS} months ago. Requirements may have changed.`
      : `Last verified ${lastVerified}.`,
  };
}

function fees(upfront: boolean | null): AgencyMatch['fees'] {
  if (upfront === true) return { warn: true, text: 'Asks for an upfront fee. Check carefully before paying anything.' };
  if (upfront === false) return { warn: false, text: 'No upfront fee, according to the source.' };
  return { warn: false, text: 'Upfront fees: not recorded. Ask before you sign anything.' };
}

function heightReasons(a: Agency, d: Division, heightCm: number | null): Reason[] {
  const min = d.min_height_cm ?? null;
  const max = d.max_height_cm ?? null;
  const where = `the ${d.label} division`;
  if (min === null && max === null) {
    const note = d.notes ? ` The source says: ${d.notes}. That is not treated as a requirement.` : '';
    return [{ topic: 'Height', outcome: 'not-published', text: `${a.name} has no published height requirement for ${where}.${note}` }];
  }
  if (heightCm === null) {
    return [{ topic: 'Height', outcome: 'unknown', text: `Add your height to compare it with ${where}.` }];
  }
  const out: Reason[] = [];
  if (min !== null) {
    out.push(
      heightCm >= min
        ? { topic: 'Height', outcome: 'match', text: `Matches because your height (${heightCm} cm) meets the published minimum of ${min} cm for ${where}.` }
        : { topic: 'Height', outcome: 'no-match', text: `Not a match because ${where} asks for at least ${min} cm and your height is ${heightCm} cm.` },
    );
  }
  if (max !== null) {
    out.push(
      heightCm <= max
        ? { topic: 'Height', outcome: 'match', text: `Matches because your height (${heightCm} cm) is within the published maximum of ${max} cm for ${where}.` }
        : { topic: 'Height', outcome: 'no-match', text: `Not a match because ${where} asks for at most ${max} cm and your height is ${heightCm} cm.` },
    );
  }
  return out;
}

function ageReason(a: Agency, ageYears: number | null): Reason {
  const { min, max, notes } = a.age;
  if (min === null && max === null) {
    const note = notes && notes !== 'not recorded' ? ` Note: ${notes}.` : '';
    return { topic: 'Age', outcome: 'not-published', text: `${a.name} has no published age range.${note}` };
  }
  const range = ageRangeText(min, max);
  if (ageYears === null) return { topic: 'Age', outcome: 'unknown', text: `Add your age to compare it with the published range (${range}).` };
  const ok = (min === null || ageYears >= min) && (max === null || ageYears <= max);
  return ok
    ? { topic: 'Age', outcome: 'match', text: `Matches because your age (${ageYears}) is within the published range (${range}).` }
    : { topic: 'Age', outcome: 'no-match', text: `Not a match because ${a.name} asks for ages ${range} and you are ${ageYears}.` };
}

function experienceReason(a: Agency, experience: string | null): Reason {
  if (!a.experience?.accepts?.length) {
    return { topic: 'Experience', outcome: 'not-published', text: `${a.name} has no published experience requirement.` };
  }
  if (experience === null) return { topic: 'Experience', outcome: 'unknown', text: 'Choose your experience level to compare it.' };
  return a.experience.accepts.includes(experience)
    ? { topic: 'Experience', outcome: 'match', text: `Matches because ${a.name} says it accepts applicants at your experience level.` }
    : { topic: 'Experience', outcome: 'no-match', text: `Not a match because ${a.name} says it does not take applicants at your experience level.` };
}

function rangeText(field: RangeField, r: Range): string {
  const span =
    r.min_cm !== null && r.max_cm !== null
      ? `${r.min_cm} to ${r.max_cm} cm`
      : r.min_cm !== null
        ? `from ${r.min_cm} cm`
        : `up to ${r.max_cm} cm`;
  return `${RANGE_LABEL[field]}: the agency lists ${span} for this division.`;
}

export function matchAgency(a: Agency, input: MatchInput, opts: MatchOptions): AgencyMatch {
  const division = a.divisions.find((d) => d.id === opts.divisionId) ?? null;
  const reasons: Reason[] = [];

  if (division) {
    reasons.push({ topic: 'Division', outcome: 'match', text: `You chose the ${division.label} division.` });
    reasons.push(...heightReasons(a, division, input.heightCm));
  } else {
    const labels = a.divisions.map((d) => d.label).join('; ');
    reasons.push({ topic: 'Division', outcome: 'unknown', text: `Choose one of ${a.name}'s divisions (${labels}) to compare your height.` });
  }
  reasons.push(ageReason(a, input.ageYears));
  reasons.push(experienceReason(a, input.experience));

  const verdict: Verdict = reasons.some((r) => r.outcome === 'no-match')
    ? 'not-a-match'
    : !division
      ? 'choose-division'
      : reasons.some((r) => r.outcome === 'unknown')
        ? 'add-details'
        : reasons.some((r) => r.topic !== 'Division' && r.outcome === 'match')
          ? 'match'
          : 'nothing-published';

  const ranges =
    opts.showRanges && division?.measurements
      ? (Object.entries(division.measurements) as [RangeField, Range][])
          .filter(([, r]) => r?.source?.url)
          .map(([field, r]) => ({ field, text: rangeText(field, r), source: r.source }))
      : [];

  return {
    agency: a,
    division,
    verdict,
    verdictText: VERDICT_TEXT[verdict],
    reasons,
    ranges,
    freshness: freshness(a.last_verified, opts.today),
    fees: fees(a.upfront_fees),
  };
}

/** One result per agency, in the seed's order. Never filters any agency out. */
export function matchAll(
  list: Agency[],
  input: MatchInput,
  divisions: Record<string, string | null>,
  showRanges: boolean,
  today: Date,
): AgencyMatch[] {
  return list.map((a) => matchAgency(a, input, { divisionId: divisions[a.id] ?? null, showRanges, today }));
}
