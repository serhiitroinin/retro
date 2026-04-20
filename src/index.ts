#!/usr/bin/env bun
import { parseArgs, windowFromFlags, filterSessionsByWindow, filterSessionsByProject } from "./lib/cli.ts";
import { loadAllSessions } from "./parse/sessions.ts";
import { run as sessionsCmd } from "./commands/sessions.ts";
import { run as statsCmd } from "./commands/stats.ts";
import { run as toolsCmd } from "./commands/tools.ts";
import { run as tokensCmd } from "./commands/tokens.ts";
import { run as contextPressureCmd } from "./commands/context-pressure.ts";
import { printJson } from "./lib/output.ts";

const USAGE = `retro — personal coaching tool for Claude Code adoption

commands:
  retro sessions list [--since=7d] [--until=0d] [--project=.] [--min-duration=N] [--human]
  retro sessions show <sessionId> [--human]
  retro sessions timeline <sessionId> [--human]

  retro stats [--since=7d] [--groupby=day|weekday|hour|project|model] [--human]
  retro tools [--since=7d] [--category=builtin|mcp|bash|subagent] [--human]
  retro tokens [--since=7d] [--groupby=session|model|day] [--human]
  retro context-pressure [--since=7d] [--human]

  retro _debug-parse [--since=7d]

output is JSON by default; pass --human for readable tables.`;

const args = parseArgs(process.argv);

switch (args.cmd) {
  case "sessions":
    sessionsCmd(args);
    break;
  case "stats":
    statsCmd(args);
    break;
  case "tools":
    toolsCmd(args);
    break;
  case "tokens":
    tokensCmd(args);
    break;
  case "context-pressure":
    contextPressureCmd(args);
    break;
  case "_debug-parse":
    debugParse(args);
    break;
  case "":
  case "--help":
  case "-h":
    console.log(USAGE);
    break;
  default:
    console.error(`unknown command: ${args.cmd}\n\n${USAGE}`);
    process.exit(1);
}

function debugParse(args: ReturnType<typeof parseArgs>): void {
  const w = windowFromFlags(args.flags);
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);
  sessions.sort((a, b) => a.startTime - b.startTime);
  const rows = sessions.map((s) => ({
    sessionId: s.sessionId,
    project: s.projectSlug,
    start: new Date(s.startTime).toISOString(),
    durationMin: Math.round(s.durationMs / 60_000),
    turns: s.events.filter((e) => e.type === "user" || e.type === "assistant").length,
    main: s.mainEvents.length,
    sidechain: s.sidechainEvents.length,
  }));
  printJson(rows);
  console.error(`[_debug-parse] ${sessions.length} sessions`);
}
