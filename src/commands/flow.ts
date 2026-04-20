import { loadAllSessions } from "../parse/sessions.ts";
import {
  windowFromFlags,
  filterSessionsByWindow,
  filterSessionsByProject,
  type Args,
} from "../lib/cli.ts";
import { printJson, printHumanTable } from "../lib/output.ts";
import { flowScore } from "../signals/flow.ts";
import { loadProjectVocabulary } from "../tags/vocabulary.ts";
import { tagEvents } from "../tags/tagger.ts";

export function run(args: Args): void {
  const w = windowFromFlags(args.flags);
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);

  const top = args.flags.top ? Number(args.flags.top) : 5;
  const vocab = loadProjectVocabulary();
  const scores = sessions.map((s) => {
    const score = flowScore(s);
    const tags = vocab ? [...tagEvents(s.events, vocab)] : undefined;
    return { ...score, tags };
  }).filter((s) => s.score > 0);
  scores.sort((a, b) => b.score - a.score);
  const results = scores.slice(0, top);

  const flowThemes = vocab ? aggregateThemes(results.map((r) => r.tags ?? [])) : undefined;

  if (args.flags.human) {
    printHumanTable(
      results.map((r) => ({
        sessionId: r.sessionId.slice(0, 8),
        score: r.score,
        durationMin: r.durationMin,
        acceptance: r.acceptanceRate,
        tags: (r.tags ?? []).join(","),
        reasons: r.reasons.join(", "),
      })),
    );
    if (flowThemes) console.log(`\nflow_themes: ${flowThemes.join(", ") || "(none)"}`);
  } else {
    printJson({ results, flow_themes: flowThemes ?? [] });
  }
}

function aggregateThemes(tagLists: string[][]): string[] {
  const counts = new Map<string, number>();
  for (const tags of tagLists) {
    for (const t of tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);
}
