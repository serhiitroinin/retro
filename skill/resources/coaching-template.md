# `coaching.md` — living feedback document

The per-dev coaching file at `.retro-local/<$USER>/coaching.md` is the **single source of truth** for where the dev stands on adoption. Each review **rewrites** the top sections and **appends** to a scrollback log at the bottom.

## Structure

```markdown
# Personal coaching — <$USER>

_Last updated: YYYY-MM-DD (Week NN)_
_Grounded in: .retro/adoption-plan.md + own session data + history.md_

## Where you are now

<1 short paragraph. Current adoption state, trajectory. Rewritten each review.>

## What's going well

- <bullet>
- <bullet>
- <bullet>

## What's not working

- <bullet>
- <bullet>

## What to improve next

1. <numbered action item>
2. <numbered action item>
3. <numbered action item (optional)>

## Progress on prior suggestions

- W<NN>: <prior item> → <status — done, partial, dropped, worth-retrying>

## Scrollback

- <YYYY-Www>: <one-line weekly summary>
- <YYYY-Www>: <one-line weekly summary>
```

## Rewrite-vs-append rules

| Section | Action each review |
|---|---|
| `Where you are now` | **Rewrite** entirely. Should describe the dev's current state, not their history. |
| `What's going well` | **Rewrite** with this review's observations. Past wins that still hold can carry over; wins that no longer apply should drop off. |
| `What's not working` | **Rewrite** with current friction. Resolved items move to `Progress on prior suggestions` as "done". |
| `What to improve next` | **Rewrite**. Max 3 items, ordered by leverage. Each must trace to the adoption plan or a concrete signal. |
| `Progress on prior suggestions` | **Rewrite** with an updated status list pulled from the previous review's items. Drop items older than 4 weeks. |
| `Scrollback` | **Append** one line summarizing this review. Never modify old scrollback entries. |

## Grounding rule for every recommendation

Before writing an item in `What to improve next`, check that it traces to one of:
- A focus area in `.retro/adoption-plan.md`
- Something in the dev's `context.md` or `history.md`
- A numeric signal surfaced in this review's CLI output

If you can't name the connection, the recommendation is too generic — cut it.

## Tone

- Coach, not grader. "Worth trying" not "You should."
- Concrete, not abstract. "Split long debug sessions with `/clear` when the hypothesis changes" not "manage context better."
- Acknowledge effort. A dev who tried something that didn't work isn't failing — they're learning.

## What NOT to include

- Verbatim session content (non-negotiable).
- Specific filenames or commit hashes (too fragile; they rot).
- Rankings vs. other devs ("you're doing better than X"). This is an *individual* coaching doc.
- Speculation beyond the signals ("you seem tired" — unless the dev said so in self-report).

## Idempotency

If the skill is re-run on the same week (say, after a crashed conversation), it should:
1. Not duplicate the Scrollback line for this week.
2. Not re-propose already-applied changes to shared files.
3. Overwrite the top sections cleanly (they were going to be rewritten anyway).

Detect this by checking whether a report already exists at `reports/YYYY-Www.md` — if yes, treat it as a re-run and skip the scrollback append.
