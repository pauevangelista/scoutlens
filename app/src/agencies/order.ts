// Orders the matcher's results using the onboarding answers. It only changes the order and explains why an
// agency is near the top; it never removes an agency or changes a verdict.
//  - Aim: agencies that publish that focus come first (agency.focus, which needs a source).
//  - City or country: agencies working in that market come next.
import type { AgencyMatch } from './match';

export type OrderInput = { aim: string | null; location: string };
export type OrderedMatch = AgencyMatch & { listedFirstBecause: string[] };

function titleCase(s: string): string {
  return s.replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
}

/** Words of at least three letters from what the user typed, e.g. "Madrid, Spain" -> madrid, spain. */
function locationWords(location: string): string[] {
  return location
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((w) => w.length >= 3);
}

/** "spain (Madrid, Barcelona)" -> "Spain". */
export function marketLabel(market: string): string {
  return titleCase(market.split(' (')[0].trim());
}

/** The agency market the user's location falls in, as a readable label, or null. */
export function marketFor(markets: string[], location: string): string | null {
  const words = locationWords(location);
  if (!words.length) return null;
  for (const m of markets) {
    const marketWords = locationWords(m);
    if (words.some((w) => marketWords.includes(w))) return marketLabel(m);
  }
  return null;
}

export function publishesFocus(m: AgencyMatch, aim: string | null): boolean {
  return Boolean(aim && m.agency.focus?.aims.includes(aim));
}

export function orderMatches(matches: AgencyMatch[], input: OrderInput, aimLabel = input.aim ?? ''): OrderedMatch[] {
  const ranked = matches.map((m, i) => {
    const focus = publishesFocus(m, input.aim);
    const market = marketFor(m.agency.markets, input.location);
    const listedFirstBecause = [
      ...(focus ? [`Publishes a ${aimLabel.toLowerCase()} focus`] : []),
      ...(market ? [`Works in ${market}`] : []),
    ];
    return { m: { ...m, listedFirstBecause }, key: [focus ? 0 : 1, market ? 0 : 1, i] };
  });
  ranked.sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1] || a.key[2] - b.key[2]);
  return ranked.map((r) => r.m);
}
