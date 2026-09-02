# Voice

How Krama writes. One document, two audiences: the product's own copy (every string a
practitioner reads) and the repository's operational writing (PR bodies, specs, decision
entries, commit messages).

This is a standard, not a style preference. Part of it is constitutional, and that part is
mechanically checked: `npm run lint:copy` runs in CI as a blocking step. Most of it is not
checkable, which is what the last section is about.

Adapted from the briefing conventions in `docs/BEST_PRACTICES_FROM_NEXTMOVE.md` — adapted,
not adopted. That document's voice is a briefing writer's. This product's voice is a
teacher's in a room with one student.

---

## 1. Who is speaking

A teacher who has taught the same pose for twenty years, addressing one person, out loud,
without hurrying.

That constrains more than it sounds like it does:

- **A teacher in a room does not sell.** No feature is exciting. No practice is
  transformative. There is nothing to opt into.
- **A teacher does not perform expertise.** The Sanskrit name, the muscle, the meridian —
  stated when it helps the person do the thing, not to establish standing.
- **A teacher speaks to the person in front of them**, who may be stiff, tired, injured,
  grieving, or six weeks out of practice. Copy that assumes a fresh, motivated,
  uninjured reader is written for somebody who is not there.
- **A teacher is comfortable with silence.** The absence of a message is a valid design.
  Most empty states need fewer words than they have.

## 2. Structure: the decision first

The ask, the decision, or the answer goes in the first sentence. Evidence follows. If the
reader stops after one line they should have the thing they came for.

This is the single most reliable improvement to any piece of writing in this repository,
and it applies to product copy and operational writing alike.

> **Instead of:** Because we found that the friction engine's weights were producing seam
> indicators that teachers disagreed with in roughly a third of cases, and after reviewing
> the geometry fields available at Tier 1, we are changing the weight constant.
>
> **Write:** The friction weights are changing. Teachers disagreed with about a third of
> seam indicators; the fix is in the weight constant, not the algorithm.

For product copy the same rule reads as: **state the thing, then qualify it.**

> **Instead of:** In order to help you build a sustainable practice over time, we've put
> together a place where you can record how each session felt.
>
> **Write:** Write down how it felt. Only you can read it.

Closers state a decision or a next action. A summary that restates what the reader just
read is not a closer; delete it.

## 3. Words and constructions to avoid

### 3a. The vocabulary that marks generated text

These are checked (rule `VOICE-AI-TELLS`). They are not banned for being bad words; they
are banned because they are the register of a landing page, and a landing page is not who
is speaking.

`delve` · `seamless` / `seamlessly` · `stands as a testament` · `in today's fast-paced` ·
`rich tapestry` · `navigate the complexities` · `it's important to note` ·
`dive deep into` · `game-changer` / `game-changing` · `harness the power` ·
`embark on a/your …` · `unlock your potential` / `unlock the secrets` ·
`elevate your practice` / `elevate your journey`

Note the last three are scoped to their giveaway phrase, not the bare word. **"Unlock the
hips" and "elevate the ribs" are real cues a teacher gives** and are fine. The rule is
narrow on purpose — see §6.

### 3b. Constructions to avoid, not mechanically checked

- **The hedged imperative.** "You might want to try…" — either it is the instruction or it
  is not. Say the instruction.
- **Enthusiasm as punctuation.** Exclamation marks, "Great!", "Nice work!". A teacher
  noting that you practised does not cheer.
- **Second-person diagnosis.** "You're probably feeling tight through the hips." You do
  not know that. Describe what the pose does, not what the reader feels.
- **Empty intensifiers.** `truly`, `deeply`, `incredibly`, `simply`, `just`. Almost always
  deletable with no loss.
- **"Simply" and "just" specifically.** They tell a person who is struggling that the
  thing they cannot do is easy.
- **Feature nouns in front of the practitioner.** Nobody is here to use the *sequencing
  composer*. They are building a flow.

### 3c. On em dashes

Em dashes are permitted here, unlike in the source briefing conventions. They are how a
spoken aside actually sounds, and this document and the rest of the repository use them
freely. That is a deliberate divergence, recorded in `specs/009-voice-and-copy-lint/research.md`.

## 4. The non-coercive rule (hard constraint)

**This is not a preference and it is not negotiable in review.** It comes from
constitution v3.0.0 Principle VII, "Compassion Over Compliance", and its rules RULE-C1
through RULE-C6. Read them there — this section does not restate them, it points at them
and shows what they look like as sentences.

`.specify/memory/constitution.md` is the authority. Where it rules, it wins, including
over anything below.

| Rule | What it forbids | Checked as |
|---|---|---|
| RULE-C1 | A streak shown returning to zero | `VOICE-STREAK-RESET` |
| RULE-C2 | Guilt, shame, urgency, or a countdown | `VOICE-GUILT`, `VOICE-URGENCY`, `VOICE-COUNTDOWN` |
| RULE-C4 | Rest described as a lapse | `VOICE-REST-LAPSE` |
| RULE-C6 | A celebration becoming a threshold to defend | partly, via `VOICE-COUNTDOWN` |

Worked pairs, one per rule. Each violating example is a real shape this product could
easily have shipped, not a straw man.

**RULE-C1 — a streak never resets.**

> ✗ You missed a day — your streak is back to zero. Start again tomorrow!
>
> ✓ Your streak is paused at twelve days. It picks up wherever you do.

**RULE-C2 — no guilt or shame.**

> ✗ You haven't practised in 6 days. Don't let yourself down — get back on track.
>
> ✓ It's been six days. There's a four-minute flow here if you want one.

**RULE-C2 — no urgency, no countdown.**

> ✗ 2 days left to keep your streak alive. Practise now before it's too late!
>
> ✓ Nothing expires. Practise when you practise.

**RULE-C4 — rest is not a lapse.**

> ✗ Rest day or missed day? Either way the streak lapses.
>
> ✓ Rest is practice. Mark today as rest.

**RULE-C6 — a milestone is not a threshold.**

> ✗ 100 days! Don't break it now.
>
> ✓ A hundred days of this. That happened.

The reliable test: **read the string as if to somebody six weeks out of practice who is
opening the app for the first time since.** If it lands as a reproach, it fails, whatever
the intent was.

## 5. Operational writing

PR bodies, spec text, `DECISIONS.md`, `FRICTION.md`, commit messages. Not checked by the
lint (that is 009 US3, not built).

- §2 applies without change: the decision first.
- **Say what it cost.** A `FRICTION.md` entry without the cost is a note, not a log entry.
- **Say what would have caught it.** Half the value of a defect write-up.
- **Record the reasoning, not the conclusion.** `DECISIONS.md` exists because in a year
  the conclusion will be visible in the code and the reasoning will not.
- **Be plain about what is not done.** "Deferred, and here is why" is worth more than a
  claim of completeness that a reader will disprove in ten minutes.

## 6. What this cannot check — read this before trusting the gate

`npm run lint:copy` scans string literals and JSX text in the user-facing directories of
`src/`. Everything below is outside it. A gate that is trusted for more than it does is
worse than no gate, so the limits are stated here and re-stated in the check's own output.

The check **cannot**:

1. **Read composed or interpolated copy.** `` `${count} days left` `` is caught by the
   literal fragment; `${a} ${b}` assembled from two variables is not. Any string built at
   runtime is invisible to it.
2. **Read copy that is not in `src/`.** Pose data (`data/poses/`) is authored content and
   is deliberately not scanned — the traditional and anatomical material is not subject to
   the product's voice. Copy in migrations, emails, or a future CMS is unscanned.
3. **Judge tone.** Everything in §1, §2, and §3b is a human judgment. Condescension,
   false cheer, diagnosis, and hedging all pass the lint cleanly.
4. **Catch a coercive structure built from compliant sentences.** A screen where every
   string passes can still be a countdown, if the layout puts a shrinking number next to
   a warning colour. RULE-C2 is about the reader's experience, not the substring.
5. **Cover any language but English.** The patterns are English-specific and do not
   transfer. Localised copy is entirely uncovered.

So: the lint is a floor, not a ceiling. It exists to make the four constitutional rules
un-shippable to violate by accident. Everything else in this document is enforced in
review, by a person, reading the strings.

## 7. How this fits with everything else

Precedence, highest first:

1. **`.specify/memory/constitution.md`** — the non-negotiables. If this document ever
   contradicts it, the constitution is right and this document is a bug.
2. **This document** — voice and structure, for product copy and operational writing.
3. **`docs/krama-guardrails.md`** — UI and testid guardrails. Visual and structural, where
   this one is verbal.
4. **`CLAUDE.md`** — the working guide, which points at all of the above.

Adjacent: `docs/BEST_PRACTICES_FROM_NEXTMOVE.md` (the source this was adapted from),
`data/voice/voice-rules.json` (the checked rules, as data — edit voice by editing that
file, not the checker), and `FRICTION.md` (where an arguable lint hit gets logged instead
of argued).
