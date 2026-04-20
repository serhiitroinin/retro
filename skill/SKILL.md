---
name: retro
description: Personal coaching skill for Claude Code adoption. Invoke when the user runs /retro-init to bootstrap a project's .retro/ files with a project-specific topic vocabulary, or /retro-review to produce an interactive weekly/daily coaching review grounded in real session data. Both flows call the `retro` CLI for numeric grounding and never quote session content.
---

# Retro — personal coaching for Claude Code adoption

This skill runs two entry points that the user invokes as slash commands:

| Command | When to use | Flow doc |
|---|---|---|
| `/retro-init` | **Once per project**, before the first review. Generates `.retro/` files and project-specific tags. | `resources/init-flow.md` |
| `/retro-review` | **Weekly (Friday) or daily**, per the adoption plan cadence. Produces the coaching report + updates `coaching.md`. | `resources/review-flow.md` |

## Core invariants — do not drift

1. **Never copy verbatim session content** into any file the skill writes. Describe patterns; synthesize illustrative examples from scratch.
2. **The `retro` CLI is the source of numbers.** Every metric in a report must trace to a CLI invocation. Do not invent counts.
3. **The adoption champion authors `.retro/adoption-plan.md`.** The skill reads it for direction, never writes to it.
4. **Closed vocabulary for themes.** `friction_themes` and `flow_themes` must be drawn from Active tags in `.retro/vocabulary.md`.
5. **One confirmation per review for shared-file writes.** Preview all proposed edits to `.retro/*` together; dev confirms once.
6. **Local-only data.** The report is rendered to the conversation; the dev copies-and-pastes the Summary section to the champion. No automation sends it.

## Using the CLI

Run `retro --help` to see commands. Default output is JSON; pass `--human` for readable tables when showing to the user. Useful flags:
- `--since=<d>` and `--until=<d>` for any historical window (e.g. `--since=21d --until=14d` targets "the week 3 weeks ago")
- `--project=.` scopes to the current repo
- `--top=N` for `struggles`/`flow`

## Output style during review

- Speak in short, coach-like turns — one hypothesis or question at a time.
- Lead with a concrete data point, then ask about experience: *"4 sessions had context hits this week, all in the auth area. Does that match how it felt?"*
- Synthesize examples with phrases like "a typical friction moment looks like…" — never "at 3:14 you said…".

## Dev loop for this skill

During development the skill dir is symlinked to `~/.claude/skills/retro/`. Edits to these files take effect on the next slash-command invocation without a CLI rebuild.
