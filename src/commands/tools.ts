import { loadAllSessions } from "../parse/sessions.ts";
import {
  windowFromFlags,
  filterSessionsByWindow,
  filterSessionsByProject,
  filterEventsInWindow,
  type Args,
} from "../lib/cli.ts";
import { printJson, printHumanTable } from "../lib/output.ts";
import {
  extractToolCalls,
  aggregateByCategory,
  type ToolCategory,
} from "../lib/tools.ts";

const ALL_CATEGORIES: ToolCategory[] = ["builtin", "mcp", "bash", "subagent"];

export function run(args: Args): void {
  const w = windowFromFlags(args.flags);
  let sessions = loadAllSessions(w.startMs);
  sessions = filterSessionsByWindow(sessions, w);
  sessions = filterSessionsByProject(sessions, args.flags.project);

  const events = sessions.flatMap((s) => filterEventsInWindow(s.events, w));
  const allCalls = extractToolCalls(events);

  const targetCat = args.flags.category;
  if (targetCat) {
    if (!ALL_CATEGORIES.includes(targetCat as ToolCategory)) {
      console.error(`--category must be one of: ${ALL_CATEGORIES.join(", ")}`);
      process.exit(1);
    }
    const rows = aggregateByCategory(allCalls, targetCat as ToolCategory);
    if (args.flags.human) printHumanTable(rows);
    else printJson(rows);
    return;
  }

  const byCategory: Record<string, ReturnType<typeof aggregateByCategory>> = {};
  for (const cat of ALL_CATEGORIES) {
    byCategory[cat] = aggregateByCategory(allCalls, cat);
  }
  const totals = {
    total_calls: allCalls.length,
    builtin_calls: allCalls.filter((c) => c.category === "builtin").length,
    mcp_calls: allCalls.filter((c) => c.category === "mcp").length,
    bash_calls: allCalls.filter((c) => c.category === "bash").length,
    subagent_calls: allCalls.filter((c) => c.category === "subagent").length,
    tool_error_rate: round(allCalls.filter((c) => c.isError).length / Math.max(1, allCalls.length)),
    tool_denial_rate: round(
      allCalls.filter((c) => c.wasDenied).length / Math.max(1, allCalls.length),
    ),
  };

  if (args.flags.human) {
    console.log("=== totals ===");
    printHumanTable([totals as unknown as Record<string, string | number>]);
    for (const cat of ALL_CATEGORIES) {
      console.log(`\n=== ${cat} (top 10) ===`);
      printHumanTable((byCategory[cat] ?? []).slice(0, 10));
    }
  } else {
    printJson({ totals, ...byCategory });
  }
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}
