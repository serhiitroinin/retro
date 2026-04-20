#!/usr/bin/env bun
import { loadAllSessions } from "./parse/sessions.ts";
import type { Event } from "./parse/events.ts";

function parseDuration(s: string): number {
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

function parseArgs(argv: string[]) {
  const cmd = argv[2] ?? "";
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (!a) continue;
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq >= 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else flags[a.slice(2)] = "true";
    } else {
      positional.push(a);
    }
  }
  return { cmd, flags, positional };
}

function countTools(events: Event[]): number {
  let n = 0;
  for (const e of events) {
    if (e.type !== "assistant") continue;
    const content = e.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === "tool_use") n++;
    }
  }
  return n;
}

function sumTokens(events: Event[]): number {
  let n = 0;
  for (const e of events) {
    if (e.type !== "assistant") continue;
    const u = e.message.usage;
    if (!u) continue;
    n += (u.input_tokens ?? 0) + (u.output_tokens ?? 0);
  }
  return n;
}

const { cmd, flags } = parseArgs(process.argv);

switch (cmd) {
  case "_debug-parse": {
    const sinceMs = flags.since ? Date.now() - parseDuration(flags.since) : undefined;
    const sessions = loadAllSessions(sinceMs);
    sessions.sort((a, b) => a.startTime - b.startTime);
    for (const s of sessions) {
      const turns = s.events.filter((e) => e.type === "user" || e.type === "assistant").length;
      console.log(
        JSON.stringify({
          sessionId: s.sessionId,
          project: s.projectSlug,
          start: new Date(s.startTime).toISOString(),
          durationMin: Math.round(s.durationMs / 60_000),
          turns,
          main: s.mainEvents.length,
          sidechain: s.sidechainEvents.length,
          tools: countTools(s.events),
          tokens: sumTokens(s.events),
        }),
      );
    }
    console.error(`\n[_debug-parse] ${sessions.length} sessions`);
    break;
  }
  default:
    console.log(`retro — personal coaching tool for Claude Code adoption

usage:
  retro _debug-parse [--since=7d]

(more commands land in subsequent phases — see PLAN.md)`);
    if (cmd) process.exit(1);
}
