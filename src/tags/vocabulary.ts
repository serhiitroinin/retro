import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type Tag = {
  name: string;
  description: string;
  patterns: string[];
  sightings: number;
  sightingsMarkers: string[];
};

export type Vocabulary = {
  active: Tag[];
  proposed: Tag[];
};

export function parseVocabulary(source: string): Vocabulary {
  const activeMatch = source.match(/## Active\s*\n([\s\S]*?)(?=\n## Proposed|$)/);
  const proposedMatch = source.match(/## Proposed\s*\n([\s\S]*?)$/);
  return {
    active: parseTagSection(activeMatch?.[1] ?? ""),
    proposed: parseTagSection(proposedMatch?.[1] ?? ""),
  };
}

function parseTagSection(section: string): Tag[] {
  const tags: Tag[] = [];
  const blocks = section.split(/^### /gm).slice(1);
  for (const block of blocks) {
    const lines = block.split("\n");
    const firstLine = lines[0] ?? "";
    const nameMatch = firstLine.match(/`([^`]+)`/);
    if (!nameMatch || !nameMatch[1]) continue;
    const name = nameMatch[1];
    let description = "";
    let patterns: string[] = [];
    let sightings = 0;
    let sightingsMarkers: string[] = [];
    for (const line of lines.slice(1)) {
      const pm = line.match(/^_Patterns_:\s*(.*)$/);
      if (pm && pm[1]) {
        patterns = pm[1].split(",").map((s) => s.trim()).filter(Boolean);
        continue;
      }
      const sm = line.match(/^_Sightings_:\s*(\d+)(?:\s*\(([^)]*)\))?/);
      if (sm && sm[1]) {
        sightings = Number(sm[1]);
        sightingsMarkers = sm[2] ? sm[2].split(",").map((s) => s.trim()) : [];
        continue;
      }
      if (line.trim() && !description) description = line.trim();
    }
    tags.push({ name, description, patterns, sightings, sightingsMarkers });
  }
  return tags;
}

export function serializeVocabulary(v: Vocabulary): string {
  const header = `# Topic vocabulary

Tags used to classify session topics. Stable set → comparable reports over time.
Promotions from Proposed to Active happen automatically after 3 review sightings.
`;
  const active = v.active.length
    ? v.active.map(tagToMd).join("\n\n") + "\n"
    : "\n";
  const proposed = v.proposed.length
    ? v.proposed.map(tagToMd).join("\n\n") + "\n"
    : "\n";
  return `${header}\n## Active\n\n${active}\n## Proposed\n\n${proposed}`;
}

function tagToMd(t: Tag): string {
  const lines: string[] = [`### \`${t.name}\``];
  if (t.description) lines.push(t.description);
  if (t.patterns.length) lines.push(`_Patterns_: ${t.patterns.join(", ")}`);
  if (t.sightings > 0) {
    const markers = t.sightingsMarkers.length ? ` (${t.sightingsMarkers.join(", ")})` : "";
    lines.push(`_Sightings_: ${t.sightings}${markers}`);
  }
  return lines.join("\n");
}

export function vocabularyPath(cwd: string = process.cwd()): string {
  return join(cwd, ".retro", "vocabulary.md");
}

export function loadProjectVocabulary(cwd: string = process.cwd()): Vocabulary | null {
  const path = vocabularyPath(cwd);
  if (!existsSync(path)) return null;
  return parseVocabulary(readFileSync(path, "utf8"));
}

export function saveProjectVocabulary(v: Vocabulary, cwd: string = process.cwd()): void {
  const dir = join(cwd, ".retro");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(vocabularyPath(cwd), serializeVocabulary(v), "utf8");
}
