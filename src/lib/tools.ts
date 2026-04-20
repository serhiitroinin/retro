import type { Event, ToolUseBlock } from "../parse/events.ts";

export type ToolCategory = "builtin" | "mcp" | "bash" | "subagent";

export type ToolCall = {
  id: string;
  category: ToolCategory;
  displayName: string;
  rawName: string;
  subKey?: string;
  isSidechain: boolean;
  isError: boolean;
  wasDenied: boolean;
};

export function categorize(
  rawName: string,
  input: Record<string, unknown>,
): { category: ToolCategory; displayName: string; subKey?: string } {
  if (rawName === "Bash") {
    const cmd = typeof input.command === "string" ? input.command : "";
    const bin = extractBashBinary(cmd);
    return { category: "bash", displayName: bin, subKey: bin };
  }
  if (rawName === "Agent") {
    const subType =
      typeof input.subagent_type === "string" ? input.subagent_type : "(unknown)";
    return { category: "subagent", displayName: subType, subKey: subType };
  }
  if (rawName.startsWith("mcp__")) {
    const parts = rawName.split("__");
    const server = parts[1] ?? "unknown";
    const tool = parts.slice(2).join("__") || "(unknown)";
    return { category: "mcp", displayName: `${server}:${tool}`, subKey: server };
  }
  return { category: "builtin", displayName: rawName };
}

export function extractToolCalls(events: Event[]): ToolCall[] {
  const outcomes = new Map<string, { isError: boolean; wasDenied: boolean }>();
  for (const e of events) {
    if (e.type !== "user") continue;
    const content = e.message.content;
    if (!Array.isArray(content)) continue;
    const wasDenied = e.toolUseResult?.success === false;
    for (const block of content) {
      if (block.type !== "tool_result") continue;
      outcomes.set(block.tool_use_id, {
        isError: Boolean(block.is_error),
        wasDenied,
      });
    }
  }

  const calls: ToolCall[] = [];
  for (const e of events) {
    if (e.type !== "assistant") continue;
    const content = e.message.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type !== "tool_use") continue;
      const use = block as ToolUseBlock;
      const { category, displayName, subKey } = categorize(use.name, use.input ?? {});
      const outcome = outcomes.get(use.id);
      calls.push({
        id: use.id,
        category,
        displayName,
        rawName: use.name,
        subKey,
        isSidechain: Boolean(e.isSidechain),
        isError: outcome?.isError ?? false,
        wasDenied: outcome?.wasDenied ?? false,
      });
    }
  }
  return calls;
}

export type ToolAggRow = {
  name: string;
  count: number;
  error_rate: number;
  denial_rate: number;
};

export function aggregateByCategory(
  calls: ToolCall[],
  category: ToolCategory,
): ToolAggRow[] {
  const inCat = calls.filter((c) => c.category === category);
  const byKey = new Map<string, ToolCall[]>();
  for (const c of inCat) {
    const arr = byKey.get(c.displayName) ?? [];
    arr.push(c);
    byKey.set(c.displayName, arr);
  }
  const out: ToolAggRow[] = [];
  for (const [name, arr] of byKey) {
    const errs = arr.filter((c) => c.isError).length;
    const dens = arr.filter((c) => c.wasDenied).length;
    out.push({
      name,
      count: arr.length,
      error_rate: round(errs / arr.length),
      denial_rate: round(dens / arr.length),
    });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}

function extractBashBinary(command: string): string {
  const tokens = command.trim().split(/\s+/);
  let i = 0;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z_0-9]*=/.test(tokens[i] ?? "")) i += 1;
  const raw = tokens[i] ?? "";
  const cleaned = raw.replace(/^["']|["']$/g, "").replace(/^-+/, "");
  if (!cleaned) return "(unknown)";
  const slashIdx = cleaned.lastIndexOf("/");
  return slashIdx >= 0 ? cleaned.slice(slashIdx + 1) : cleaned;
}
