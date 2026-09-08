// The outbox — one pending write per flow, durable before any network attempt.
//
// specs/004-sequencing-composer/data-model.md §5. This module is the queue and nothing
// else: it does not know what a session is, when to flush, or how to talk to Supabase.
// That is `sync.ts`, which is the only caller of the mutating functions here.

import type { Flow } from '@/lib/flow/types'
import { getDb, OUTBOX_STORE } from './db'

/** `queued` is waiting to be sent. `dead` can never succeed and has stopped being
 *  retried (FR-016) — the server rejected the payload rather than being unreachable. */
export type OutboxState = 'queued' | 'dead'

export interface OutboxEntry {
  /** The key. One entry per flow, replaced on every write — see `enqueueUpsert`. */
  flowId: string
  op: 'upsert' | 'delete'
  /** The whole flow for an upsert; `null` for a delete, which needs only the id. */
  payload: Flow | null
  queuedAt: string
  /** Failed sends, not sends. Distinguishes "not yet" from "never". */
  attempts: number
  lastError: string | null
  state: OutboxState
}

/** Replacement, not append — and that is the design, not an optimisation.
 *
 *  FR-017 says several queued edits to one flow must converge on the final intended
 *  state. Keying the store on `flowId` makes that structural: there is never a
 *  sequence to replay, so there is no replay to get wrong. It also bounds the queue
 *  by how many flows a teacher has rather than by how much they typed — a teacher
 *  editing one flow on a long train journey queues one entry, not four hundred.
 *
 *  `attempts` resets, deliberately. A fresh edit is a different payload, and the
 *  failure count that belonged to the old one says nothing about this one. Carrying
 *  it forward would let an edit inherit a dead-letter it never earned. */
/** The outbox changed. The header label listens for this rather than polling, so a
 *  settled queue costs nothing and the label is never a timer with a UI attached.
 *  Same-tab only, deliberately — a second tab has its own flush loop and its own
 *  header, and cross-tab coordination is not something FR-014 asks for. */
const CHANGED_EVENT = 'krama:outbox-changed'

function announce(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

export function subscribeOutbox(listener: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, listener)
  return () => window.removeEventListener(CHANGED_EVENT, listener)
}

export async function enqueueUpsert(flow: Flow): Promise<void> {
  const db = await getDb()
  await db.put(OUTBOX_STORE, {
    flowId: flow.id,
    op: 'upsert',
    payload: flow,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    state: 'queued',
  } satisfies OutboxEntry)
  announce()
}

/** A delete replaces any queued upsert for the same flow, for the same reason:
 *  the final intended state of a flow the teacher deleted is "gone". Sending the
 *  upsert first would recreate it on the server for as long as the flush took. */
export async function enqueueDelete(flowId: string): Promise<void> {
  const db = await getDb()
  await db.put(OUTBOX_STORE, {
    flowId,
    op: 'delete',
    payload: null,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
    state: 'queued',
  } satisfies OutboxEntry)
  announce()
}

export async function getEntry(flowId: string): Promise<OutboxEntry | undefined> {
  const db = await getDb()
  return db.get(OUTBOX_STORE, flowId)
}

export async function getAllEntries(): Promise<OutboxEntry[]> {
  const db = await getDb()
  return db.getAll(OUTBOX_STORE)
}

/** Called after a send succeeds. The entry is the record that work is outstanding,
 *  so removing it is what marks the work done. */
export async function removeEntry(flowId: string): Promise<void> {
  const db = await getDb()
  await db.delete(OUTBOX_STORE, flowId)
  announce()
}

/** A send that failed for a reason that might not repeat — offline, a timeout, a
 *  5xx. The entry stays `queued` and the next trigger tries again. */
export async function recordAttempt(flowId: string, error: string): Promise<void> {
  const db = await getDb()
  const entry: OutboxEntry | undefined = await db.get(OUTBOX_STORE, flowId)
  // Gone means a later write removed or replaced it while this send was in flight.
  // Re-adding it here would resurrect a superseded payload.
  if (!entry) return
  await db.put(OUTBOX_STORE, {
    ...entry,
    attempts: entry.attempts + 1,
    lastError: error,
  })
  announce()
}

/** FR-016's dead letter: a send the server refused on its merits. Retrying it will
 *  refuse it again, so it stops here and surfaces once through the banner. */
export async function markDead(flowId: string, error: string): Promise<void> {
  const db = await getDb()
  const entry: OutboxEntry | undefined = await db.get(OUTBOX_STORE, flowId)
  if (!entry) return
  await db.put(OUTBOX_STORE, {
    ...entry,
    attempts: entry.attempts + 1,
    lastError: error,
    state: 'dead',
  })
  announce()
}

/** Empties the queue. Called on sign-out, and only there.
 *
 *  The whole queue goes, not the subset `clearSyncedFlows` would pick. Every entry in it
 *  was enqueued by the session that is ending — `queueUpsert` refuses to write one
 *  otherwise — so an entry that survived sign-out would flush one person's flow into the
 *  next person's account on a shared device. That is the leak UX-011 is about, pointing
 *  the other way.
 *
 *  The flows themselves are not touched here. An entry is a note that the server has not
 *  been told; deleting the note destroys nothing, because the flow it describes is still
 *  on disk. Which flows survive sign-out is `clearSyncedFlows`'s decision alone (RULE-L4),
 *  and this must not quietly become a second one.
 *
 *  A flow that was still queued reads `pending` afterwards, which is exactly true: it is
 *  on this device and nowhere else. Signing back in and saving it queues it again. */
export async function clearOutbox(): Promise<void> {
  const db = await getDb()
  await db.clear(OUTBOX_STORE)
  announce()
}

/** Puts a dead entry back in the queue. The manual retry behind FR-015's banner, and
 *  the only way out of `dead` — nothing automatic reopens one. */
export async function revive(flowId: string): Promise<void> {
  const db = await getDb()
  const entry: OutboxEntry | undefined = await db.get(OUTBOX_STORE, flowId)
  if (!entry) return
  await db.put(OUTBOX_STORE, { ...entry, state: 'queued' })
  announce()
}
