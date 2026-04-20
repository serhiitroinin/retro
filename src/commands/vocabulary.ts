import {
  loadProjectVocabulary,
  saveProjectVocabulary,
  type Vocabulary,
} from "../tags/vocabulary.ts";
import { autoPromote, recordSighting } from "../tags/promote.ts";
import { printJson, printHumanTable } from "../lib/output.ts";
import type { Args } from "../lib/cli.ts";

export function run(args: Args): void {
  const sub = args.sub || "list";
  switch (sub) {
    case "list":
      return listVocab(args);
    case "propose":
      return proposeTag(args);
    case "promote":
      return promoteTag(args);
    case "sight":
      return sightTag(args);
    default:
      console.error("usage: retro vocabulary <list|propose|promote|sight>");
      process.exit(1);
  }
}

function requireVocab(): Vocabulary {
  const v = loadProjectVocabulary();
  if (!v) {
    console.error(
      "no .retro/vocabulary.md in current project — run `retro init` (and /retro-init in Claude Code) first",
    );
    process.exit(1);
  }
  return v;
}

function listVocab(args: Args): void {
  const v = requireVocab();
  if (args.flags.human) {
    console.log("=== Active ===");
    printHumanTable(
      v.active.map((t) => ({
        tag: t.name,
        description: t.description,
        patterns: t.patterns.join(", "),
      })),
    );
    console.log("\n=== Proposed ===");
    printHumanTable(
      v.proposed.map((t) => ({
        tag: t.name,
        sightings: t.sightings,
        description: t.description,
        patterns: t.patterns.join(", "),
      })),
    );
  } else {
    printJson(v);
  }
}

function proposeTag(args: Args): void {
  const name = args.positional[0];
  const rationale = args.positional.slice(1).join(" ");
  if (!name) {
    console.error("usage: retro vocabulary propose <tag> <rationale>");
    process.exit(1);
  }
  const v = loadProjectVocabulary() ?? { active: [], proposed: [] };
  if ([...v.active, ...v.proposed].some((t) => t.name === name)) {
    console.error(`tag "${name}" already exists`);
    process.exit(1);
  }
  v.proposed.push({
    name,
    description: rationale,
    patterns: [],
    sightings: 0,
    sightingsMarkers: [],
  });
  saveProjectVocabulary(v);
  console.log(`proposed: ${name}`);
}

function promoteTag(args: Args): void {
  const name = args.positional[0];
  if (!name) {
    console.error("usage: retro vocabulary promote <tag>");
    process.exit(1);
  }
  const v = requireVocab();
  const idx = v.proposed.findIndex((t) => t.name === name);
  if (idx < 0) {
    console.error(`tag "${name}" not in proposed`);
    process.exit(1);
  }
  const [tag] = v.proposed.splice(idx, 1);
  if (tag) v.active.push(tag);
  saveProjectVocabulary(v);
  console.log(`promoted: ${name}`);
}

function sightTag(args: Args): void {
  const name = args.positional[0];
  const marker = args.positional[1] ?? new Date().toISOString().slice(0, 10);
  if (!name) {
    console.error("usage: retro vocabulary sight <tag> [marker]");
    process.exit(1);
  }
  const v = requireVocab();
  const ok = recordSighting(v, name, marker);
  if (!ok) {
    console.error(`tag "${name}" not in proposed`);
    process.exit(1);
  }
  const { promoted } = autoPromote(v);
  saveProjectVocabulary(v);
  const promotedNote = promoted.includes(name) ? " (auto-promoted to Active)" : "";
  console.log(`sighted: ${name}${promotedNote}`);
}
