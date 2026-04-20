import { existsSync, mkdirSync, writeFileSync, readFileSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { userInfo } from "node:os";
import type { Args } from "../lib/cli.ts";

export function run(_args: Args): void {
  const cwd = process.cwd();
  const retroDir = join(cwd, ".retro");
  const user = userInfo().username;
  const localDir = join(cwd, ".retro-local", user);

  mkdirSync(retroDir, { recursive: true });
  mkdirSync(localDir, { recursive: true });
  mkdirSync(join(localDir, "reports"), { recursive: true });

  const files: Record<string, string> = {
    [join(retroDir, "README.md")]: readmeTeam(),
    [join(retroDir, "project.md")]: "# Project\n\n_(to be filled by /retro-init)_\n\n## What this project is\n\n## Subsystems\n\n## Tech stack\n",
    [join(retroDir, "vocabulary.md")]: emptyVocab(),
    [join(retroDir, "friction.md")]: "# Team-known friction\n\n_Noise-floor items; skill proposes additions with dev confirm._\n",
    [join(retroDir, "patterns.md")]: "# Team-visible patterns\n\n_Skill writes when a theme recurs ≥2 consecutive reviews OR dev confirms team-relevance._\n",
    [join(retroDir, "adoption-plan.md")]: adoptionPlanTemplate(),
    [join(localDir, "context.md")]: `# ${user}'s context\n\n_(filled during /retro-init)_\n\n## Goals\n\n## What I find hard\n\n## What I want out of adoption\n`,
    [join(localDir, "history.md")]: `# ${user}'s history\n\n_Longitudinal notes accumulated across reviews._\n`,
    [join(localDir, "coaching.md")]: coachingStub(user),
  };

  let created = 0;
  let skipped = 0;
  for (const [path, content] of Object.entries(files)) {
    if (existsSync(path)) {
      skipped += 1;
      continue;
    }
    writeFileSync(path, content, "utf8");
    created += 1;
  }

  ensureGitignore(cwd);

  console.log(`\n✓ retro init — ${created} files created, ${skipped} skipped (already exist)`);
  console.log(`\n  team-level:  ${retroDir}/`);
  console.log(`  per-dev:     ${localDir}/`);
  console.log(`\nNext: open Claude Code in this repo and run /retro-init`);
  console.log(`  (the skill will inspect the project and propose a topic vocabulary)`);
}

function ensureGitignore(cwd: string): void {
  const gi = join(cwd, ".gitignore");
  const line = ".retro-local/";
  if (existsSync(gi)) {
    const content = readFileSync(gi, "utf8");
    if (content.includes(line)) return;
    const sep = content.endsWith("\n") ? "" : "\n";
    appendFileSync(gi, `${sep}${line}\n`, "utf8");
    console.log(`  added "${line}" to .gitignore`);
  } else {
    writeFileSync(gi, `${line}\n`, "utf8");
    console.log(`  created .gitignore with "${line}"`);
  }
}

function readmeTeam(): string {
  return `# .retro/

Team-level adoption reference files for Claude Code usage on this project.

| File | Who writes | Purpose |
|---|---|---|
| \`adoption-plan.md\` | Champion only | North-star direction for how this team is adopting Claude Code |
| \`project.md\` | Skill drafts, dev edits | What this project is — feeds the skill's context |
| \`vocabulary.md\` | Skill (auto-promotes tags) | Closed topic vocabulary for session classification |
| \`friction.md\` | Skill proposes, dev confirms | Team-known friction and noise-floor items |
| \`patterns.md\` | Skill writes with dev confirm | Patterns seen across multiple reviews |

The per-developer directory \`.retro-local/<username>/\` is gitignored and holds private coaching files.

See https://github.com/serhiitroinin/retro for the tool.
`;
}

function emptyVocab(): string {
  return `# Topic vocabulary

Tags used to classify session topics. Stable set → comparable reports over time.
Promotions from Proposed to Active happen automatically after 3 review sightings.

## Active

_(populated by /retro-init — run the skill to generate a project-specific vocabulary)_

## Proposed

_(skill proposes new tags during /retro-review; auto-promote at 3 sightings)_
`;
}

function adoptionPlanTemplate(): string {
  return `# Adoption guidance

_Maintained by @<champion>. Last updated: <YYYY-MM-DD>_

## Direction

<2-3 sentences. Why this team is adopting Claude Code now.>

## Lean into

- <focus area 1>
- <focus area 2>

## Not yet

- <area intentionally out of scope>

## Expected friction (don't flag as surprises)

- <known-hard thing 1>

## Ask for help

@<champion> — adoption questions, tool recommendations.
`;
}

function coachingStub(user: string): string {
  return `# Personal coaching — ${user}

_Last updated: (never)_
_Grounded in: .retro/adoption-plan.md + own session data + history.md_

## Where you are now

_(rewritten each review)_

## What's going well

_(rewritten each review)_

## What's not working

_(rewritten each review)_

## What to improve next

_(rewritten each review)_

## Progress on prior suggestions

_(rewritten each review)_

## Scrollback

_(append-only log of past weekly recommendations)_
`;
}
