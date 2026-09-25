# Contract: Sharing & Revoke Copy — **[OWNER SIGN-OFF]**

**Status**: Drafted and shipped in `FlowShare.tsx`; passes `npm run lint:copy`. Staged here
for the sign-off `contracts/flow-sharing.md` has been holding open, so T037 can close
without redrafting anything already live.
**Consumed by**: US3 (FR-032), `contracts/flow-sharing.md` invariant I9.
**Companion**: `contracts/flow-sharing.md` — the read/write contract this copy makes good
on. Read that first; this document only stages its copy for approval.

---

## Why this document exists

`contracts/flow-sharing.md` requires FR-032 to be *stated*, not implied: "existing
independent duplicates are unaffected by revoking a share... a plain sentence next to the
revoke control, not a confirmation dialog." It ends with an open
`**[OWNER SIGN-OFF]**` marker on that copy.

The copy was written and shipped alongside the rest of US3 (`FlowShare.tsx`), and it
already passes the copy-lint (009, CI-gating as of `448ee6a`). What was missing was a
place for the owner to see every string on this surface in one place and say yes — this
document is that place, not new drafting.

---

## The strings, as shipped

All five, verbatim from `src/app/flows/[id]/FlowShare.tsx`, with the invariant or
requirement each one serves.

### The FR-032 caption — the one this contract is really about

> Copies other people have already made are their own flows. Stopping sharing closes this
> flow to your organization and leaves those copies as they are. Your per-pose notes are
> yours alone and are never part of what you share.

(`FlowShare.tsx:162-170`, `data-testid="share-caption"`.) Two facts, stated as facts about
the schema rather than reassurances: revoking `shared_org_id` does not touch existing
duplicates (I9), and `flow_item_notes` never crosses the share boundary regardless of share
state (I1–I3). Sits next to the "Stop sharing" control, not behind a link or a dialog.

### Status lines

> Shared with {org name}. Anyone there can read this flow and make their own copy.

> This flow is on this device and not yet in your account. Sharing starts once it has
> saved.

> Only you can see this flow.

(`FlowShare.tsx:129-135`, `data-testid="share-status"`.) The middle line is the `absent`
state — a flow written offline that has not synced yet — kept as its own sentence rather
than folded into "not shared," because "not shared" and "not there to share" are different
facts a teacher needs told apart.

### Error strings

> This flow could not be shared. Your copy on this device is unchanged.

> Sharing could not be stopped just now. Your copy on this device is unchanged.

(`FlowShare.tsx:84`, `:98`.) Both name what did *not* happen (the local copy) rather than
only what failed — the failure mode a teacher actually fears here is data loss, not the
network call.

### Control label

> Stop sharing

(`FlowShare.tsx:139-145`, `data-testid="share-stop"`.) One click, no confirmation dialog —
`contracts/flow-sharing.md` requires revoke to read as a plain action, not an alarm, and a
confirm step is exactly the framing RULE-C2 (no urgency, no countdown) rules out here.

---

## What the copy-lint already checked, and what it cannot

`npm run lint:copy` passes on all five strings today (385 strings scanned, 0 violations).
Per `VOICE.md` §6 and the copy-lint's own printed disclaimer, that check is mechanical —
banned words, structural patterns — not a judgment that these are the *right* words. What
it cannot check, and what this sign-off is actually for:

- Whether "leaves those copies as they are" reads as a promise a practitioner would
  believe, or as hedging.
- Whether naming "per-pose notes" specifically (rather than "your notes") is clear or
  jargon to a teacher who has not seen the term elsewhere in the product.
- Whether the two error strings' shared clause ("Your copy on this device is unchanged")
  is reassuring or repetitive read back to back — they cannot both fire, but a reviewer
  reading the file top to bottom sees them adjacent.

---

## What sign-off unblocks

Ticking T037 in `specs/004-sequencing-composer/tasks.md`, which closes the last open item
in US3's Phase 4 gate — every row of `contracts/flow-sharing.md`'s invariant table is
already proven (I1–I10), so this is the only thing between US3 and being fully shipped, not
just fully built.

No code changes ride on this sign-off; the strings are already in production. Rejecting a
string here means a follow-up copy-only PR, not a schema or RLS change.
