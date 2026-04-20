# Report template

Use this shape when drafting the review in step 6 of `review-flow.md`. Section headers and field names are stable across reports — schema_version: 2.

## Full markdown shape

````markdown
---
schema_version: 2
dev: "<$USER>"
period: {start: "YYYY-MM-DD", end: "YYYY-MM-DD", type: "weekly"}
generated_at: "YYYY-MM-DDTHH:MM:SSZ"

# --- adoption ---
sessions: <n>
active_days: <n>
total_minutes: <n>
median_session_min: <n>
projects: [<slug>, ...]

# --- quality signals ---
acceptance_rate: <0-1>
regenerate_cycles: <n>
tool_denials: <n>
compactions: <n>
context_hits: <n>
struggle_session_ids: ["<id>", ...]
flow_session_ids: ["<id>", ...]

# --- tool usage ---
tool_usage:
  builtin_top5: [Read, Edit, Bash, Grep, Glob]
  mcp_top5:
    - {server: <name>, tool: <name>, count: <n>, error_rate: <0-1>}
  bash_top5:
    - {bin: <binary>, count: <n>, fail_rate: <0-1>}
  subagent_top5:
    - {type: <subagent_type>, count: <n>, denial_rate: <0-1>}
  total_tool_calls: <n>
  tool_error_rate: <0-1>
  tool_denial_rate: <0-1>

# --- token usage ---
tokens:
  total_input: <n>
  total_output: <n>
  total_cached_read: <n>
  cache_hit_rate: <0-1>
  median_session_context_pct: <0-1>
  p95_session_context_pct: <0-1>
  sessions_over_80pct_context: <n>
  models_used: [<model_id>, ...]

# --- qualitative themes (closed vocabulary only) ---
friction_themes: [<tag>, ...]
flow_themes: [<tag>, ...]

# --- self-report ---
mood: "<positive|neutral|mixed|frustrated>"
self_blockers: ["<short>", ...]
highlights: ["<short>", ...]
---

# Week <NN> review — <$USER> — <start> → <end>

## Summary (shareable — copy this + frontmatter to @<champion>)

<One paragraph, 3–5 sentences. Numbers + themes + mood + 1–2 headline findings.
Example shape:
"Steady week: 14 sessions over 4 days (320 min). Flow was strong on refactor work
(acceptance 0.82), friction clustered in the auth subsystem — 3 regenerate-cycles
there and 2 sessions hit context. Mood: mixed; main blocker is the bq permission
prompt still catching you every session.">

## What changed this week

<Delta narrative vs. last week. New patterns, resolved patterns, surprises.
2–4 short paragraphs.>

## Updates to your coaching

<2–3 bullets naming which sections of coaching.md were rewritten and what
was added. e.g.
- "What's going well" — added strong flow on refactor tasks
- "What to improve next" — replaced prior item about sub-agents (resolved) with
  a new item about splitting long debugging sessions>

## Updates to shared files

<Concrete list of proposed shared-file changes. Dev can edit or remove any item
before confirmation.>
- Promoted vocab tag: `rate-limiting` (3rd sighting)
- Appended to friction.md: "bq allowlisting still blocking exports"
- Added to patterns.md: "Auth module friction seen across 2+ reviews"
````

## Filling frontmatter — provenance

| Tier | Source |
|---|---|
| adoption | `retro stats` (+ `retro sessions list` for counts) |
| quality signals | `retro struggles`, `retro flow`, `retro patterns`, computed `acceptance_rate = 1 - corrective_turns / total_user_turns` |
| tool_usage | `retro tools --category=<each>` → top-5 per category |
| tokens | `retro tokens`, `retro context-pressure` |
| themes | aggregated from `retro struggles` / `retro flow` output's `tags` field; must be Active-vocabulary-only |
| self-report | conversation with the dev |

## Filling when data is absent

If a session in the window had no assistant messages with `usage` data (rare), omit the token fields rather than invent zeros. Prefer `null` over zero for "unknown" — zero implies "we measured and it was zero", which is a different claim.

## Section-length guidance

- Summary: 3–5 sentences, one paragraph. If it's longer than one paragraph, trim.
- What changed: 2–4 short paragraphs. Prose, not bullets.
- Updates to your coaching: bulleted, 2–4 items.
- Updates to shared files: bulleted, as many as needed (usually 1–5).

Total draft length: ~300–500 words of prose plus the frontmatter. Longer reports get skimmed.
