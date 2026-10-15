// Display copy for the photo slot ids listed in rubric.json (criterion "set", params.required).
// This is wording only; which photos are required is decided by the rubric.
const COPY: Record<string, { name: string; tip: string }> = {
  face: { name: 'Face close-up', tip: 'Head and shoulders, facing the camera.' },
  full: { name: 'Full length', tip: 'Head to toe, standing straight, fitted clothes.' },
  side: { name: 'Side profile', tip: 'Same framing, turned 90 degrees.' },
};

export function slotCopy(id: string): { name: string; tip: string } {
  return COPY[id] ?? { name: id, tip: '' };
}
