import type { Event, UserEvent, TextBlock, ContentBlock } from "../parse/events.ts";

const CORRECTIVE_PATTERN = /\b(no|not|wrong|undo|instead|actually|don'?t|stop|revert)\b/i;

export type TurnSignals = {
  totalUserTurns: number;
  correctiveTurns: number;
  regenerateCycles: number;
  rapidCorrections: number;
};

function isTextBlock(b: ContentBlock): b is TextBlock {
  return b.type === "text";
}

function isUserTextTurn(e: UserEvent): boolean {
  const c = e.message.content;
  if (typeof c === "string") return c.trim().length > 0;
  if (!Array.isArray(c)) return false;
  return c.some((b) => isTextBlock(b) && b.text.trim().length > 0);
}

export function getUserText(e: UserEvent): string {
  const c = e.message.content;
  if (typeof c === "string") return c;
  if (!Array.isArray(c)) return "";
  return c.filter(isTextBlock).map((b) => b.text).join("\n");
}

function normalizeStart(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 50);
}

function prefixSimilarity(a: string, b: string): number {
  const na = normalizeStart(a);
  const nb = normalizeStart(b);
  const minLen = Math.min(na.length, nb.length);
  if (minLen === 0) return 0;
  let match = 0;
  for (let i = 0; i < minLen; i++) {
    if (na[i] === nb[i]) match++;
  }
  return match / minLen;
}

function isCorrective(currText: string, prevUserText: string): boolean {
  const head = currText.slice(0, 200);
  if (CORRECTIVE_PATTERN.test(head)) return true;
  return prefixSimilarity(head, prevUserText) >= 0.7;
}

export function analyzeCorrections(events: Event[]): TurnSignals {
  const userTexts: string[] = [];
  for (const e of events) {
    if (e.type !== "user") continue;
    if (e.isSidechain) continue;
    if (!isUserTextTurn(e)) continue;
    userTexts.push(getUserText(e));
  }

  const correctiveIdx: number[] = [];
  for (let i = 1; i < userTexts.length; i++) {
    const curr = userTexts[i];
    const prev = userTexts[i - 1];
    if (curr === undefined || prev === undefined) continue;
    if (isCorrective(curr, prev)) correctiveIdx.push(i);
  }

  let regen = 0;
  for (let i = 0; i < correctiveIdx.length - 1; i++) {
    const a = correctiveIdx[i];
    const b = correctiveIdx[i + 1];
    if (a === undefined || b === undefined) continue;
    if (b - a <= 3) regen++;
  }

  return {
    totalUserTurns: userTexts.length,
    correctiveTurns: correctiveIdx.length,
    regenerateCycles: regen,
    rapidCorrections: correctiveIdx.length,
  };
}
