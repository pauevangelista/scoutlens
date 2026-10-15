// Native fallback: reading pixels needs extra native code, planned for the iOS phase.
// Returning null makes the Exposure criterion explain that it could not measure.
export async function measureLuminance(_uri: string): Promise<number | null> {
  return null;
}
