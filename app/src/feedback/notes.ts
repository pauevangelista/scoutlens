// Groups the per-check feedback into the cards on the notes screen: one "Photo set" card for the standard
// photos, one card per photo quality check, and one "Model card" card for the details. Wording only; the
// statuses come from feedback.ts. The photo cards are built from photo checks alone.
import type { Check, Feedback, Status } from './feedback';
import { slotCopy } from '@/scoring/photo-slots';
import { requiredPhotos, rubric } from '@/scoring/rubric';

export type NoteCard = Check & {
  /** Where the card's link goes: a guide section, or back to the details screen. */
  link: { kind: 'guide'; section: string } | { kind: 'details' } | null;
};

const NOTHING_TO_CHANGE = 'Nothing to change.';
const NUMBER_WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

function list(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function photoSet(photos: Check[]): NoteCard {
  const slots = photos.filter((c) => c.id.startsWith('photo-'));
  const missing = slots.filter((c) => c.status !== 'good');
  const total = requiredPhotos.length;
  const guide = rubric.criteria.find((c) => c.id === 'set')?.guide ?? 'shots';
  const base = { id: 'photo-set', name: 'Photo set', guide, link: { kind: 'guide' as const, section: guide } };

  if (missing.length === 0) {
    return { ...base, status: 'good', reason: `All ${total} standard photos are added.`, tip: NOTHING_TO_CHANGE };
  }
  const names = missing.map((c) => slotCopy(c.id.replace(/^photo-/, '')).name.toLowerCase());
  const reason =
    missing.length === total
      ? `You haven't added any of the ${total} standard photos yet.`
      : `You added ${total - missing.length} of ${total} standard photos. Your ${list(names)} ${missing.length > 1 ? 'are' : 'is'} missing.`;
  return { ...base, status: 'missing', reason, tip: missing[0].tip };
}

function modelCard(details: Check[]): NoteCard {
  const base = { id: 'model-card', name: 'Model card', guide: rubric.criteria.find((c) => c.id === 'meas')?.guide ?? null, link: { kind: 'details' as const } };
  const typo = details.find((c) => c.status === 'improve');
  const missing = details.filter((c) => c.status === 'missing');

  if (typo) return { ...base, status: 'improve', reason: `${typo.name}: ${typo.reason}`, tip: typo.tip };
  if (missing.length === 0) return { ...base, status: 'good', reason: 'Your card is complete.', tip: NOTHING_TO_CHANGE };
  if (missing.length === details.length) {
    return { ...base, status: 'missing', reason: 'Your card is empty.', tip: 'Add your height and age first. Agencies ask for them with every application.' };
  }
  const names = missing.map((c) => c.name.toLowerCase());
  return {
    ...base,
    status: 'improve',
    reason: `Your card is nearly complete. Your ${list(names)} ${missing.length > 1 ? 'are' : 'is'} missing.`,
    tip: missing[0].tip,
  };
}

const NEEDS_WORK: Status[] = ['improve', 'missing'];

export function buildNotes(feedback: Feedback): { cards: NoteCard[]; summary: string } {
  const quality: NoteCard[] = feedback.photos
    .filter((c) => !c.id.startsWith('photo-'))
    .map((c) => ({ ...c, link: c.guide ? { kind: 'guide', section: c.guide } : null }));
  const cards = [photoSet(feedback.photos), ...quality, modelCard(feedback.details)];

  const toFix = cards.filter((c) => NEEDS_WORK.includes(c.status)).length;
  const good = cards.filter((c) => c.status === 'good').length;
  const count = NUMBER_WORDS[toFix] ?? String(toFix);
  const summary =
    toFix === 0
      ? 'Everything we check looks ready to send.'
      : `${count} ${toFix === 1 ? 'thing will' : 'things will'} help most.${good > 0 ? ' The rest is already in good shape.' : ''}`;
  return { cards, summary };
}
