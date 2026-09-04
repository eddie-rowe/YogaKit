// Flow persistence — IndexedDB via idb. Local-first, no server (constitution RULE-L3).
//
// The connection itself lives in `./db`, shared with the outbox. See that file for why.

import type { Flow } from '@/lib/flow/types'
import { getDb, FLOWS_STORE } from './db'
import { getAllEntries, getEntry, type OutboxEntry } from './outbox'

/** Where a locally-durable flow stands relative to the server. */
export type SyncState = 'synced' | 'pending' | 'failed'

/** A flow as it sits on disk: the domain entity plus its replication status. */
export type StoredFlow = Flow & { syncState: SyncState }

/** The rule for reading a flow's sync state off two sources of truth.
 *
 *  data-model.md §5 says "a flow with no outbox entry is synced". Implemented
 *  literally that is unsafe, and the deviation is recorded in DECISIONS.md. The
 *  outbox is authenticated-only by decision 3 of the plan, so a signed-out
 *  teacher never has an entry for anything — and every flow they ever made
 *  would read back `synced`. `clearSyncedFlows()` on the next sign-out would
 *  then delete work that has never left the device: RULE-L4, precisely.
 *
 *  So `synced` requires positive evidence. The stored field is written `synced`
 *  by exactly one thing — a flush that the server acknowledged — and absence of
 *  an entry only confirms that nothing is outstanding, it does not by itself
 *  promise the work arrived anywhere.
 *
 *  A `dead` entry reads `failed`: it has stopped being retried and needs a
 *  person. Any other entry reads `pending`, whatever the stored field says,
 *  because an edit made after a successful flush is genuinely unsent again. */
export function deriveSyncState(
  stored: SyncState | undefined,
  entry: OutboxEntry | undefined,
): SyncState {
  if (entry?.state === 'dead') return 'failed'
  if (entry) return 'pending'
  return stored ?? 'pending'
}

export async function saveFlow(flow: Flow, syncState: SyncState = 'pending'): Promise<void> {
  const db = await getDb()
  await db.put(FLOWS_STORE, { ...flow, syncState })
}

export async function getFlow(id: string): Promise<StoredFlow | undefined> {
  const db = await getDb()
  const flow = await db.get(FLOWS_STORE, id)
  if (!flow) return undefined
  return { ...flow, syncState: deriveSyncState(flow.syncState, await getEntry(id)) }
}

export async function getAllFlows(): Promise<StoredFlow[]> {
  const db = await getDb()
  const flows = await db.getAll(FLOWS_STORE)
  // One read of the outbox for the whole list rather than one per flow: a teacher
  // with sixty flows should not cost sixty transactions to render a list.
  const entries = new Map((await getAllEntries()).map(entry => [entry.flowId, entry]))
  return flows.map(flow => ({
    ...flow,
    syncState: deriveSyncState(flow.syncState, entries.get(flow.id)),
  }))
}

export async function deleteFlow(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(FLOWS_STORE, id)
}

/** Drops every locally-cached flow, synced or not.
 *
 *  Sign-out does NOT call this — see `clearSyncedFlows` below for why. This is
 *  the primitive for a deliberate "forget everything on this device" action,
 *  where destroying unsynced local work is the whole point. */
export async function clearAllFlows(): Promise<void> {
  const db = await getDb()
  await db.clear(FLOWS_STORE)
}

/** Drops flows that came from the account, keeping work authored on this device.
 *
 *  `clearAllFlows` above is the blunt instrument, and sign-out used to call it.
 *  That satisfied specs/004-sequencing-composer UX-011 (shared-device safety) by
 *  violating RULE-L4 and docs/design-research/16-auth-onboarding-claim.md, which
 *  is explicit: "signing out must never clear or hide the IndexedDB-cached flows
 *  that were working offline before any account existed." An anonymous
 *  practitioner who signs in once to try it and signs out lost every flow they
 *  had made. See DECISIONS.md for the reconciliation.
 *
 *  Only `synced` records came from the server, so only those can leak to the next
 *  person on a shared device. `pending` and `failed` were authored here and have
 *  no other copy anywhere — deleting them destroys the only one.
 *
 *  @returns how many flows were dropped. */
export async function clearSyncedFlows(): Promise<number> {
  const flows = await getAllFlows()
  const synced = flows.filter(flow => flow.syncState === 'synced')
  await Promise.all(synced.map(flow => deleteFlow(flow.id)))
  return synced.length
}
