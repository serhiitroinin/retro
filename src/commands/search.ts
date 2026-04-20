import { loadAllSessions } from "../parse/sessions.ts";
import {
  windowFromFlags,
  filterSessionsByWindow,
  filterSessionsByProject,
  type Args,
} from "../lib/cli.ts";
import { printJson, printHumanTable } from "../lib/output.ts";
import type { Event, UserEvent, AssistantEvent, TextBlock, ContentBlock } from "../parse/events.ts";

function isText(b: ContentBlock): b is TextBlock {
  return b.type === "text";
}

function eventText(e: Event): string {
  if (e.type === "user") {
    const c = (e as UserEvent).message.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) return c.filter(isText).map((b) => b.text).join("\n");
    return "";
  }
  if (e.type === "assistant") {
    const c = (e as AssistantEvent).message.content;
    if (Array.isArray(c)) return c.filter(isText).map((b) => b.text).join("\n");
    return "";
  }
  return "";
}

export function run(args: Args): void {
  const pattern = args.sub || args.positional[0];
  if (!pattern) {
    console.error("usage: retro search <regex> [--since=7d] [--project=.]");
    process.exit(1);
  }
  let rx: RegExp;
  try {
    rx = new RegExp(pattern, "gi");
  } catch (err) {
    console.error(`bad regex: ${(err as Error).message}`);
    process.exit(1);
  }
  const w = windowFromFlags(args.flags);
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);

  const hits: { sessionId: string; project: string; matches: number }[] = [];
  for (const s of sessions) {
    let count = 0;
    for (const e of s.events) {
      const text = eventText(e);
      if (!text) continue;
      const matches = text.match(rx);
      if (matches) count += matches.length;
    }
    if (count > 0) {
      hits.push({ sessionId: s.sessionId.slice(0, 8), project: s.projectSlug, matches: count });
    }
  }
  hits.sort((a, b) => b.matches - a.matches);

  if (args.flags.human) printHumanTable(hits);
  else printJson(hits);
}
