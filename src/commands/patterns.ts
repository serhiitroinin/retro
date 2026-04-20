import { loadAllSessions } from "../parse/sessions.ts";
import {
  windowFromFlags,
  filterSessionsByWindow,
  filterSessionsByProject,
  type Args,
} from "../lib/cli.ts";
import { printJson, printHumanTable } from "../lib/output.ts";
import { queryPattern, VALID_PATTERNS, type PatternName } from "../signals/patterns.ts";

export function run(args: Args): void {
  const name = (args.sub || args.positional[0]) as PatternName;
  if (!VALID_PATTERNS.includes(name)) {
    console.error(`usage: retro patterns <${VALID_PATTERNS.join("|")}>`);
    process.exit(1);
  }
  const w = windowFromFlags(args.flags);
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);

  const hits = queryPattern(sessions, name);

  if (args.flags.human) {
    printHumanTable(
      hits.map((h) => ({
        sessionId: h.sessionId.slice(0, 8),
        project: h.project,
        count: h.count,
        detail: h.detail,
      })),
    );
  } else {
    printJson(hits);
  }
}
