import type { Vocabulary } from "./vocabulary.ts";

export const PROMOTION_THRESHOLD = 3;

export function autoPromote(v: Vocabulary): { promoted: string[]; vocab: Vocabulary } {
  const promoted: string[] = [];
  const stillProposed = [] as typeof v.proposed;
  for (const t of v.proposed) {
    if (t.sightings >= PROMOTION_THRESHOLD) {
      promoted.push(t.name);
      v.active.push(t);
    } else {
      stillProposed.push(t);
    }
  }
  v.proposed = stillProposed;
  return { promoted, vocab: v };
}

export function recordSighting(v: Vocabulary, tagName: string, marker: string): boolean {
  const t = v.proposed.find((x) => x.name === tagName);
  if (!t) return false;
  t.sightings += 1;
  if (!t.sightingsMarkers.includes(marker)) t.sightingsMarkers.push(marker);
  return true;
}
