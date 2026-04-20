import { readFileSync, existsSync } from "node:fs";
import type { Event } from "./events.ts";

export function parseJsonl(filepath: string): Event[] {
  if (!existsSync(filepath)) return [];
  const content = readFileSync(filepath, "utf8");
  const lines = content.split("\n");
  const events: Event[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && "type" in parsed && "sessionId" in parsed) {
        events.push(parsed as Event);
      }
    } catch (e) {
      console.error(`[parse] skip bad line in ${filepath}: ${(e as Error).message}`);
    }
  }
  return events;
}
