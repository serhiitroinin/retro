import { loadAllSessions } from "../parse/sessions.ts";
import {
  windowFromFlags,
  filterSessionsByWindow,
  filterSessionsByProject,
  filterEventsInWindow,
  type Args,
} from "../lib/cli.ts";
import { printJson, printHumanTable, printHumanKeyValue } from "../lib/output.ts";
import { sumTokens } from "../lib/tokens.ts";
import { modelFamily } from "../lib/models.ts";
import type { AssistantEvent, Event } from "../parse/events.ts";

export function run(args: Args): void {
  const w = windowFromFlags(args.flags);
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);

  const groupby = args.flags.groupby;
  if (!groupby) {
    const windowed = sessions.flatMap((s) => filterEventsInWindow(s.events, w));
    const totals = sumTokens(windowed);
    if (args.flags.human) printHumanKeyValue(totals as unknown as Record<string, unknown>);
    else printJson(totals);
    return;
  }

  const rows = groupTokens(sessions, w, groupby);
  if (args.flags.human) printHumanTable(rows);
  else printJson(rows);
}

function groupTokens(
  sessions: ReturnType<typeof loadAllSessions>,
  w: { startMs: number; endMs: number },
  groupby: string,
): Record<string, string | number>[] {
  type Bucket = {
    key: string;
    input: number;
    output: number;
    cache_read: number;
    cache_creation: number;
    messages: number;
  };
  const buckets = new Map<string, Bucket>();

  const get = (key: string): Bucket => {
    const b = buckets.get(key) ?? {
      key,
      input: 0,
      output: 0,
      cache_read: 0,
      cache_creation: 0,
      messages: 0,
    };
    buckets.set(key, b);
    return b;
  };

  for (const s of sessions) {
    const windowed = filterEventsInWindow(s.events, w);
    for (const e of windowed) {
      if (e.type !== "assistant") continue;
      const u = e.message.usage;
      if (!u) continue;
      let key: string;
      if (groupby === "session") key = s.sessionId.slice(0, 8);
      else if (groupby === "model") key = modelFamily(e.message.model);
      else if (groupby === "day") key = e.timestamp?.slice(0, 10) ?? "unknown";
      else {
        console.error(`unknown --groupby=${groupby} (use session|model|day)`);
        process.exit(1);
      }
      const b = get(key);
      b.input += u.input_tokens ?? 0;
      b.output += u.output_tokens ?? 0;
      b.cache_read += u.cache_read_input_tokens ?? 0;
      b.cache_creation += u.cache_creation_input_tokens ?? 0;
      b.messages += 1;
    }
  }

  const rows = [...buckets.values()];
  rows.sort((a, b) => b.input + b.cache_read - (a.input + a.cache_read));
  return rows.map((r) => ({
    [groupby]: r.key,
    messages: r.messages,
    input: r.input,
    output: r.output,
    cache_read: r.cache_read,
    cache_creation: r.cache_creation,
    cache_hit_rate:
      r.cache_read + r.input > 0 ? round(r.cache_read / (r.cache_read + r.input)) : 0,
  }));
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
