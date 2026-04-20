import type { Event } from "../parse/events.ts";
import { getUserText } from "./corrections.ts";

export type CompactionSignals = {
  slashCompacts: number;
  tokenCliffs: number;
  total: number;
};

export function detectCompactions(events: Event[]): CompactionSignals {
  const sorted = [...events].sort((a, b) => {
    const ta = a.timestamp ? Date.parse(a.timestamp) : 0;
    const tb = b.timestamp ? Date.parse(b.timestamp) : 0;
    return ta - tb;
  });

  let slashCompacts = 0;
  for (const e of sorted) {
    if (e.type !== "user" || e.isSidechain) continue;
    const text = getUserText(e);
    if (/<command-name>\/?compact\b/i.test(text) || /^\s*\/compact\b/i.test(text)) {
      slashCompacts += 1;
    }
  }

  let tokenCliffs = 0;
  let prev = 0;
  for (const e of sorted) {
    if (e.type !== "assistant" || e.isSidechain) continue;
    const u = e.message.usage;
    if (!u) continue;
    const curr = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
    if (prev > 20_000 && curr < prev * 0.4) tokenCliffs += 1;
    prev = curr;
  }

  return {
    slashCompacts,
    tokenCliffs,
    total: slashCompacts + tokenCliffs,
  };
}
