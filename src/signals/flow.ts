import type { Session } from "../parse/sessions.ts";
import { analyzeCorrections, getUserText } from "./corrections.ts";
import { extractToolCalls } from "../lib/tools.ts";

const NEGATION = /\b(no|not|wrong|stop|revert|undo|abort|bad|doesn'?t\s+work|didn'?t\s+work)\b/i;

export type FlowScore = {
  sessionId: string;
  project: string;
  score: number;
  reasons: string[];
  durationMin: number;
  acceptanceRate: number;
  regenerateCycles: number;
  toolDenials: number;
};

export function flowScore(s: Session): FlowScore {
  const corr = analyzeCorrections(s.events);
  const calls = extractToolCalls(s.events);
  const denials = calls.filter((c) => c.wasDenied).length;
  const durationMin = Math.round(s.durationMs / 60_000);
  const acceptance =
    corr.totalUserTurns > 0 ? 1 - corr.correctiveTurns / corr.totalUserTurns : 0;

  const userTexts: string[] = [];
  for (const e of s.events) {
    if (e.type !== "user" || e.isSidechain) continue;
    const t = getUserText(e).trim();
    if (t) userTexts.push(t);
  }
  const lastText = userTexts[userTexts.length - 1] ?? "";
  const endedClean = !NEGATION.test(lastText.slice(0, 200));

  let score = 0;
  const reasons: string[] = [];
  if (endedClean) {
    score += 3;
    reasons.push("clean-end");
  }
  if (acceptance >= 0.7) {
    score += 2;
    reasons.push(`acceptance ${(acceptance * 100).toFixed(0)}%`);
  }
  if (durationMin >= 10) {
    const bonus = Math.min(5, Math.floor(durationMin / 10));
    score += bonus;
    reasons.push(`${durationMin}min duration (+${bonus})`);
  }
  if (corr.regenerateCycles === 0 && corr.totalUserTurns > 2) {
    score += 2;
    reasons.push("no regen");
  }
  score -= denials;
  if (denials > 0) reasons.push(`${denials} denials (-${denials})`);
  score = Math.min(20, Math.max(0, score));

  return {
    sessionId: s.sessionId,
    project: s.projectSlug,
    score,
    reasons,
    durationMin,
    acceptanceRate: Math.round(acceptance * 1000) / 1000,
    regenerateCycles: corr.regenerateCycles,
    toolDenials: denials,
  };
}
