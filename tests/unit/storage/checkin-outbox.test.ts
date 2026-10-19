import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('idb', async () => (await import('./fake-idb')).idbModuleMock)

import { fakeIdb } from './fake-idb'
import {
  checkinSyncState,
  enqueueCheckin,
  flushCheckins,
  getAllCheckinEntries,
  getCheckinEntry,
  type CheckinInput,
} from '@/lib/storage/checkin-outbox'

const practice: CheckinInput = {
  kind: 'practice',
  durationMinutes: 30,
  reflection: null,
  flowId: null,
}

// 2026-03-10 23:30 in New York is already the 11th in UTC.
const lateNewYork = new Date('2026-03-11T03:30:00Z')

describe('checkin outbox', () => {
  beforeEach(() => fakeIdb.reset())

  it('queues an offline check-in under the local day it was submitted (FR-005)', async () => {
    const entry = await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    expect(entry.localDate).toBe('2026-03-10')
    expect(await getCheckinEntry('2026-03-10')).toMatchObject({ kind: 'practice', state: 'queued' })
  })

  it('survives a reload: the queue is read back from storage, not memory', async () => {
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    // A reload drops module state; the store is the only thing that persists.
    expect(await getAllCheckinEntries()).toHaveLength(1)
  })

  it('replaces a second check-in on the same local day (FR-008)', async () => {
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    await enqueueCheckin({ ...practice, durationMinutes: 45 }, lateNewYork, 'America/New_York')
    const entries = await getAllCheckinEntries()
    expect(entries).toHaveLength(1)
    expect(entries[0].durationMinutes).toBe(45)
  })

  it('never reports a queued check-in as synced (FR-010)', async () => {
    expect(await checkinSyncState('2026-03-10')).toBe('none')
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    expect(await checkinSyncState('2026-03-10')).toBe('saved-on-device')
  })

  it('delivers exactly once and empties the queue on a confirmed send', async () => {
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    const send = vi.fn().mockResolvedValue({ ok: true })
    await flushCheckins(send)
    await flushCheckins(send)
    expect(send).toHaveBeenCalledTimes(1)
    expect(await getAllCheckinEntries()).toHaveLength(0)
  })

  it('does not recompute the local day on flush', async () => {
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    const send = vi.fn().mockResolvedValue({ ok: true })
    await flushCheckins(send)
    expect(send.mock.calls[0][0].localDate).toBe('2026-03-10')
  })

  it('keeps a failed send queued with its error, never "synced"', async () => {
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    await flushCheckins(vi.fn().mockResolvedValue({ ok: false, retryable: true, error: 'offline' }))
    expect(await getCheckinEntry('2026-03-10')).toMatchObject({
      state: 'queued',
      attempts: 1,
      lastError: 'offline',
    })
    expect(await checkinSyncState('2026-03-10')).toBe('saved-on-device')
  })

  it('treats a thrown send as a retryable failure', async () => {
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    await flushCheckins(vi.fn().mockRejectedValue(new Error('network down')))
    expect(await getCheckinEntry('2026-03-10')).toMatchObject({ state: 'queued', lastError: 'network down' })
  })

  it('stops retrying a send the server refused on its merits', async () => {
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    const refuse = vi.fn().mockResolvedValue({ ok: false, retryable: false, error: 'rejected' })
    await flushCheckins(refuse)
    await flushCheckins(refuse)
    expect(refuse).toHaveBeenCalledTimes(1)
    expect(await getCheckinEntry('2026-03-10')).toMatchObject({ state: 'dead' })
  })

  it('does not drop an entry replaced while its send was in flight', async () => {
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    const send = vi.fn().mockImplementation(async () => {
      await enqueueCheckin({ ...practice, durationMinutes: 50 }, lateNewYork, 'America/New_York')
      return { ok: true }
    })
    await flushCheckins(send)
    expect(await getCheckinEntry('2026-03-10')).toMatchObject({ durationMinutes: 50 })
  })

  it('does not resurrect an entry removed while its send was in flight', async () => {
    await enqueueCheckin(practice, lateNewYork, 'America/New_York')
    const send = vi.fn().mockImplementation(async () => {
      fakeIdb.reset()
      return { ok: false, retryable: true, error: 'x' }
    })
    await flushCheckins(send)
    expect(await getAllCheckinEntries()).toHaveLength(0)
  })
})
