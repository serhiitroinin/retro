import { loadAllSessions } from "../parse/sessions.ts";
import {
  windowFromFlags,
  filterSessionsByWindow,
  filterSessionsByProject,
  type Args,
} from "../lib/cli.ts";
import { printJson, printHumanTable } from "../lib/output.ts";
import { peakContextPct } from "../lib/tokens.ts";

export function run(args: Args): void {
  const w = windowFromFlags(args.flags);
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);

  const rows = sessions.map((s) => ({
    sessionId: s.sessionId.slice(0, 8),
    project: shortenSlug(s.projectSlug),
    start: new Date(s.startTime).toISOString().slice(0, 16).replace("T", " "),
    peak_pct: peakContextPct(s),
  }));
  rows.sort((a, b) => b.peak_pct - a.peak_pct);

  if (args.flags.human) printHumanTable(rows);
  else printJson(rows);
}

function shortenSlug(slug: string): string {
  const parts = slug.split("-").filter(Boolean);
  if (parts.length <= 3) return slug;
  return "-" + parts.slice(-3).join("-");
}
