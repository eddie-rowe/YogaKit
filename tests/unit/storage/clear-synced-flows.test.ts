import { describe, it, expect, beforeEach, vi } from 'vitest'

// The behaviour under test is the *selection* rule — which records sign-out is allowed to
// destroy — not the storage engine, so `idb` is the honest boundary. The fake is
// store-aware because `flow-store` now reads the outbox to derive a flow's sync state; a
// single flat map would let a flow and its outbox entry overwrite each other.
vi.mock('idb', async () => (await import('./fake-idb')).idbModuleMock)

import { fakeIdb } from './fake-idb'
import { clearAllFlows, clearSyncedFlows, getAllFlows, saveFlow } from '@/lib/storage/flow-store'
import type { Flow } from '@/lib/flow/types'

function flow(id: string): Flow {
  return {
    id,
    title: id,
    items: [],
    phases: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    isBuiltIn: false,
  } as unknown as Flow
}

describe('clearSyncedFlows', () => {
  beforeEach(() => fakeIdb.reset())

  it('drops only the flows that came from the account', async () => {
    await saveFlow(flow('from-server'), 'synced')
    await saveFlow(flow('written-here'), 'pending')

    const dropped = await clearSyncedFlows()

    expect(dropped).toBe(1)
    expect((await getAllFlows()).map(f => f.id)).toEqual(['written-here'])
  })

  it('keeps a failed upload — it has no other copy either', async () => {
    await saveFlow(flow('never-uploaded'), 'failed')

    await clearSyncedFlows()

    expect(await getAllFlows()).toHaveLength(1)
  })

  it('is a no-op on records written before syncState existed', async () => {
    // Legacy rows read back as `pending`, so signing out must not touch them. This is
    // the RULE-L4 case: flows that worked offline before any account existed survive.
    fakeIdb.raw('flows').set('legacy', { ...flow('legacy') })

    expect(await clearSyncedFlows()).toBe(0)
    expect(await getAllFlows()).toHaveLength(1)
  })

  it('reports zero on an empty store rather than throwing', async () => {
    expect(await clearSyncedFlows()).toBe(0)
  })

  it('is distinct from clearAllFlows, which still takes everything', async () => {
    await saveFlow(flow('written-here'), 'pending')

    await clearAllFlows()

    expect(await getAllFlows()).toHaveLength(0)
  })

  it('keeps a synced flow that has been edited since', async () => {
    // The stored field still says `synced`, but a queued entry means the edit has not
    // reached the server. Reading the stored field alone would delete the edit on
    // sign-out — the exact RULE-L4 failure the derivation rule exists to prevent.
    await saveFlow(flow('edited-since'), 'synced')
    const { enqueueUpsert } = await import('@/lib/storage/outbox')
    await enqueueUpsert(flow('edited-since'))

    expect(await clearSyncedFlows()).toBe(0)
    expect(await getAllFlows()).toHaveLength(1)
  })
})
