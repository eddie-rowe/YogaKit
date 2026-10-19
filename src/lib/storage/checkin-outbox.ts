// The check-in outbox — one pending check-in per local day, durable before any network
// attempt (005 FR-010, research.md §2).
//
// Same shape as `outbox.ts` and deliberately not shared with it: that queue is keyed by
// flow and carries a whole `Flow`; this one is keyed by day and carries a signal row plus
// a reflection bound for a different table. Like `outbox.ts` it is the queue and nothing
// else — the caller supplies the `send` function, so this module makes no network call and
// carries no telemetry. Reflection text lives only in this store, on this device.

import { resolveLocalDay } from '@/lib/sadhana/local-day'
import { CHECKINS_OUTBOX_STORE, getDb } from './db'

export type CheckinKind = 'practice' | 'rest'

/** `queued` is waiting to be sent. `dead` was refused on its merits and has stopped
 *  being retried. */
export type CheckinOutboxState = 'queued' | 'dead'

export interface CheckinInput {
  kind: CheckinKind
  durationMinutes: number | null
  reflection: string | null
  flowId: string | null
}

export interface CheckinEntry extends CheckinInput {
  /** The key. `YYYY-MM-DD`, fixed at submission and never recomputed (FR-005). */
  localDate: string
  queuedAt: string
  /** Bumped on every write, so a flush can tell its entry was replaced mid-send. */
  version: number
  attempts: number
  lastError: string | null
  state: CheckinOutboxState
}

export type CheckinSendResult =
  | { ok: true }
  | { ok: false; retryable: boolean; error: string }

/** What this device can honestly say about a day. There is no `synced` here by design:
 *  "recorded" is read from the server-confirmed row, never from the queue (FR-010). */
export type CheckinSyncState = 'none' | 'saved-on-device'

/** Replacement, not append: a second check-in on the same local day updates the first
 *  (FR-008), so the day is the key and there is never a sequence to replay. The local day
 *  is resolved here, from `now`, at submission. */
export async function enqueueCheckin(
  input: CheckinInput,
  now: Date = new Date(),
  timeZone?: string,
): Promise<CheckinEntry> {
  const db = await getDb()
  const localDate = resolveLocalDay(now, timeZone)
  const existing: CheckinEntry | undefined = await db.get(CHECKINS_OUTBOX_STORE, localDate)
  const entry: CheckinEntry = {
    ...input,
    localDate,
    queuedAt: now.toISOString(),
    version: (existing?.version ?? 0) + 1,
    attempts: 0,
    lastError: null,
    state: 'queued',
  }
  await db.put(CHECKINS_OUTBOX_STORE, entry)
  return entry
}

export async function getCheckinEntry(localDate: string): Promise<CheckinEntry | undefined> {
  const db = await getDb()
  return db.get(CHECKINS_OUTBOX_STORE, localDate)
}

export async function getAllCheckinEntries(): Promise<CheckinEntry[]> {
  const db = await getDb()
  return db.getAll(CHECKINS_OUTBOX_STORE)
}

export async function checkinSyncState(localDate: string): Promise<CheckinSyncState> {
  return (await getCheckinEntry(localDate)) ? 'saved-on-device' : 'none'
}

/** Sends every queued entry once. An entry leaves the queue only on a confirmed send, and
 *  only if it was not replaced while the send was in flight — a newer edit must still go. */
export async function flushCheckins(
  send: (entry: CheckinEntry) => Promise<CheckinSendResult>,
): Promise<void> {
  const db = await getDb()
  for (const entry of await getAllCheckinEntries()) {
    if (entry.state !== 'queued') continue
    let result: CheckinSendResult
    try {
      result = await send(entry)
    } catch (e) {
      result = { ok: false, retryable: true, error: e instanceof Error ? e.message : String(e) }
    }
    const current: CheckinEntry | undefined = await db.get(CHECKINS_OUTBOX_STORE, entry.localDate)
    // Gone or replaced: a later write owns this day now. Neither delete nor re-add it.
    if (!current || current.version !== entry.version) continue
    if (result.ok) {
      await db.delete(CHECKINS_OUTBOX_STORE, entry.localDate)
    } else {
      await db.put(CHECKINS_OUTBOX_STORE, {
        ...current,
        attempts: current.attempts + 1,
        lastError: result.error,
        state: result.retryable ? 'queued' : 'dead',
      })
    }
  }
}
