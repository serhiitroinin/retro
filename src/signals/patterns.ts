import type { Session } from "../parse/sessions.ts";
import { analyzeCorrections } from "./corrections.ts";
import { detectCompactions } from "./compaction.ts";
import { extractToolCalls } from "../lib/tools.ts";
import { peakContextPct } from "../lib/tokens.ts";

export type PatternName =
  | "regenerate-cycles"
  | "compactions"
  | "denials"
  | "idle-sessions"
  | "context-hits";

export const VALID_PATTERNS: PatternName[] = [
  "regenerate-cycles",
  "compactions",
  "denials",
  "idle-sessions",
  "context-hits",
];

export type PatternHit = {
  sessionId: string;
  project: string;
  count: number;
  detail: string;
};

export function queryPattern(sessions: Session[], name: PatternName): PatternHit[] {
  const hits: PatternHit[] = [];
  for (const s of sessions) {
    let count = 0;
    let detail = "";
    if (name === "regenerate-cycles") {
      count = analyzeCorrections(s.events).regenerateCycles;
    } else if (name === "compactions") {
      const c = detectCompactions(s.events);
      count = c.total;
      detail = `${c.slashCompacts} /compact · ${c.tokenCliffs} cliffs`;
    } else if (name === "denials") {
      count = extractToolCalls(s.events).filter((c) => c.wasDenied).length;
    } else if (name === "idle-sessions") {
      const durMin = Math.round(s.durationMs / 60_000);
      const turns = s.events.filter((e) => e.type === "user" || e.type === "assistant").length;
      count = durMin > 10 && turns < 5 ? 1 : 0;
      detail = `${durMin}min · ${turns} turns`;
    } else if (name === "context-hits") {
      const peak = peakContextPct(s);
      count = peak >= 0.95 ? 1 : 0;
      detail = `peak ${(peak * 100).toFixed(1)}%`;
    }
    if (count > 0) {
      hits.push({ sessionId: s.sessionId, project: s.projectSlug, count, detail });
    }
  }
  hits.sort((a, b) => b.count - a.count);
  return hits;
}
