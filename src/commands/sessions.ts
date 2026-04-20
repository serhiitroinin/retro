import { loadAllSessions, type Session } from "../parse/sessions.ts";
import type { Event, ContentBlock, TextBlock, ToolUseBlock, ToolResultBlock } from "../parse/events.ts";
import {
  windowFromFlags,
  filterSessionsByWindow,
  filterSessionsByProject,
  type Args,
} from "../lib/cli.ts";
import { printJson, printHumanTable, printHumanKeyValue } from "../lib/output.ts";
import { sumTokens } from "../lib/tokens.ts";
import { extractToolCalls, categorize } from "../lib/tools.ts";
import { loadProjectVocabulary } from "../tags/vocabulary.ts";
import { tagEvent } from "../tags/tagger.ts";

export function run(args: Args): void {
  switch (args.sub) {
    case "list":
      return listSessions(args);
    case "show":
      return showSession(args);
    case "timeline":
      return showTimeline(args);
    default:
      console.error("usage: retro sessions <list|show|timeline>");
      process.exit(1);
  }
}

function shortenSlug(slug: string): string {
  const parts = slug.split("-").filter(Boolean);
  if (parts.length <= 3) return slug;
  return "-" + parts.slice(-3).join("-");
}

function modelShort(m: string): string {
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  if (m.includes("haiku")) return "haiku";
  return m;
}

function isText(b: ContentBlock): b is TextBlock {
  return b.type === "text";
}
function isToolUse(b: ContentBlock): b is ToolUseBlock {
  return b.type === "tool_use";
}
function isToolResult(b: ContentBlock): b is ToolResultBlock {
  return b.type === "tool_result";
}

function listSessions(args: Args): void {
  const w = windowFromFlags(args.flags);
  const minDuration = args.flags["min-duration"] ? Number(args.flags["min-duration"]) : 0;
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);
  if (minDuration > 0) {
    sessions = sessions.filter((s) => s.durationMs / 60_000 >= minDuration);
  }
  sessions.sort((a, b) => b.startTime - a.startTime);

  const rows = sessions.map((s) => {
    const tokens = sumTokens(s.events);
    const turns = s.events.filter((e) => e.type === "user" || e.type === "assistant").length;
    const models = tokens.models.map(modelShort).join(",");
    return {
      sessionId: s.sessionId.slice(0, 8),
      project: shortenSlug(s.projectSlug),
      start: new Date(s.startTime).toISOString().slice(0, 16).replace("T", " "),
      durationMin: Math.round(s.durationMs / 60_000),
      turns,
      sidechain: s.sidechainEvents.length,
      tokens: tokens.input + tokens.output + tokens.cache_read,
      models,
    };
  });

  if (args.flags.human) printHumanTable(rows);
  else printJson(rows);
}

function findSession(idPrefix: string): Session | undefined {
  const all = loadAllSessions();
  return all.find((s) => s.sessionId === idPrefix || s.sessionId.startsWith(idPrefix));
}

function showSession(args: Args): void {
  const idPrefix = args.positional[0];
  if (!idPrefix) {
    console.error("usage: retro sessions show <sessionId>");
    process.exit(1);
  }
  const s = findSession(idPrefix);
  if (!s) {
    console.error(`no session with id ${idPrefix}`);
    process.exit(1);
  }
  const tokens = sumTokens(s.events);
  const tools = extractToolCalls(s.events);
  const byCat = { builtin: 0, mcp: 0, bash: 0, subagent: 0 };
  for (const c of tools) byCat[c.category] += 1;
  const turns = s.events.filter((e) => e.type === "user" || e.type === "assistant").length;

  const summary = {
    sessionId: s.sessionId,
    projectSlug: s.projectSlug,
    cwd: s.cwd ?? null,
    gitBranch: s.gitBranch ?? null,
    start: new Date(s.startTime).toISOString(),
    end: new Date(s.endTime).toISOString(),
    durationMin: Math.round(s.durationMs / 60_000),
    turns,
    mainEvents: s.mainEvents.length,
    sidechainEvents: s.sidechainEvents.length,
    toolCallsByCategory: byCat,
    toolCallsTotal: tools.length,
    tokens,
  };

  if (args.flags.human) {
    const flat: Record<string, unknown> = {
      sessionId: summary.sessionId,
      project: summary.projectSlug,
      start: summary.start,
      durationMin: summary.durationMin,
      turns: summary.turns,
      sidechain: summary.sidechainEvents,
      "tools.builtin": byCat.builtin,
      "tools.mcp": byCat.mcp,
      "tools.bash": byCat.bash,
      "tools.subagent": byCat.subagent,
      "tokens.input": tokens.input,
      "tokens.output": tokens.output,
      "tokens.cache_read": tokens.cache_read,
      "tokens.cache_hit_rate": tokens.cache_hit_rate,
      models: tokens.models.join(","),
    };
    printHumanKeyValue(flat);
  } else {
    printJson(summary);
  }
}

type SkeletonEvent = {
  time: string;
  kind: string;
  name?: string;
  meta?: string;
  sidechain: boolean;
  tags?: string[];
};

function eventSkeleton(e: Event): SkeletonEvent | null {
  if (!e.timestamp) return null;
  const time = new Date(e.timestamp).toISOString().slice(11, 19);
  const sidechain = Boolean(e.isSidechain);
  if (e.type === "user") {
    const content = e.message.content;
    if (Array.isArray(content)) {
      const results = content.filter(isToolResult);
      if (results.length > 0) {
        const errors = results.filter((r) => r.is_error).length;
        const denied = e.toolUseResult?.success === false;
        const meta = denied ? "denied" : errors > 0 ? `err(${errors}/${results.length})` : "ok";
        return { time, kind: "tool-res", meta, sidechain };
      }
      const textLen = content.filter(isText).reduce((n, b) => n + b.text.length, 0);
      return { time, kind: "user", meta: `${textLen}ch`, sidechain };
    }
    const textLen = typeof content === "string" ? content.length : 0;
    return { time, kind: "user", meta: `${textLen}ch`, sidechain };
  }
  if (e.type === "assistant") {
    const content = e.message.content;
    const toolUses = content.filter(isToolUse);
    if (toolUses.length > 0) {
      const names = toolUses.map((b) => categorize(b.name, b.input ?? {}).displayName);
      return { time, kind: "tool-use", name: names.join(","), sidechain };
    }
    const textLen = content.filter(isText).reduce((n, b) => n + b.text.length, 0);
    const thinking = content.some((b) => b.type === "thinking");
    const model = e.message.model ? modelShort(e.message.model) : "";
    return {
      time,
      kind: "assistant",
      meta: `${textLen}ch${thinking ? " +think" : ""}${model ? ` ${model}` : ""}`.trim(),
      sidechain,
    };
  }
  return null;
}

function showTimeline(args: Args): void {
  const idPrefix = args.positional[0];
  if (!idPrefix) {
    console.error("usage: retro sessions timeline <sessionId>");
    process.exit(1);
  }
  const s = findSession(idPrefix);
  if (!s) {
    console.error(`no session with id ${idPrefix}`);
    process.exit(1);
  }

  const vocab = loadProjectVocabulary();
  const skeleton: SkeletonEvent[] = [];
  for (const e of s.events) {
    const sk = eventSkeleton(e);
    if (!sk) continue;
    if (vocab) {
      const tags = tagEvent(e, vocab);
      if (tags.length) sk.tags = tags;
    }
    skeleton.push(sk);
  }

  if (args.flags.human) {
    for (const ev of skeleton) {
      const indent = ev.sidechain ? "    " : "";
      const meta = ev.meta ? ` [${ev.meta}]` : "";
      const tags = ev.tags && ev.tags.length ? ` {${ev.tags.join(",")}}` : "";
      console.log(`${indent}${ev.time}  ${ev.kind.padEnd(9)} ${ev.name ?? ""}${meta}${tags}`);
    }
  } else {
    printJson(skeleton);
  }
}
