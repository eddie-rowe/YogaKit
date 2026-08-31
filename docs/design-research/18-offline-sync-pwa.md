# Offline Sync & PWA

**YogaKit surface:** public/sw.js, src/lib/storage/flow-store.ts (outbox/dead-letter pattern planned, not built)
**Status:** partial — offline read/write via IndexedDB built; sync-status UI planned

## The interaction problem
Offline-first apps make a promise that is easy to state and hard to keep visible: the user's work is never lost, even when the network is not there to prove it. The failure mode isn't usually data loss — it's *trust* loss, when a user can't tell whether their edit is saved, syncing, stuck, or silently dropped. The interaction problem is showing enough sync truth to keep the user calm and informed, without turning every offline moment into an alarm, a spinner that never resolves, or a retry loop the user can't escape.

## Best in class

### 1. Linear — web/desktop, local-first sync engine, current through 2026
- **What they do:** The word "Syncing" appears next to the workspace name in the sidebar only when there's a real backlog — many queued changes or a send taking longer than expected — with a count of pending changes. Below that threshold, sync is invisible. Offline edits are stored as durable `SyncAction` objects in IndexedDB and retried automatically on reconnect, even across an app restart.
- **Why it works:** The indicator is threshold-gated, not always-on — it appears only when there's something worth telling the user, so it doesn't become background noise they learn to ignore.
- **Source:** https://marknotfound.com/posts/reverse-engineering-linears-sync-magic/ and https://www.techinterview.org/companies/linear/

### 2. Google Docs — web, offline editing + sync, current through 2026
- **What they do:** A spinning icon in the toolbar appears only during active sync after reconnect; it disappears with an explicit confirmation once sync completes. Offline editing must be turned on per-file ("Make available offline") so the affordance is opt-in and the user always knows which state they're in.
- **Why it works:** A transient, self-resolving icon plus an explicit "done" confirmation avoids the worst failure mode of sync UI — a spinner that never resolves — by giving the user a clear start and end to the syncing state.
- **Source:** https://support.google.com/docs/answer/6388102

### 3. Figma — web, real-time collaboration tool with explicit non-offline stance, current through 2026 (confirmed by Figma team, April 2026 forum thread)
- **What they do:** Figma is explicit that autosave is a safeguard, not an offline mode: it stores changes made while offline in the browser and gives the user an explicit choice to keep or discard them on reconnect, rather than silently reconciling. It also plainly lists what is and isn't possible offline (no multiplayer, no navigating to unopened files) instead of letting the user discover the limits by hitting them.
- **Why it works:** Naming the limitation up front, and making data retention an explicit user choice rather than an automatic merge, prevents the worse outcome of a tool pretending to support something it can't fully guarantee.
- **Source:** https://help.figma.com/hc/en-us/articles/360040328553-What-can-I-do-offline-in-Figma

### 4. Obsidian Sync — desktop/mobile note app, local-first vault sync, current through 2026
- **What they do:** Each device keeps a full local vault as the source of truth; offline edits queue and sync on reconnect. Conflicts don't fail silently — Markdown files merge automatically (diff-match-patch), while genuine conflicts are written out as a separate, clearly-named `*.sync-conflict-<timestamp>.md` file the user can review, rather than picking a winner and discarding data.
- **Why it works:** When automatic merge can't safely resolve a conflict, surfacing both versions as visible artifacts (rather than a blocking dialog or silent overwrite) respects user data without demanding an interrupt.
- **Source:** https://obsidian.md/help/sync/vault-types and https://deepwiki.com/obsidianmd/obsidian-help/2.3-synchronization-and-conflict-resolution

### 5. Banking apps — mobile, offline transaction queues, pattern synthesis current through 2026
- **What they do:** High-risk actions (transfers, card changes) get a first-class visible "pending" state — a pill or label the user can see and understand — so they know the receiving party hasn't yet seen the change. Low-risk edits sync silently in the background. Underlying state machines (`PENDING → IN_FLIGHT → SYNCED | FAILED | CONFLICT`) persist to a durable on-device queue before ever hitting the network, so a killed app or dead battery can't lose the action.
- **Why it works:** Matching visibility to stakes — loud for money-moving actions, silent for everything else — avoids both under-informing the user on things that matter and over-alerting them on things that don't.
- **Source:** https://beefed.ai/en/offline-first-queueing-sync

## Cross-cutting patterns
- Sync UI is threshold- or state-gated, not permanently visible: it shows up when there's a backlog or an active transition, and disappears when settled (Linear, Google Docs).
- Durable local persistence happens before any network attempt — the write is safe the instant it's made, sync is a background reconciliation, never a precondition for feeling "saved" (banking pattern, Obsidian).
- Conflicts are made visible as artifacts (a conflict file, a discard/keep choice) rather than silently resolved with data loss, except for low-stakes fields where automatic last-writer-wins is acceptable and disclosed (Obsidian, Figma).
- Apps that can't offer full offline parity say so explicitly and scope it (Figma's "what you can/can't do offline" list) instead of letting users discover gaps by trial and error.
- Visibility is matched to stakes: high-risk or collaborative actions get a persistent named state; routine edits sync invisibly (banking pattern, Linear's threshold gating).

## Anti-patterns observed
- A sync spinner with no resolved/settled state — several Google Docs support threads describe "syncing offline changes" hanging indefinitely with no way to tell if it's stuck or just slow (https://support.google.com/docs/thread/4677179/google-sheets-stuck-on-syncing-offline-changes).
- Silent last-write-wins on real user content: Linear's own docs admit that offline edits can silently overwrite a teammate's changes on reconnect with no warning, because it doesn't check timestamps before applying updates.
- Treating "offline" as an edge case that surfaces as a generic, alarming error rather than a named, expected state — this trains users to treat routine offline usage as something broken.

## Fold into YogaKit
- **Quick win** — Extend `flow-store.ts` with a lightweight `syncState` field per record (`synced | pending | failed`) so the write path already distinguishes these before any UI exists.
- **Quick win** — When the outbox has entries, show a small, dismissible-but-persistent-until-settled label near the flow list (not a modal, not a spinner) reading something like "Saved on this device — syncing when you're back online," matching Linear's threshold-gated approach: show nothing when the outbox is empty.
- **Spec 004** — Implement the outbox + dead-letter table itself: flush on `online`, on focus, and every 60s, exactly as planned; each entry needs a durable local write (IndexedDB) before any network attempt, mirroring the banking-pattern queue-before-network discipline.
- **Spec 004** — On permanent sync failure (dead-letter), surface exactly one non-blocking banner ("Some changes from [date] couldn't sync — your local copy is safe") with a manual "retry" action the user can trigger, but never an automatic retry loop; this maps to constitution RULE-L2/L4 and avoids Google Docs' unresolved-spinner failure mode.
- **Needs decision** — Conflict handling for flows edited on two devices offline: whether YogaKit should follow Obsidian's model (write a `*-conflict` copy, let the user reconcile) or a simpler last-writer-wins with a visible "an older version of this flow synced later and was replaced" notice. Given flows are personal (not collaborative), last-writer-wins with disclosure is likely lower-cost than full conflict UI, but this should be an explicit spec decision, not an implementation default.
- **Needs decision** — Whether the pending/syncing indicator should live per-flow (a small pill on each flow card, banking-style) or globally (a single header state, Linear-style) — per-flow is more informative but adds render surface to every list item; global is cheaper for Lighthouse (RULE-L6) but less specific.

## Constitution check
- **RULE-L1/L2 (installable PWA, offline core functionality):** Already satisfied by `public/sw.js`'s cache-first shell precache and `flow-store.ts`'s IndexedDB persistence; no sync-UI work threatens this, since the read/write path is independent of any sync indicator rendering.
- **RULE-L3/L4 (read never requires auth/network; write requires auth):** The planned outbox pattern preserves this — a write is accepted locally and queued regardless of auth/network state for already-authenticated sessions, and reads of cached flows never touch the network or an auth check. The sync-status banner must be additive UI, never a gate in front of the read view.
- **One non-blocking banner, never a retry loop:** Directly specified in this report's "Fold into YogaKit" section above — dead-letter failures get one dismissible/manual-retry banner, not an automatic loop, consistent with the "no guilt, no urgency, no countdown" spirit of Principle VII even though that principle is written for streaks specifically.
- **Entitlements never cached for enforcement offline:** The sync-status UI must not attempt to gate any feature based on cached entitlement state; it only reports flow-sync status, never access level. This report proposes no entitlement-related UI, in keeping with RULE-L3's generous-default design already in the constitution.
- **RULE-L6 (Lighthouse mobile ≥90 on read view):** The sync indicator must be a small, non-blocking DOM element that doesn't fetch, poll visibly, or animate continuously — a settled/empty state should render nothing, keeping the read view's performance budget untouched.
- **Sign-out clears all IndexedDB stores (shared-device safety):** Not yet verified in `flow-store.ts`, which currently only exposes `saveFlow`/`getFlow`/`getAllFlows`/`deleteFlow` — no observed sign-out hook that clears the `krama` DB. This is a gap worth flagging for spec 004: sign-out must clear the outbox and flow cache, not just app state, or a shared device leaks the prior user's flows to whoever signs in next.
- **One-accent typography-first design, ≤200ms no-bounce motion:** The proposed banner/label should use a single existing accent color for the "syncing" state (no new color introduced for sync status) and any transition (banner appearing/disappearing) should be a simple fade/slide under 200ms with no bounce or spring easing, consistent with the app's existing motion constraints.

All web-search claims above are cited with URLs; the note on `flow-store.ts` lacking a sign-out-clear hook is based on direct reading of the current file's exported functions (`saveFlow`, `getFlow`, `getAllFlows`, `deleteFlow`) and is flagged as a gap rather than a verified defect, since a clearing call could exist elsewhere in the auth flow that this research did not scan.
