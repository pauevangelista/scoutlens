/// <reference types="node" />
// Unit tests for the agency matcher. Uses a synthetic agency list plus checks on the real seed's shape.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import rawSeed from '../../data/agencies.seed.json';
import { agencies, freshness, matchAgency, matchAll, type Agency, type MatchInput } from '@/agencies/match';

const TODAY = new Date('2026-10-15T12:00:00');
const SRC = { url: 'https://example.test/requirements', kind: 'official_page', found_on: '2026-10-01' };

const FIXTURE: Agency[] = [
  {
    id: 'synthetic-a',
    name: 'Synthetic Agency A',
    type: 'agency',
    markets: ['testland'],
    divisions: [
      {
        id: 'main',
        label: 'Main board',
        min_height_cm: 172,
        max_height_cm: 186,
        measurements: { waist: { min_cm: 58, max_cm: 66, source: SRC } },
      },
      { id: 'nb', label: 'Non-binary board', min_height_cm: 170 },
      { id: 'open', label: 'Open board', min_height_cm: null, notes: 'scout says taller is common' },
    ],
    age: { min: 18, max: 25 },
    experience: { accepts: ['new', 'tests'], source: SRC },
    how_to_apply: 'Synthetic.',
    upfront_fees: true,
    last_verified: '2026-09-01',
    sources: [SRC],
    confidence: 'synthetic',
  },
  {
    id: 'synthetic-b',
    name: 'Synthetic Agency B',
    type: 'agency',
    markets: ['testland'],
    divisions: [{ id: 'all', label: 'All', min_height_cm: 160 }],
    age: { min: null, max: null, notes: 'asked in application' },
    how_to_apply: 'Synthetic.',
    upfront_fees: null,
    last_verified: null,
    sources: [SRC],
    confidence: 'synthetic',
  },
];
const [A, B] = FIXTURE;

const person = (over: Partial<MatchInput> = {}): MatchInput => ({ heightCm: 178, ageYears: 21, experience: 'new', ...over });
const opts = (divisionId: string | null, showRanges = false) => ({ divisionId, showRanges, today: TODAY });

describe('matchAgency', () => {
  test('a match explains every requirement with "Matches because"', () => {
    const m = matchAgency(A, person(), opts('main'));
    assert.equal(m.verdict, 'match');
    const topics = m.reasons.map((r) => r.topic);
    assert.deepEqual(topics, ['Division', 'Height', 'Height', 'Age', 'Experience']);
    for (const r of m.reasons.filter((r) => r.topic !== 'Division')) assert.match(r.text, /^Matches because/, r.text);
  });

  test('each failed requirement says "Not a match because" with both numbers', () => {
    const m = matchAgency(A, person({ heightCm: 165, ageYears: 30, experience: 'signed' }), opts('main'));
    assert.equal(m.verdict, 'not-a-match');
    const fails = m.reasons.filter((r) => r.outcome === 'no-match');
    assert.deepEqual(fails.map((r) => r.topic), ['Height', 'Age', 'Experience']);
    for (const r of fails) assert.match(r.text, /^Not a match because/);
    assert.match(fails[0].text, /172 cm.*165 cm/);
    assert.match(fails[1].text, /18 to 25.*30/);
  });

  test('the chosen division decides the height rule, and a non-binary board is just another division', () => {
    assert.equal(matchAgency(A, person({ heightCm: 171 }), opts('main')).verdict, 'not-a-match');
    assert.equal(matchAgency(A, person({ heightCm: 171 }), opts('nb')).verdict, 'match');
  });

  test('without a division the agency is still shown, asking the user to choose', () => {
    const m = matchAgency(A, person(), opts(null));
    assert.equal(m.verdict, 'choose-division');
    assert.match(m.reasons[0].text, /Main board; Non-binary board; Open board/);
    assert.equal(matchAgency(A, person(), opts('not-a-real-division')).division, null);
  });

  test('missing details give "add details", not a silent pass or fail', () => {
    const m = matchAgency(A, person({ heightCm: null }), opts('main'));
    assert.equal(m.verdict, 'add-details');
    assert.ok(m.reasons.some((r) => r.outcome === 'unknown' && /Add your height/.test(r.text)));
  });

  test('unpublished requirements are said out loud and do not block a match', () => {
    const m = matchAgency(B, person(), opts('all'));
    assert.equal(m.verdict, 'match');
    assert.match(m.reasons.find((r) => r.topic === 'Age')!.text, /no published age range\. Note: asked in application/);
    assert.match(m.reasons.find((r) => r.topic === 'Experience')!.text, /no published experience requirement/);
    const open = matchAgency(A, person({ heightCm: 150 }), opts('open'));
    assert.match(open.reasons.find((r) => r.topic === 'Height')!.text, /not treated as a requirement/);
    assert.notEqual(open.reasons.find((r) => r.topic === 'Height')!.outcome, 'no-match');
  });

  test('measurement ranges appear only when published and opted in, and never decide a match', () => {
    assert.deepEqual(matchAgency(A, person(), opts('main', false)).ranges, []);
    const on = matchAgency(A, person(), opts('main', true));
    assert.equal(on.ranges.length, 1);
    assert.equal(on.ranges[0].text, 'Waist: the agency lists 58 to 66 cm for this division.');
    assert.equal(on.ranges[0].source.url, SRC.url);
    assert.deepEqual(matchAgency(A, person(), opts('nb', true)).ranges, []);
    assert.equal(on.verdict, matchAgency(A, person(), opts('main', false)).verdict);
    // Neutral wording only.
    assert.doesNotMatch(on.ranges[0].text, /too|big|small|large|thin|over|under/i);
  });

  test('an agency that publishes nothing is not called a match', () => {
    const none: Agency = { ...B, divisions: [{ id: 'all', label: 'All', min_height_cm: null }] };
    const m = matchAgency(none, person(), opts('all'));
    assert.equal(m.verdict, 'nothing-published');
    assert.ok(m.reasons.every((r) => r.outcome !== 'no-match'));
  });

  test('upfront fees are flagged', () => {
    assert.equal(matchAgency(A, person(), opts('main')).fees.warn, true);
    assert.equal(matchAgency(B, person(), opts('all')).fees.warn, false);
    assert.match(matchAgency(B, person(), opts('all')).fees.text, /not recorded/);
  });

  test('the matcher has no gender input', () => {
    type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
    const exact: Equal<keyof MatchInput, 'heightCm' | 'ageYears' | 'experience'> = true;
    assert.equal(exact, true);
  });
});

describe('freshness', () => {
  test('never verified is stale', () => {
    const f = freshness(null, TODAY);
    assert.equal(f.stale, true);
    assert.match(f.text, /Not yet verified/);
  });
  test('verified within 6 months is fresh; older is stale', () => {
    assert.equal(freshness('2026-04-16', TODAY).stale, false);
    assert.equal(freshness('2026-04-14', TODAY).stale, true);
    assert.match(freshness('2026-01-01', TODAY).text, /more than 6 months ago/);
  });
});

describe('matchAll', () => {
  test('returns every agency, in order, whatever the person looks like on paper', () => {
    for (const p of [person(), person({ heightCm: 140, ageYears: 90, experience: null }), person({ heightCm: null, ageYears: null })]) {
      const res = matchAll(FIXTURE, p, {}, false, TODAY);
      assert.deepEqual(res.map((r) => r.agency.id), FIXTURE.map((a) => a.id));
    }
  });
});

describe('agency seed', () => {
  test('every agency loads with a source, last_verified and its own divisions', () => {
    assert.ok(agencies.length > 0);
    for (const a of agencies) {
      assert.ok(a.sources.length && a.sources.every((s) => s.url.startsWith('https://')), a.id);
      assert.ok(a.last_verified === null || /^\d{4}-\d{2}-\d{2}$/.test(a.last_verified), a.id);
      assert.ok(a.divisions.length, a.id);
    }
  });

  test('records never verified on an official page show as stale', () => {
    for (const a of agencies.filter((a) => a.last_verified === null)) {
      assert.equal(matchAgency(a, person(), opts(null)).freshness.stale, true, a.id);
    }
  });

  test('the seed holds no weight or BMI', () => {
    const json = JSON.stringify(rawSeed.agencies).toLowerCase();
    assert.doesNotMatch(json, /weight|bmi/);
  });
});
