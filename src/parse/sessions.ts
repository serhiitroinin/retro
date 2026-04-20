import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parseJsonl } from "./jsonl.ts";
import type { Event } from "./events.ts";

export type Session = {
  sessionId: string;
  projectSlug: string;
  events: Event[];
  mainEvents: Event[];
  sidechainEvents: Event[];
  startTime: number;
  endTime: number;
  durationMs: number;
  cwd: string | undefined;
  gitBranch: string | undefined;
};

const PROJECTS_DIR = join(homedir(), ".claude", "projects");

export function listProjectSlugs(): string[] {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR).filter((f) => {
    try {
      return statSync(join(PROJECTS_DIR, f)).isDirectory();
    } catch {
      return false;
    }
  });
}

function collectJsonlFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => join(dir, f));
}

function passesMtimeGate(filepath: string, sinceMs: number | undefined): boolean {
  if (sinceMs === undefined) return true;
  try {
    return statSync(filepath).mtimeMs >= sinceMs;
  } catch {
    return false;
  }
}

function sessionIdFromFilename(fp: string): string | undefined {
  const m = fp.match(/([^/]+)\.jsonl$/);
  return m?.[1];
}

export function loadProjectSessions(projectSlug: string, sinceMs?: number): Session[] {
  const base = join(PROJECTS_DIR, projectSlug);
  const mainFiles = collectJsonlFiles(base).filter((f) => passesMtimeGate(f, sinceMs));

  const bySession = new Map<string, Event[]>();

  const appendTo = (sessionId: string, e: Event) => {
    const arr = bySession.get(sessionId);
    if (arr) arr.push(e);
    else bySession.set(sessionId, [e]);
  };

  for (const fp of mainFiles) {
    const parentSid = sessionIdFromFilename(fp);
    const events = parseJsonl(fp);
    for (const e of events) {
      const sid = e.sessionId ?? parentSid;
      if (!sid) continue;
      appendTo(sid, e);
    }
    if (!parentSid) continue;
    const subDir = join(base, parentSid, "subagents");
    for (const subFp of collectJsonlFiles(subDir)) {
      const subEvents = parseJsonl(subFp);
      for (const e of subEvents) {
        appendTo(parentSid, { ...e, isSidechain: true });
      }
    }
  }

  const sessions: Session[] = [];
  for (const [sessionId, events] of bySession) {
    const tsOf = (e: Event): number => (e.timestamp ? Date.parse(e.timestamp) : NaN);
    events.sort((a, b) => {
      const ta = tsOf(a);
      const tb = tsOf(b);
      if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
      if (Number.isNaN(ta)) return 1;
      if (Number.isNaN(tb)) return -1;
      return ta - tb;
    });
    const timestamped = events.filter((e) => !Number.isNaN(tsOf(e)));
    const first = timestamped[0];
    const last = timestamped[timestamped.length - 1];
    if (!first || !last) continue;
    const startTime = tsOf(first);
    const endTime = tsOf(last);
    const mainEvents = events.filter((e) => !e.isSidechain);
    const sidechainEvents = events.filter((e) => Boolean(e.isSidechain));
    sessions.push({
      sessionId,
      projectSlug,
      events,
      mainEvents,
      sidechainEvents,
      startTime,
      endTime,
      durationMs: endTime - startTime,
      cwd: first.cwd,
      gitBranch: first.gitBranch,
    });
  }
  return sessions;
}

export function loadAllSessions(sinceMs?: number): Session[] {
  const all: Session[] = [];
  for (const slug of listProjectSlugs()) {
    all.push(...loadProjectSessions(slug, sinceMs));
  }
  return all;
}
