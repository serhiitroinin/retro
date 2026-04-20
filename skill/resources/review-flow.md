# `/retro-review` — weekly/daily coaching flow

Goal: produce one coach-like review — a report grounded in real numbers, written *with* the dev (not *at* them) — and update the living coaching document.

## Non-negotiables

1. **Call the CLI for numbers.** Never guess counts, rates, percentages. If you need a number, `retro <subcommand>` produces it.
2. **Never quote session content.** Describe patterns. Synthesize example phrasings ("a typical friction moment looks like…"). Session IDs are fine; text is not.
3. **Closed-vocabulary themes.** `friction_themes` and `flow_themes` in the report frontmatter must be drawn from Active tags in `.retro/vocabulary.md`.
4. **One confirmation for shared-file writes.** Preview all proposed edits to `.retro/*` together; dev confirms once at the end.

## The 10-step loop

### 1. Load context

Read, in order:
- `.retro/adoption-plan.md` — the north-star direction
- `.retro/project.md`, `friction.md`, `patterns.md`, `vocabulary.md`
- `.retro-local/<$USER>/coaching.md` — current coaching state
- `.retro-local/<$USER>/history.md`
- The last 1–2 reports from `.retro-local/<$USER>/reports/` (if any exist)

### 2. Gather numeric grounding

Determine the review window (default `--since=7d`, or an explicit range the dev asks for — `--since=14d --until=7d` for "last week"). Then run, quietly:

```
retro stats --since=<window> --project=.
retro tools --since=<window>
retro tokens --since=<window>
retro context-pressure --since=<window>
retro struggles --top=5 --since=<window>
retro flow --top=5 --since=<window>
retro patterns compactions --since=<window>
retro patterns denials --since=<window>
```

Keep output JSON (no `--human`) so you can reason over structured values.

### 3. Form 2–3 hypotheses

Combine numeric signals with plan focus areas and past coaching items. Good hypotheses are *falsifiable by the dev's experience* — "it looked like X based on Y; does that match how it felt?" Bad hypotheses just regurgitate numbers.

### 4. Enter the conversation loop

One question at a time. Lead with data:

> *"4 sessions this week had regenerate-cycles >3, mostly tagged `auth`. Does that match how it felt?"*

Drill deeper when the dev answers:
- `retro sessions timeline <id>` for a specific session
- `retro patterns <name>` for a recurring signal
- `retro search "<regex>"` (counts only) for hypothesis testing — e.g. *"how often does 'type error' come up?"*

Iterate until you have enough grounding to write the report.

### 5. Self-report questions

Short. Three or four.
- Mood this week? (positive / neutral / mixed / frustrated)
- Any blockers you want on record?
- One highlight?

### 6. Draft the report

Use `report-template.md` in this skill's resources. Emit:
- frontmatter (YAML, schema_version 2)
- Summary (1 paragraph — the shareable part)
- What changed this week (delta narrative)
- Updates to your coaching (which sections of coaching.md were rewritten)
- Updates to shared files (promotions, friction additions, pattern notes)

Show the draft to the dev *in the conversation*, not written to file yet.

### 7. Let the dev edit

The dev can ask to tweak tone, drop a point, merge two bullets. Make the changes. Don't re-ask questions you already have answers for.

### 8. Propose file updates (one confirmation)

Show a single preview block:

```
Proposed updates:
  .retro/vocabulary.md — promote `rate-limiting` (3rd sighting)
  .retro/vocabulary.md — propose new `migrations-locks`
  .retro/friction.md   — append: "bq allowlisting still blocking exports"
  .retro/patterns.md   — append: "Auth friction seen across 2+ reviews"
  .retro-local/<$USER>/coaching.md — rewrite sections 1–4; append to Scrollback
  .retro-local/<$USER>/reports/<year>-W<week>.md — new file (the full report)

Write these? (y/n)
```

On `y`, write all files. Use CLI helpers where available:
- `retro vocabulary promote <tag>` for promotions
- `retro vocabulary sight <tag>` to register a sighting (auto-promotes at 3)
- `retro vocabulary propose <tag> <rationale>` for new candidates

Direct file writes for `friction.md`, `patterns.md`, `coaching.md`, `reports/*.md`.

### 9. Save the report

Write the full report to `.retro-local/<$USER>/reports/<year>-W<week>.md` (e.g. `2026-W16.md`). This is the dev-only artifact.

### 10. Render the shareable output

Say to the dev:
> "Copy the frontmatter + Summary section above and paste it to @<champion>. That's all they need."

Then end the review.

## Recommendation-grounding rule

Every coaching recommendation you write into `coaching.md` or the report must connect to *at least one* of:
- the adoption plan's focus areas,
- the project's context/history,
- a specific numeric signal from CLI output this week.

If you can't name the connection, the recommendation is too generic — cut it or replace it with one you can ground.

## Compaction & context pressure — how to interpret

The CLI's compaction detection is a union of `/compact` invocations and token-cliff heuristics. Both may be noisy. Treat high compaction counts as a *prompt for questions* ("were you hitting context a lot?"), not as a definitive diagnosis.

Context-pressure peaks >100% mean the session probably used a model variant with a larger context window than the default table assumes (e.g. `[1m]` suffix). If you see such peaks, note them but don't over-interpret — they're a known tuning gap.
