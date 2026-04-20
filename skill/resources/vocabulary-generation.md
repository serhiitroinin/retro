# Vocabulary generation prompt

Used in step 2 of `init-flow.md`. Generate a project-specific closed vocabulary of 10–15 topic tags.

## What a good tag looks like

- **Name**: short, lowercase, hyphen-separated, reflects a concept in this project's domain. Examples: `auth`, `migrations`, `growthbook`, `rate-limiting`, `feature-flags`, `index-rebuild`.
- **Description**: one line. What topics does this tag cover? What's the boundary vs. adjacent tags?
- **Patterns**: 3–8 case-insensitive substrings that reliably indicate the topic when they appear in a session. Include domain-specific nouns (service names, class names from the codebase), common synonyms, and obvious jargon. Skip words so generic they match any session (like "code", "function", "file").

## Good sources of candidate tags

Look at (in order of signal value):
1. **Directory names** at top level of `src/` / `lib/` / `internal/` — usually subsystem boundaries.
2. **Recurring commit prefixes or scopes** in `git log --oneline -n 100` — these signal repeat work areas.
3. **Top-level keys in `package.json` / `Cargo.toml` dependencies** — external systems the project integrates with (databases, queues, feature flag tools, etc.) often become tags.
4. **Module names mentioned in CLAUDE.md or README.md** as major concerns or subsystems.
5. **Team jargon** in recent commit messages (abbreviations, acronyms, internal product names).

## What to AVOID

- **Generic tags**: `bug`, `refactor`, `test`. These match every session and don't help. If the project genuinely has a lot of "testing" signal, prefer a more specific tag like `testing-e2e` or `testing-flakes`.
- **Duplicates**: don't ship `auth` AND `authentication` — pick one.
- **Too broad**: a tag whose patterns would match 80%+ of sessions. Shrink it.
- **Too narrow**: a tag whose patterns would match <5% of sessions. Drop it.

## Format for review with the dev

Present the proposed vocabulary as a compact list the dev can scan in under a minute:

```
Proposed topic vocabulary (N tags):

 1. auth — login, OAuth, session tokens, JWT
 2. growthbook — feature flags, experiments, variants
 3. migrations — db schema changes, Flyway, ALTER TABLE
 ...

Missing? Too generic? Team uses different names?
```

Iterate with the dev until they approve. Do NOT write the vocabulary file until they confirm.

## Writing to file

Once approved, write to `.retro/vocabulary.md` using this format (see `DESIGN.md` §11 for the canonical schema):

```markdown
# Topic vocabulary

Tags used to classify session topics. Stable set → comparable reports over time.
Promotions from Proposed to Active happen automatically after 3 review sightings.

## Active

### `<tag-name>`
<one-line description>
_Patterns_: <comma-separated, case-insensitive>

### `<next-tag>`
...

## Proposed

(empty at init time)
```

All tags approved at init go in **Active**. The **Proposed** section starts empty and grows as `/retro-review` discovers candidates during conversation with the dev.

## The Proposed section

Future reviews will populate this. Auto-promotion rule (handled by the CLI): a Proposed tag promotes to Active when it accumulates **3 sightings** — one per review where the skill invoked or would have invoked it.
