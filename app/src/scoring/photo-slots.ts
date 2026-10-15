// Display copy for the photo slot ids listed in rubric.json (criterion "set", params.required).
// This is wording only; which photos are required is decided by the rubric.
type SlotCopy = { name: string; tip: string; /** A few words under the empty slot. */ short: string };

const COPY: Record<string, SlotCopy> = {
  face: { name: 'Face close-up', tip: 'Head and shoulders, facing the camera.', short: 'Head and shoulders' },
  full: { name: 'Full length', tip: 'Head to toe, standing straight, fitted clothes.', short: 'Head to toe' },
  side: { name: 'Side profile', tip: 'Same framing, turned 90 degrees.', short: 'Turn 90 degrees' },
};

export function slotCopy(id: string): SlotCopy {
  return COPY[id] ?? { name: id, tip: '', short: '' };
}
