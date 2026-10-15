// Native fallback: reading pixels needs extra native code, planned for the iOS phase.
// Returning null makes the lighting criteria show as "Not measured" and leaves them out of the total.
import type { PhotoAnalysis } from './analyze';

export async function measurePhoto(_uri: string): Promise<PhotoAnalysis | null> {
  return null;
}
