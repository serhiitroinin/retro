import type { Session } from "../parse/sessions.ts";
import type { Event } from "../parse/events.ts";

export type Args = { cmd: string; sub: string; flags: Record<string, string>; positional: string[] };

export function parseArgs(argv: string[]): Args {
  const cmd = argv[2] ?? "";
  const rest = argv.slice(3);
  const sub = rest[0] && !rest[0].startsWith("--") ? rest[0] : "";
  const from = sub ? 1 : 0;
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = from; i < rest.length; i++) {
    const a = rest[i];
    if (!a) continue;
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = "true";
    } else {
      positional.push(a);
    }
  }
  return { cmd, sub, flags, positional };
}

export function parseDuration(s: string): number {
  const m = s.match(/^(\d+)([mhdw])$/);
  if (!m || !m[1] || !m[2]) {
    throw new Error(`bad duration: ${s} (use 30m, 24h, 7d, 2w)`);
  }
  const n = Number(m[1]);
  const unit = m[2];
  const unitMs =
    unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 604_800_000;
  return n * unitMs;
}

export type Window = { startMs: number; endMs: number };

export function windowFromFlags(flags: Record<string, string>, defaultSince = "7d"): Window {
  const now = Date.now();
  const sinceFlag = flags.since ?? defaultSince;
  const startMs = now - parseDuration(sinceFlag);
  const endMs = flags.until ? now - parseDuration(flags.until) : now;
  return { startMs, endMs };
}

export function filterEventsInWindow(events: Event[], w: Window): Event[] {
  return events.filter((e) => {
    if (!e.timestamp) return false;
    const t = Date.parse(e.timestamp);
    if (Number.isNaN(t)) return false;
    return t >= w.startMs && t <= w.endMs;
  });
}

export function sessionOverlapsWindow(s: Session, w: Window): boolean {
  return s.endTime >= w.startMs && s.startTime <= w.endMs;
}

export function filterSessionsByWindow(sessions: Session[], w: Window): Session[] {
  return sessions.filter((s) => sessionOverlapsWindow(s, w));
}

export function filterSessionsByProject(sessions: Session[], projectFlag?: string): Session[] {
  if (!projectFlag) return sessions;
  if (projectFlag === ".") {
    const cwd = process.cwd();
    const expectedSlug = cwd.replace(/\//g, "-");
    const match = sessions.filter(
      (s) => s.projectSlug === expectedSlug || s.cwd === cwd,
    );
    return match;
  }
  return sessions.filter((s) => s.projectSlug.includes(projectFlag));
}
