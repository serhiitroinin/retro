import { loadAllSessions } from "../parse/sessions.ts";
import {
  windowFromFlags,
  filterSessionsByWindow,
  filterSessionsByProject,
  filterEventsInWindow,
  type Args,
} from "../lib/cli.ts";
import { printJson, printHumanTable, printHumanKeyValue } from "../lib/output.ts";
import { modelFamily } from "../lib/models.ts";

export function run(args: Args): void {
  const w = windowFromFlags(args.flags);
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);

  const groupby = args.flags.groupby;
  if (!groupby) {
    const summary = summarize(sessions, w);
    if (args.flags.human) printHumanKeyValue(summary);
    else printJson(summary);
    return;
  }

  const rows = groupSessions(sessions, w, groupby);
  if (args.flags.human) printHumanTable(rows);
  else printJson(rows);
}

function summarize(sessions: ReturnType<typeof loadAllSessions>, w: { startMs: number; endMs: number }) {
  const days = new Set<string>();
  let totalMs = 0;
  let turns = 0;
  const projects = new Set<string>();
  for (const s of sessions) {
    const windowed = filterEventsInWindow(s.events, w);
    if (windowed.length === 0) continue;
    for (const e of windowed) {
      if (!e.timestamp) continue;
      days.add(e.timestamp.slice(0, 10));
      if (e.type === "user" || e.type === "assistant") turns += 1;
    }
    const first = windowed[0];
    const last = windowed[windowed.length - 1];
    if (first?.timestamp && last?.timestamp) {
      totalMs += Date.parse(last.timestamp) - Date.parse(first.timestamp);
    }
    projects.add(s.projectSlug);
  }
  const minutes = Math.round(totalMs / 60_000);
  return {
    sessions: sessions.length,
    active_days: days.size,
    total_minutes: minutes,
    median_session_min: median(sessions.map((s) => Math.round(s.durationMs / 60_000))),
    turns,
    projects: [...projects].sort(),
  };
}

function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2);
}

function groupSessions(
  sessions: ReturnType<typeof loadAllSessions>,
  w: { startMs: number; endMs: number },
  groupby: string,
): Record<string, string | number>[] {
  type Bucket = {
    key: string;
    sessions: Set<string>;
    minutes: number;
    turns: number;
    firstTs: number;
    lastTs: number;
  };
  const buckets = new Map<string, Bucket>();

  const get = (key: string): Bucket => {
    const b =
      buckets.get(key) ??
      { key, sessions: new Set<string>(), minutes: 0, turns: 0, firstTs: Infinity, lastTs: -Infinity };
    buckets.set(key, b);
    return b;
  };

  const trackSpan = (b: Bucket, ts: number) => {
    if (ts < b.firstTs) b.firstTs = ts;
    if (ts > b.lastTs) b.lastTs = ts;
  };

  for (const s of sessions) {
    const windowed = filterEventsInWindow(s.events, w);
    if (windowed.length === 0) continue;

    if (groupby === "project") {
      const b = get(s.projectSlug);
      b.sessions.add(s.sessionId);
      b.minutes += Math.round(s.durationMs / 60_000);
      b.turns += windowed.filter((e) => e.type === "user" || e.type === "assistant").length;
      continue;
    }

    for (const e of windowed) {
      if (!e.timestamp) continue;
      const t = Date.parse(e.timestamp);
      if (Number.isNaN(t)) continue;
      const d = new Date(t);
      let key: string;
      if (groupby === "day") key = e.timestamp.slice(0, 10);
      else if (groupby === "weekday")
        key = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][d.getUTCDay()] ?? "?";
      else if (groupby === "hour") key = String(d.getUTCHours()).padStart(2, "0");
      else if (groupby === "model")
        key = e.type === "assistant" ? modelFamily(e.message.model) : "non-model";
      else {
        console.error(`unknown --groupby=${groupby}`);
        process.exit(1);
      }
      if (groupby === "model" && key === "non-model") continue;
      const b = get(key);
      b.sessions.add(s.sessionId);
      trackSpan(b, t);
      if (e.type === "user" || e.type === "assistant") b.turns += 1;
    }
  }

  if (groupby !== "project") {
    for (const b of buckets.values()) {
      if (Number.isFinite(b.firstTs) && Number.isFinite(b.lastTs)) {
        b.minutes = Math.round((b.lastTs - b.firstTs) / 60_000);
      }
    }
  }

  const rows = [...buckets.values()].sort((a, b) => (a.key > b.key ? 1 : -1));
  return rows.map((r) => ({
    [groupby]: r.key,
    sessions: r.sessions.size,
    turns: r.turns,
    minutes: r.minutes,
  }));
}
