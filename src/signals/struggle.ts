import type { Session } from "../parse/sessions.ts";
import { analyzeCorrections } from "./corrections.ts";
import { detectCompactions } from "./compaction.ts";
import { extractToolCalls } from "../lib/tools.ts";
import { peakContextPct } from "../lib/tokens.ts";

export type StruggleScore = {
  sessionId: string;
  project: string;
  score: number;
  reasons: string[];
  contextHit: boolean;
  peakContextPct: number;
  compactions: number;
  regenerateCycles: number;
  toolDenials: number;
  rapidCorrections: number;
  durationMin: number;
};

export function struggleScore(s: Session): StruggleScore {
  const corr = analyzeCorrections(s.events);
  const comp = detectCompactions(s.events);
  const calls = extractToolCalls(s.events);
  const denials = calls.filter((c) => c.wasDenied).length;
  const peak = peakContextPct(s);
  const contextHit = peak >= 0.95;
  const durationMin = Math.round(s.durationMs / 60_000);

  let score = 0;
  const reasons: string[] = [];
  if (contextHit) {
    score += 3;
    reasons.push(`context-hit ${(peak * 100).toFixed(0)}%`);
  }
  if (comp.total > 0) {
    score += comp.total;
    reasons.push(`${comp.total} compactions`);
  }
  if (corr.regenerateCycles > 0) {
    score += corr.regenerateCycles * 2;
    reasons.push(`${corr.regenerateCycles} regen-cycles`);
  }
  if (denials > 0) {
    score += denials;
    reasons.push(`${denials} tool-denials`);
  }
  if (corr.rapidCorrections > 0) {
    score += corr.rapidCorrections;
    reasons.push(`${corr.rapidCorrections} corrections`);
  }
  if (durationMin > 60) {
    const bonus = Math.floor((durationMin - 60) / 5);
    score += bonus;
    if (bonus > 0) reasons.push(`long (${durationMin}min +${bonus})`);
  }
  score = Math.min(20, Math.max(0, score));

  return {
    sessionId: s.sessionId,
    project: s.projectSlug,
    score,
    reasons,
    contextHit,
    peakContextPct: peak,
    compactions: comp.total,
    regenerateCycles: corr.regenerateCycles,
    toolDenials: denials,
    rapidCorrections: corr.rapidCorrections,
    durationMin,
  };
}
