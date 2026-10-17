# Research: Daily Sadhana

Four technical unknowns the plan left open (`tasks.md` T005). Each carries a decision, the
reason, and what was rejected. Nothing here is a TODO; where a later task depends on a
decision, the task is named.

---

## 1. Local-day resolution (decision #1)

**Decision: `Intl.DateTimeFormat`, no dependency.**

`resolveLocalDay(now: Date, timeZone?: string): string` formats `now` with
`new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })`
and reads `year`/`month`/`day` out of `formatToParts`, returning `YYYY-MM-DD`. When `timeZone`
is omitted it uses `Intl.DateTimeFormat().resolvedOptions().timeZone` read **at call time**,
which is what FR-005 asks for: the day is decided when the check-in is submitted, not when
the sheet was opened. The clock and zone are parameters so tests inject them.

**Why not a library.** The only question is "what calendar date is this instant in this
zone?" `Intl` answers it, including DST transition days and the +14/-12 offset extremes,
from the browser's own tz database. A dependency (`date-fns-tz`, `luxon`, `temporal-polyfill`)
adds bundle weight to the app's front door (RULE-L6, Lighthouse mobile >= 90) to answer a
question the platform already answers. Formatting through `formatToParts` rather than
`toLocaleDateString` avoids depending on a locale's field order.

**Rejected.** Computing from `getTimezoneOffset()`: it is the offset *now*, not the offset
at the instant being resolved, and is wrong on a DST transition day.

**Consequence for storage.** `practice_checkins.local_date` is a `date`, written by the
client from `resolveLocalDay()`. The server never recomputes it: it does not know the
practitioner's zone, and a recompute would silently disagree with the day they saw. The
database enforces only that the date is not in the future relative to `now() + 14 hours`
(the largest UTC offset), which bounds backdating without needing the zone (FR-007).

---

## 2. Offline check-in queue (FR-010)

**Decision: a genuinely new `idb` store in the same `krama` database, with its own module,
`src/lib/storage/checkin-outbox.ts`. `004`'s `outbox.ts` is not generalised.**

`004`'s outbox is keyed by `flowId`, holds a whole `Flow` as payload, and its central
property is *replacement*: several edits to one flow converge on the last. A check-in has
the same convergence need (FR-008: a second check-in on the same local day updates the
first), so the same shape fits: key the new store on `localDate`, one pending entry per day,
replaced on every write. What differs is everything else: the payload (a check-in, with a
reflection that must reach a different table), the dead-letter semantics, and the flush
target. Generalising `outbox.ts` would put a second domain's payload type behind a union in
a module whose single caller is `sync.ts`, and every change to either feature would then
risk the other's queue. Two small modules of the same shape cost less than one module that
has to know about both.

- `db.ts`: `DB_VERSION` 2 -> 3; add `CHECKINS_OUTBOX_STORE = 'checkin-outbox'`,
  `keyPath: 'localDate'`. The upgrade creates the store only if missing, as v2 did for
  `outbox`; existing stores are not touched.
- An entry is `{ localDate, kind: 'practice' | 'rest', durationMinutes, reflection | null,
  flowId | null, queuedAt, attempts, lastError, state }`.
- **Never reported in a state the server does not hold (FR-010).** The UI reads "recorded"
  from the server-confirmed row, and "saved on this device" from the queue; the two are
  different words and never share a label. An entry leaves the queue only on a confirmed
  upsert.
- Flush is triggered the same way `004`'s is (`online` event and app start), with no
  user action.

**Rejected.** Reusing `004`'s store with a `kind` discriminator: couples two features'
dead-letter rules. Writing to `localStorage`: not transactional, size-limited, and not what
the codebase does for durable client state.

---

## 3. `computeStreak()` and the grace-budget rule (FR-015, FR-019, decision #4)

**Decision: the streak is the count of distinct practised days. Rest and silently absent
days never change it. The grace budget is reported, not subtracted.**

The two hard requirements are that the number **never decreases** (FR-015) and **never
returns to zero once a first practice exists** (FR-015, SC-004), and that decision #3 (no
repair, ever) is closed. Work through the alternatives against those:

| Model | Never decreases? | Needs repair? | Verdict |
|---|---|---|---|
| Consecutive-day run, resets on a miss | No | Yes, users want one | Violates FR-015 |
| Run with grace, resets when budget exhausted | No, on exhaustion | Yes | Violates FR-015 |
| Run with grace, *pauses* when exhausted: the number holds and resumes counting on the next practice | Yes | No | Same number as the next row |
| **Count of distinct practised days** | **Yes, by construction** | **No: nothing to repair** | **Adopted** |

Once "pause, not reset" is accepted, the pausing run and the plain count are the same
number on every history, so the simpler definition is the one specified. A monotone number
cannot be reduced by a gap, so a gap's length is irrelevant to it, and that is the
property SC-004 tests.

**Rules, in order, over one `local_date` per day:**

1. A day with a `practice` check-in adds 1.
2. A day with only a `rest` check-in adds 0 and is never a miss.
3. A day with both counts once, as practice (FR-014).
4. A day with nothing is silently absent: adds 0, subtracts 0, produces no notice.
5. The value is therefore non-decreasing under any appended history, and >= 1 after a first
   practice.

**The grace budget** is `{ size, periodDays }` read from `data/sadhana/grace-budget.json`
(FR-019, never inline). It does not alter the number. It feeds the streak detail (FR-018,
FR-020): `graceUsed` is the count of silently absent days since the first practice that fall
inside the trailing `periodDays` window ending today; `graceRemaining` is `max(0, size -
graceUsed)`. At zero used it reads as the full allowance; at exhaustion it reads as a plain
statement of the numbers, with no consequence attached, because there is none. This is
exposed as a second pure function, `graceStatus(checkins, graceBudget, today)`, in the same
module. `computeStreak(checkins)` takes the check-ins only: a parameter that does not affect
the result would invite a reader to look for the effect.

**Milestones (10/30/90)** read the same count, so a milestone is reached exactly once and
cannot be un-reached (FR-021, FR-023). `practice_milestones` has a unique key on
`(user_id, threshold)` so "shown once" is a constraint rather than a convention.

**Rejected.** Letting grace days add to the streak: the milestones are named in practices
(spec US2), and a number that includes days nobody practised overstates the record.

---

## 4. Dashboard route placement (US5, FR-053..061, FR-062)

**Decision: `src/app/org/[orgId]/cohorts/[cohortId]/page.tsx`, linked from the Teach
destination once it exists.**

`/org/[orgId]/...` already carries org-scoped pages (`members`, invitations) and the
membership check that guards them. The dashboard is an org- and cohort-scoped teacher view,
so it inherits that guard instead of introducing a second route tree. FR-062 makes Teach one
of exactly three navigation destinations; the dashboard is a page under it, not a fourth
destination, and the nav change (T-US6) can point at it later without moving it.

The route's server component queries the signal tables only (`practice_checkins`,
`practice_milestones`) through `app_visible_student_ids()`. It never selects from
`practice_reflections`, and has no import path to it (FR-055). The RULE-V5 CI proof is
specified in `data-model.md` section 4.

**Rejected.** A top-level `/dashboard`: it is not scoped by an org, so it would need its
own membership guard and would imply an audience of one account. `src/app/(dashboard)/`
(the plan's placeholder): a route group adds no URL segment, so the page would still need an
org and cohort in its path.

---

## Constitution re-check (the gate for this phase)

- **III.** No sadhana module is under `src/lib/friction/` or `src/lib/validator/`. The pure
  functions above have the same shape (typed input, typed output, no I/O) but are not
  RULE-H6-bound, and nothing here claims they are.
- **VI.** `Intl` adds no bundle weight; the check-in queue keeps the offline write path.
- **VII.** The streak is non-decreasing by definition; there is no repair surface because
  there is nothing to repair (decision #3, FR-024).
- **VIII.** The content/signal split is structural: see `data-model.md`.
