import { describe, it, expect, beforeEach, vi } from 'vitest'

// idb talks to a real IndexedDB, which jsdom doesn't provide. The behaviour under
// test is the *selection* rule — which records sign-out is allowed to destroy —
// not the storage layer, so an in-memory store is the honest boundary here.
const { store } = vi.hoisted(() => ({ store: new Map<string, Record<string, unknown>>() }))

vi.mock('idb', () => ({
  openDB: async () => ({
    get: async (_s: string, id: string) => store.get(id),
    getAll: async () => [...store.values()],
    put: async (_s: string, value: Record<string, unknown>) => {
      store.set(value.id as string, value)
    },
    delete: async (_s: string, id: string) => {
      store.delete(id)
    },
    clear: async () => store.clear(),
    objectStoreNames: { contains: () => true },
  }),
}))

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
  beforeEach(() => store.clear())

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
    // Legacy rows read back as `pending` via withSyncState, so signing out must
    // not touch them. This is the RULE-L4 case: flows that worked offline before
    // any account existed survive a sign-out.
    store.set('legacy', { ...flow('legacy') })

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
})
