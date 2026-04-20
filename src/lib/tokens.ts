import type { Event } from "../parse/events.ts";
import type { Session } from "../parse/sessions.ts";
import { contextWindow } from "./models.ts";

export type TokenTotals = {
  input: number;
  output: number;
  cache_creation: number;
  cache_read: number;
  cache_hit_rate: number;
  messages: number;
  models: string[];
};

export function sumTokens(events: Event[]): TokenTotals {
  let input = 0,
    output = 0,
    cacheCreation = 0,
    cacheRead = 0,
    messages = 0;
  const models = new Set<string>();
  for (const e of events) {
    if (e.type !== "assistant") continue;
    const u = e.message.usage;
    if (!u) continue;
    input += u.input_tokens ?? 0;
    output += u.output_tokens ?? 0;
    cacheCreation += u.cache_creation_input_tokens ?? 0;
    cacheRead += u.cache_read_input_tokens ?? 0;
    messages += 1;
    if (e.message.model) models.add(e.message.model);
  }
  const denom = cacheRead + input;
  return {
    input,
    output,
    cache_creation: cacheCreation,
    cache_read: cacheRead,
    cache_hit_rate: denom > 0 ? round(cacheRead / denom) : 0,
    messages,
    models: [...models].sort(),
  };
}

export function peakContextPct(session: Session): number {
  let peakUsed = 0;
  let declaredWindow = 200_000;
  for (const e of session.events) {
    if (e.type !== "assistant") continue;
    const u = e.message.usage;
    if (!u) continue;
    const used =
      (u.input_tokens ?? 0) +
      (u.cache_read_input_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0);
    if (used > peakUsed) peakUsed = used;
    const win = contextWindow(e.message.model);
    if (win > declaredWindow) declaredWindow = win;
  }
  // jsonl stores base model id without [1m] variant marker — infer 1M tier
  // when observed tokens exceed the declared window.
  const effective = peakUsed > declaredWindow ? 1_000_000 : declaredWindow;
  return round(peakUsed / effective);
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
