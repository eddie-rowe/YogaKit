// Flush the outbox. The only module in the app that turns a local write into a server one.
//
// Everything here is deliberately downstream of storage: `flow-store` and `outbox` do not
// import this file, so a read never waits on sync (plan trap: "a read must never wait on
// sync state", RULE-L3/L4). Nothing in `src/lib/friction/` or `src/lib/validator/` may
// reach this module either — SC-013's import-graph test enforces that mechanically.

import { createClient } from '@/lib/supabase/client'
import {
  enqueueDelete,
  enqueueUpsert,
  getAllEntries,
  markDead,
  recordAttempt,
  removeEntry,
  type OutboxEntry,
} from './outbox'
import type { Flow } from '@/lib/flow/types'
import { getDb, FLOWS_STORE } from './db'

/** How often a foregrounded tab tries again on its own (UX-009). Long enough that a
 *  settled outbox costs nothing, short enough that a reconnection nobody's browser
 *  announced still resolves while the teacher is looking at the screen. */
const FLUSH_INTERVAL_MS = 60_000

/** Postgres classes that mean "this payload will never be accepted".
 *
 *  22 data exception, 23 integrity violation, 42 syntax/access rule — a malformed id, a
 *  broken reference, a policy that forbids the row. Sending it again produces the same
 *  refusal, so FR-016 says stop and tell someone. Everything else — no code at all
 *  (offline, DNS, a dropped socket), 08 connection, 53 insufficient resources, 57
 *  operator intervention — is a moment in time, and the next trigger tries again. */
const PERMANENT_ERROR_CLASSES = ['22', '23', '42']

function isPermanent(code: string | undefined): boolean {
  if (!code) return false
  return PERMANENT_ERROR_CLASSES.includes(code.slice(0, 2))
}

/** Marks the local record as replicated.
 *
 *  Order matters, and it is: write `synced` first, then delete the outbox entry. A crash
 *  between the two leaves an entry for a flow already on the server, and the next flush
 *  sends it again — `app_save_flow` is idempotent, so a duplicate send costs a round trip
 *  and nothing else. The other order loses the entry while the flow still reads `pending`
 *  forever, with nothing left to retry from. */
async function markSynced(flowId: string): Promise<void> {
  const db = await getDb()
  const flow = await db.get(FLOWS_STORE, flowId)
  // Deleted locally between the send and the acknowledgement. There is nothing to mark,
  // and recreating the record here would resurrect a flow the teacher discarded.
  if (!flow) return
  await db.put(FLOWS_STORE, { ...flow, syncState: 'synced' })
}

async function send(client: ReturnType<typeof createClient>, entry: OutboxEntry) {
  if (entry.op === 'delete') {
    return client.rpc('app_delete_flow', { flow_id: entry.flowId })
  }
  return client.rpc('app_save_flow', { payload: entry.payload })
}

/** Whether there is an account for a write to be replicated to.
 *
 *  `getSession()` reads the locally-persisted session and makes no network call, which is
 *  what makes it safe to ask on every debounced keystroke. `getUser()` would round-trip
 *  to the auth server each time a teacher paused typing. */
async function hasSession(client: ReturnType<typeof createClient>): Promise<boolean> {
  const { data } = await client.auth.getSession()
  return data.session !== null
}

function clientOrNull(): ReturnType<typeof createClient> | null {
  try {
    return createClient()
  } catch {
    // No Supabase env in this build. Local-first still works; there is just nowhere
    // to send to, and that is a configuration fact, not a sync failure.
    return null
  }
}

/** Queue a saved flow for replication — the authenticated half of a local write.
 *
 *  Signed out, this does nothing at all, and that is decision 3 of the plan rather than an
 *  optimisation: an anonymous teacher's work is claimed at sign-in by `ClaimFlowsPrompt`,
 *  and a queue that filled up for an account that may never exist would be a second,
 *  competing claim mechanism. It would also make the header label tell someone with no
 *  account that their work is unsynced, which is true and useless.
 *
 *  Call it *after* the local write resolves, never before or in parallel. The entry says
 *  "this is on disk and not yet on the server"; queued before the write, it can outlive a
 *  tab that closed before IndexedDB committed, and then it sends a flow that no longer
 *  exists locally. */
export async function queueUpsert(flow: Flow): Promise<void> {
  const client = clientOrNull()
  if (!client || !(await hasSession(client))) return
  await enqueueUpsert(flow)
}

export async function queueDelete(flowId: string): Promise<void> {
  const client = clientOrNull()
  if (!client || !(await hasSession(client))) return
  await enqueueDelete(flowId)
}

export interface FlushResult {
  sent: number
  failed: number
  dead: number
  /** True when the flush did not run at all — signed out, or no client available.
   *  Distinct from a flush that ran and found nothing to do. */
  skipped: boolean
}

/** Sends every queued entry once, in queue order.
 *
 *  One `app_save_flow` per entry, not one batched call: each flow is independent, and a
 *  payload the server refuses must dead-letter alone rather than blocking the other
 *  eleven flows behind it.
 *
 *  `dead` entries are skipped. They are waiting on a person, and retrying them on a timer
 *  is the automatic retry loop the plan rules out. */
export async function flushOutbox(): Promise<FlushResult> {
  const empty: FlushResult = { sent: 0, failed: 0, dead: 0, skipped: true }

  const client = clientOrNull()
  if (!client || !(await hasSession(client))) return empty

  const result: FlushResult = { sent: 0, failed: 0, dead: 0, skipped: false }
  const entries = await getAllEntries()

  for (const entry of entries) {
    if (entry.state === 'dead') {
      result.dead += 1
      continue
    }
    try {
      const { error } = await send(client, entry)
      if (!error) {
        if (entry.op === 'upsert') await markSynced(entry.flowId)
        await removeEntry(entry.flowId)
        result.sent += 1
      } else if (isPermanent(error.code)) {
        await markDead(entry.flowId, error.message)
        result.dead += 1
      } else {
        await recordAttempt(entry.flowId, error.message)
        result.failed += 1
      }
    } catch (thrown) {
      // A thrown error is transport, not rejection — the request never reached a
      // decision. Always retryable.
      await recordAttempt(entry.flowId, thrown instanceof Error ? thrown.message : String(thrown))
      result.failed += 1
    }
  }

  return result
}

/** Wires the three triggers and returns the teardown.
 *
 *  `online` is the one that matters and the one browsers lie about most, so it is not
 *  alone: `visibilitychange` catches the phone coming out of a pocket on a connection
 *  that never fired an event, and the interval catches everything else. All three call
 *  the same idempotent flush, so overlapping triggers are harmless. */
export function startSync(onFlush?: (result: FlushResult) => void): () => void {
  let running = false

  const run = () => {
    // A flush already in flight covers whatever this trigger noticed.
    if (running) return
    running = true
    void flushOutbox()
      .then(result => onFlush?.(result))
      .finally(() => {
        running = false
      })
  }

  const onVisibility = () => {
    if (document.visibilityState === 'visible') run()
  }

  window.addEventListener('online', run)
  document.addEventListener('visibilitychange', onVisibility)
  const interval = window.setInterval(run, FLUSH_INTERVAL_MS)

  run()

  return () => {
    window.removeEventListener('online', run)
    document.removeEventListener('visibilitychange', onVisibility)
    window.clearInterval(interval)
  }
}
