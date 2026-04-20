import type { Event, UserEvent, AssistantEvent, TextBlock, ContentBlock } from "../parse/events.ts";
import type { Vocabulary } from "./vocabulary.ts";

function isText(b: ContentBlock): b is TextBlock {
  return b.type === "text";
}

function messageText(e: Event): string {
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

export function tagEvents(events: Event[], vocab: Vocabulary): Set<string> {
  const tags = new Set<string>();
  const all = [...vocab.active, ...vocab.proposed];
  for (const e of events) {
    const text = messageText(e).toLowerCase();
    if (!text) continue;
    for (const tag of all) {
      if (tags.has(tag.name)) continue;
      for (const p of tag.patterns) {
        if (text.includes(p.toLowerCase())) {
          tags.add(tag.name);
          break;
        }
      }
    }
  }
  return tags;
}

export type TagCount = { tag: string; count: number; active: boolean };

export function tagSession(events: Event[], vocab: Vocabulary): TagCount[] {
  const counts = new Map<string, number>();
  const all = [...vocab.active.map((t) => ({ ...t, _active: true })), ...vocab.proposed.map((t) => ({ ...t, _active: false }))];
  for (const e of events) {
    const text = messageText(e).toLowerCase();
    if (!text) continue;
    for (const tag of all) {
      for (const p of tag.patterns) {
        if (p && text.includes(p.toLowerCase())) {
          counts.set(tag.name, (counts.get(tag.name) ?? 0) + 1);
          break;
        }
      }
    }
  }
  const activeSet = new Set(vocab.active.map((t) => t.name));
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count, active: activeSet.has(tag) }))
    .sort((a, b) => b.count - a.count);
}

export function tagEvent(e: Event, vocab: Vocabulary): string[] {
  const text = messageText(e).toLowerCase();
  if (!text) return [];
  const hits: string[] = [];
  const all = [...vocab.active, ...vocab.proposed];
  for (const tag of all) {
    for (const p of tag.patterns) {
      if (p && text.includes(p.toLowerCase())) {
        hits.push(tag.name);
        break;
      }
    }
  }
  return hits;
}
