/// <reference types="node" />
// Unit tests for the notes screen cards and the agency order. Synthetic inputs only.
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { agencies, matchAll, type AgencyMatch } from '@/agencies/match';
import { marketFor, orderMatches } from '@/agencies/order';
import { buildFeedback, type ModelCard, type PhotoInput } from '@/feedback/feedback';
import { buildNotes } from '@/feedback/notes';
import type { PhotoAnalysis } from '@/photo/analyze';
import { experienceLevels, measurementFields, requiredPhotos } from '@/scoring/rubric';

const GOOD: PhotoAnalysis = { highlightShare: 0, shadowShare: 0, sharpness: 0.6, cast: { a: 0, b: 0, chroma: 0 } };
const photosFor = (slots: string[]): PhotoInput => Object.fromEntries(slots.map((id) => [id, { shortSidePx: 2000, analysis: GOOD }]));
const fullCard = (): ModelCard => ({
  measurements: Object.fromEntries(measurementFields.map((f) => [f.id, String(Math.round((f.min + f.max) / 2))])),
  age: '24',
  experience: experienceLevels[0].id,
});
const notesFor = (photos: PhotoInput, card: ModelCard) => buildNotes(buildFeedback({ photos, card }));

describe('notes cards', () => {
  test('one photo set card first, the quality checks, then one model card', () => {
    const ids = notesFor({}, fullCard()).cards.map((c) => c.id);
    assert.equal(ids[0], 'photo-set');
    assert.equal(ids.at(-1), 'model-card');
    assert.ok(!ids.some((id) => id.startsWith('photo-') && id !== 'photo-set'));
  });

  test('photo set names the missing photo', () => {
    const set = notesFor(photosFor(requiredPhotos.slice(0, -1)), fullCard()).cards[0];
    assert.equal(set.status, 'missing');
    assert.match(set.reason, new RegExp(`${requiredPhotos.length - 1} of ${requiredPhotos.length}`));
  });

  test('photo set is good when every standard photo is added', () => {
    assert.equal(notesFor(photosFor(requiredPhotos), fullCard()).cards[0].status, 'good');
  });

  test('model card: complete, nearly complete, typo and empty', () => {
    const card = (c: ModelCard) => notesFor({}, c).cards.at(-1)!;
    assert.equal(card(fullCard()).status, 'good');

    const noShoe = fullCard();
    delete noShoe.measurements.shoe;
    assert.equal(card(noShoe).status, 'improve');
    assert.match(card(noShoe).reason, /shoe size is missing/);

    assert.equal(card({ ...fullCard(), measurements: { ...fullCard().measurements, waist: '6000' } }).status, 'improve');
    assert.equal(card({ measurements: {}, age: '', experience: null }).status, 'missing');
  });

  test('every card has a reason and a tip, and the summary has no numbers', () => {
    for (const photos of [{}, photosFor(requiredPhotos)]) {
      const { cards, summary } = notesFor(photos, { measurements: {}, age: '', experience: null });
      for (const c of cards) assert.ok(c.reason.trim() && c.tip.trim(), c.id);
      assert.doesNotMatch(summary, /\d|\bscor|\bpoints?\b|%/i, summary);
    }
  });

  test('photo cards do not depend on the model card', () => {
    const photos = photosFor(requiredPhotos.slice(0, 1));
    const a = notesFor(photos, fullCard()).cards.filter((c) => c.id !== 'model-card');
    const b = notesFor(photos, { measurements: {}, age: '19', experience: null }).cards.filter((c) => c.id !== 'model-card');
    assert.deepEqual(a, b);
  });
});

describe('agency order', () => {
  const TODAY = new Date('2026-10-15T12:00:00');
  const results = (): AgencyMatch[] => matchAll(agencies, { heightCm: 176, ageYears: 21, experience: 'new' }, {}, false, TODAY);

  test('never removes an agency or changes a verdict', () => {
    for (const input of [{ aim: 'runway', location: 'Madrid, Spain' }, { aim: null, location: '' }, { aim: 'not-sure', location: 'Nowhere' }]) {
      const before = results();
      const after = orderMatches(before, input);
      assert.equal(after.length, before.length);
      assert.deepEqual(after.map((m) => m.agency.id).sort(), before.map((m) => m.agency.id).sort());
      for (const m of after) assert.equal(m.verdict, before.find((b) => b.agency.id === m.agency.id)!.verdict);
    }
  });

  test('keeps the seed order when nothing applies', () => {
    const before = results();
    assert.deepEqual(orderMatches(before, { aim: null, location: '' }).map((m) => m.agency.id), before.map((m) => m.agency.id));
  });

  test('agencies in the user market come first, and say why', () => {
    const ordered = orderMatches(results(), { aim: null, location: 'Madrid, Spain' });
    const firstOther = ordered.findIndex((m) => m.listedFirstBecause.length === 0);
    assert.ok(firstOther > 0);
    assert.ok(ordered.slice(firstOther).every((m) => m.listedFirstBecause.length === 0));
    assert.ok(ordered[0].listedFirstBecause.includes('Works in Spain'));
  });

  test('an agency that publishes the aim as its focus comes first', () => {
    const list = results();
    const last = list.at(-1)!;
    const withFocus = list.map((m) => (m === last ? { ...m, agency: { ...m.agency, focus: { aims: ['runway'], source: m.agency.sources[0] } } } : m));
    const ordered = orderMatches(withFocus, { aim: 'runway', location: '' }, 'Runway');
    assert.equal(ordered[0].agency.id, last.agency.id);
    assert.deepEqual(ordered[0].listedFirstBecause, ['Publishes a runway focus']);
  });

  test('market matching uses whole words', () => {
    assert.equal(marketFor(['spain (Madrid, Barcelona)'], 'madrid'), 'Spain');
    assert.equal(marketFor(['united kingdom'], 'London, United Kingdom'), 'United Kingdom');
    assert.equal(marketFor(['spain'], 'Spa'), null);
    assert.equal(marketFor(['spain'], ''), null);
  });
});
