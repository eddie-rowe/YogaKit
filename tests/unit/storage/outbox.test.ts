import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('idb', async () => (await import('./fake-idb')).idbModuleMock)

import { fakeIdb } from './fake-idb'
import {
  enqueueDelete,
  enqueueUpsert,
  getAllEntries,
  getEntry,
  markDead,
  recordAttempt,
  removeEntry,
  revive,
  clearOutbox,
} from '@/lib/storage/outbox'
import type { Flow } from '@/lib/flow/types'

function flow(id: string, title = id): Flow {
  return {
    id,
    title,
    items: [],
    phases: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: false,
  } as unknown as Flow
}

describe('outbox', () => {
  beforeEach(() => fakeIdb.reset())

  it('collapses repeated edits to one entry carrying the latest state (FR-017)', async () => {
    await enqueueUpsert(flow('a', 'first'))
    await enqueueUpsert(flow('a', 'second'))
    await enqueueUpsert(flow('a', 'third'))

    const entries = await getAllEntries()
    expect(entries).toHaveLength(1)
    expect((entries[0].payload as Flow).title).toBe('third')
  })

  it('lets a delete supersede a queued upsert for the same flow', async () => {
    await enqueueUpsert(flow('a'))
    await enqueueDelete('a')

    const entry = await getEntry('a')
    expect(entry?.op).toBe('delete')
    expect(entry?.payload).toBeNull()
  })

  it('keeps flows apart — coalescing is per flow, not global', async () => {
    await enqueueUpsert(flow('a'))
    await enqueueUpsert(flow('b'))

    expect(await getAllEntries()).toHaveLength(2)
  })

  it('counts failures, not sends, so "not yet" and "never" are distinguishable', async () => {
    await enqueueUpsert(flow('a'))
    expect((await getEntry('a'))?.attempts).toBe(0)

    await recordAttempt('a', 'offline')
    await recordAttempt('a', 'offline')

    const entry = await getEntry('a')
    expect(entry?.attempts).toBe(2)
    expect(entry?.lastError).toBe('offline')
    expect(entry?.state).toBe('queued')
  })

  it('resets the failure count when a fresh edit replaces the payload', async () => {
    // A new payload has not failed yet. Inheriting the old count would let an edit
    // arrive already carrying someone else's history.
    await enqueueUpsert(flow('a'))
    await recordAttempt('a', 'offline')

    await enqueueUpsert(flow('a', 'edited'))

    const entry = await getEntry('a')
    expect(entry?.attempts).toBe(0)
    expect(entry?.lastError).toBeNull()
  })

  it('stops retrying a rejected payload (FR-016)', async () => {
    await enqueueUpsert(flow('a'))
    await markDead('a', 'invalid input syntax for type uuid')

    const entry = await getEntry('a')
    expect(entry?.state).toBe('dead')
    expect(entry?.lastError).toContain('uuid')
  })

  it('reopens a dead entry only on an explicit revive', async () => {
    await enqueueUpsert(flow('a'))
    await markDead('a', 'rejected')

    await revive('a')

    expect((await getEntry('a'))?.state).toBe('queued')
    // The failure history survives the revive: it is evidence, not a counter to reset.
    expect((await getEntry('a'))?.attempts).toBe(1)
  })

  it('does not resurrect an entry that was removed mid-flight', async () => {
    // The send succeeded and the entry was deleted; a late failure report for the same
    // flow must not put a superseded payload back in the queue.
    await enqueueUpsert(flow('a'))
    await removeEntry('a')

    await recordAttempt('a', 'timeout')
    await markDead('a', 'rejected')
    await revive('a')

    expect(await getAllEntries()).toHaveLength(0)
  })

  it('empties on sign-out without touching flows', async () => {
    fakeIdb.raw('flows').set('a', { ...flow('a'), syncState: 'pending' })
    await enqueueUpsert(flow('a'))

    await clearOutbox()

    expect(await getAllEntries()).toHaveLength(0)
    expect(fakeIdb.raw('flows').size).toBe(1)
  })
})
