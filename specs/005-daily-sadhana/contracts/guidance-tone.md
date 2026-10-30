# Contract: Guidance Tone — **DRAFT, awaiting owner sign-off**

**[OWNER SIGN-OFF REQUIRED]**

**Status**: Draft (task T007, `design-input.md` decision #6). Not binding until the owner
signs it off. Merging this draft is safe; no `data/guidance/*.md` entry may be authored
until the sign-off lands (`tasks.md` T059).
**Consumed by**: US6 (FR-036..FR-043), the guidance corpus, and its copy-lint scope.

## Ruling requested

**Gentle and pattern-based (Oura), not target-driven (WHOOP).** A target-driven tone reads
as a goal to fall short of, which cuts against Principle VII's "invitation, never a
threshold" more directly than pattern-based framing does.

## Voice rules

Each rule cites its source. Rules 1-4 are checked by `lint:copy` once its scope covers the
corpus (see below); rules 5-7 are judgement and are checked in review.

1. **No guilt or shame.** Absence is met with an invitation. (RULE-C2, Principle VII;
   lint `VOICE-GUILT`.)
2. **No urgency, countdown or streak-at-risk framing.** (RULE-C2; lint `VOICE-URGENCY`,
   `VOICE-COUNTDOWN`.)
3. **No streak shown returning to zero, and no missed-day count.** (RULE-C1, FR-042; lint
   `VOICE-STREAK-RESET`.)
4. **Rest is never a lapse.** (RULE-C4; lint `VOICE-REST-LAPSE`.) Also no vocabulary that
   marks generated text (`VOICE.md`; lint `VOICE-AI-TELLS`).
5. **Describe the pattern, never prescribe the response.** "Practice has been quieter this
   week" is a pattern; "you need to get back to it" is a prescription. (Decision #6.)
6. **No second-person judgement of the reader's capability or state.** Do not tell the
   reader how they are ("you're struggling", "you're doing great"). (`VOICE.md`.)
7. **One clear next action, at most, and it is the smallest one.** A gap-triggered card
   offers a single re-entry step and nothing else. (FR-042.)

## Constraints already fixed by the spec

- At most one card renders at a time (FR-039).
- A shown or set-aside card consumes its trigger; it is never queued (FR-040).
- No unread badge, no count, no backlog of earlier cards (FR-041).
- The corpus is not a browsable library and no navigation entry leads to one (FR-043).
- Each entry has exactly one kebab-case trigger and a unique authored priority (FR-036,
  FR-037; enforced by `scripts/validate-guidance.mjs`).

## Worked examples

The validator accepts any kebab-case trigger id; the vocabulary below is **proposed** for
the owner to rule on, not something the build already fixed.

| Trigger (proposed) | Compliant | Non-compliant (and the rule it breaks) |
|---|---|---|
| `gap-return` | "Practice has been quiet for a while. One breath is enough to begin again." | "You've fallen behind. Get back on track today." (rules 1, 3, 6) |
| `milestone-reached` | "A month of showing up has gathered here. It is yours to keep or let pass." | "Don't lose your 30-day streak!" (rules 2, 3) |
| `rest-recorded` | "Rest is part of the practice. It is noted, and nothing else is asked." | "Rest day logged. Your streak is on pause, so resume soon." (rules 2, 4) |
| `first-checkin` | "The first check-in is in. What shows up next is up to you." | "Great start! Now do it every day to build a habit." (rules 5, 6) |

## Copy-lint story

**`lint:copy` must be extended.** `SCAN_DIRS` in `scripts/lib/copy-lint.mjs` is
`['src/app', 'src/components', 'src/lib/settings']` and `SCAN_EXTENSIONS` is
`['.ts', '.tsx']`, so guidance prose under `data/guidance/` is **not covered today**.

Proposed extension, to be built as a separate task after sign-off:

- Add `data/guidance` to `SCAN_DIRS` and `.md` to `SCAN_EXTENSIONS`, with the frontmatter
  block skipped so only the entry body is linted.
- Apply all six rules in `data/voice/voice-rules.json` unchanged. No guidance-specific
  rule is needed for rules 1-4 above.
- Keep the FR-016 exception marker usable in Markdown only if the owner wants it; the
  recommendation is **no exceptions** in the corpus.

## Product constants to rule on in the same sitting

Both were chosen by the build and flagged for review; each is one constant.

- **Guidance priority direction: lower number wins** (`src/lib/sadhana/guidance.ts`, #194).
- **The yesterday window: 6h** (`YESTERDAY_WINDOW_HOURS` in `src/lib/sadhana/checkin-day.ts`, #190).

## Sign-off

Owner ruling: _pending._
