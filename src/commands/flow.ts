import { loadAllSessions } from "../parse/sessions.ts";
import {
  windowFromFlags,
  filterSessionsByWindow,
  filterSessionsByProject,
  type Args,
} from "../lib/cli.ts";
import { printJson, printHumanTable } from "../lib/output.ts";
import { flowScore } from "../signals/flow.ts";

export function run(args: Args): void {
  const w = windowFromFlags(args.flags);
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);

  const top = args.flags.top ? Number(args.flags.top) : 5;
  const scores = sessions.map(flowScore).filter((s) => s.score > 0);
  scores.sort((a, b) => b.score - a.score);
  const results = scores.slice(0, top);

  if (args.flags.human) {
    printHumanTable(
      results.map((r) => ({
        sessionId: r.sessionId.slice(0, 8),
        score: r.score,
        durationMin: r.durationMin,
        acceptance: r.acceptanceRate,
        reasons: r.reasons.join(", "),
      })),
    );
  } else {
    printJson(results);
  }
}
