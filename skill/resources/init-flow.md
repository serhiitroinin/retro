# `/retro-init` — project bootstrap flow

Run this **once per project**, before the first `/retro-review`. Goal: produce a project-specific topic vocabulary and a set of `.retro/` files the dev + champion will use.

## Prerequisite

The dev has already run `retro init` (the CLI scaffold command), which created empty `.retro/` and `.retro-local/<user>/` directories with stub files. This skill fills them with content.

## Steps

### 1. Inspect the project (private — no output yet)

Read these if present:
- `CLAUDE.md`, `README.md`
- `package.json`, `Cargo.toml`, `pyproject.toml`, `Gemfile`, `go.mod` (whichever apply)
- Top-level directory structure (one level deep)

Run (private):
- `git log --oneline -n 100`

Form a private understanding of: what kind of project is this? tech stack? subsystems? recurring commit themes? team naming conventions?

### 2. Generate a proposed topic vocabulary

Follow `vocabulary-generation.md` in this skill's `resources/` directory. Produce **10–15 project-specific tags**, each with: a name, a one-line description, and 3–8 pattern keywords. **No generic defaults** — every tag must reflect something this project actually cares about.

### 3. Present the vocabulary to the dev

Show all tags in a compact format. Ask:
- What's missing — topics this project cares about that aren't represented?
- What's too generic — tags that would match every session (drop them)?
- What naming should match team conventions instead of yours?

Iterate until the dev approves. Aim for ≤15 tags. Fewer is usually better.

### 4. Ask about the dev's context

Populate `.retro-local/<$USER>/context.md` by asking 3–5 short questions:
- What are you trying to get out of adopting Claude Code?
- What parts of your work are hardest right now?
- What would a good week with Claude look like?
- Any tools/workflows you specifically want to try or avoid?

Keep answers short. Write a clean context.md, not a transcript.

### 5. Write the files (one confirmation step)

Before writing, show a preview of what will be written to:
- `.retro/vocabulary.md` — approved Active tags, empty Proposed section
- `.retro/project.md` — your summary of the project from Step 1 (2–3 short paragraphs)
- `.retro-local/<$USER>/context.md` — the dev's answers from Step 4

Ask: "Write these? (y/n)". On yes, write via the `retro` CLI + direct file writes.

### 6. Remind about the adoption plan

Say: "`.retro/adoption-plan.md` exists but is empty. The adoption champion authors it. Here's a suggested template:" and include the template from `DESIGN.md` §12 as a code block the dev can share with their champion.

### 7. Confirm `.gitignore`

Verify that `.retro-local/` is in the project's `.gitignore`. The `retro init` CLI step should have done this, but confirm — if missing, offer to add it.

### 8. Close the loop

Say something like:
> "Done. Your `.retro/vocabulary.md` has N Active tags. When you're ready, run `/retro-review` (weekly or daily) and I'll produce a coaching report grounded in your session data."

## Invariants for this flow

- **Never inspect or quote** any individual Claude Code session during init. This flow is about the *project*, not any particular session.
- **Synthesize pattern keywords** from the project's domain, not from imagined sessions. Keywords should reflect domain vocabulary (function names, service names, library names, problem-area nouns).
- **Don't write adoption-plan.md.** It's the champion's doc.
