import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('idb', async () => (await import('./fake-idb')).idbModuleMock)

const { supabase } = vi.hoisted(() => ({
  supabase: {
    session: null as { user: string } | null,
    rpc: vi.fn(),
  },
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: supabase.session } }) },
    rpc: supabase.rpc,
  }),
}))

import { fakeIdb } from './fake-idb'
import { flushOutbox, queueDelete, queueUpsert } from '@/lib/storage/sync'
import { getAllEntries, getEntry } from '@/lib/storage/outbox'
import { getFlow, saveFlow } from '@/lib/storage/flow-store'
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

const ok = { error: null }
const transient = { error: { message: 'Failed to fetch', code: undefined } }
const rejected = { error: { message: 'invalid input syntax', code: '22P02' } }

beforeEach(() => {
  fakeIdb.reset()
  supabase.session = { user: 'teacher' }
  supabase.rpc.mockReset()
})

describe('queueing', () => {
  it('enqueues nothing when nobody is signed in', async () => {
    supabase.session = null

    await queueUpsert(flow('a'))
    await queueDelete('b')

    expect(await getAllEntries()).toHaveLength(0)
  })

  it('enqueues once there is an account to replicate to', async () => {
    await queueUpsert(flow('a'))

    expect(await getAllEntries()).toHaveLength(1)
  })
})

describe('flushOutbox', () => {
  it('does nothing at all when signed out', async () => {
    supabase.session = null

    const result = await flushOutbox()

    expect(result.skipped).toBe(true)
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('sends one call per flow and marks the local record synced', async () => {
    supabase.rpc.mockResolvedValue(ok)
    await saveFlow(flow('a'))
    await saveFlow(flow('b'))
    await queueUpsert(flow('a'))
    await queueUpsert(flow('b'))

    const result = await flushOutbox()

    expect(result).toMatchObject({ sent: 2, failed: 0, dead: 0, skipped: false })
    expect(supabase.rpc).toHaveBeenCalledTimes(2)
    expect(supabase.rpc).toHaveBeenCalledWith('app_save_flow', { payload: expect.anything() })
    expect(await getAllEntries()).toHaveLength(0)
    expect((await getFlow('a'))?.syncState).toBe('synced')
  })

  it('calls the soft delete for a queued delete', async () => {
    supabase.rpc.mockResolvedValue(ok)
    await queueDelete('a')

    await flushOutbox()

    expect(supabase.rpc).toHaveBeenCalledWith('app_delete_flow', { flow_id: 'a' })
  })

  it('keeps a transient failure queued and counts the attempt', async () => {
    supabase.rpc.mockResolvedValue(transient)
    await saveFlow(flow('a'))
    await queueUpsert(flow('a'))

    const result = await flushOutbox()

    expect(result).toMatchObject({ sent: 0, failed: 1, dead: 0 })
    expect((await getEntry('a'))?.state).toBe('queued')
    expect((await getEntry('a'))?.attempts).toBe(1)
    expect((await getFlow('a'))?.syncState).toBe('pending')
  })

  it('treats a thrown error as transport, not rejection', async () => {
    supabase.rpc.mockRejectedValue(new Error('network down'))
    await queueUpsert(flow('a'))

    const result = await flushOutbox()

    expect(result.failed).toBe(1)
    expect((await getEntry('a'))?.state).toBe('queued')
  })

  it('dead-letters a payload the server refused on its merits (FR-016)', async () => {
    supabase.rpc.mockResolvedValue(rejected)
    await saveFlow(flow('a'))
    await queueUpsert(flow('a'))

    const result = await flushOutbox()

    expect(result.dead).toBe(1)
    expect((await getEntry('a'))?.state).toBe('dead')
    expect((await getFlow('a'))?.syncState).toBe('failed')
  })

  it('never retries a dead entry on its own', async () => {
    supabase.rpc.mockResolvedValue(rejected)
    await queueUpsert(flow('a'))
    await flushOutbox()
    supabase.rpc.mockClear()

    const result = await flushOutbox()

    expect(supabase.rpc).not.toHaveBeenCalled()
    expect(result).toMatchObject({ sent: 0, dead: 1 })
  })

  it('lets one rejected flow dead-letter without blocking the others', async () => {
    supabase.rpc.mockImplementation((_fn: string, args: { payload?: Flow }) =>
      Promise.resolve(args.payload?.id === 'bad' ? rejected : ok),
    )
    await queueUpsert(flow('bad'))
    await queueUpsert(flow('good'))

    const result = await flushOutbox()

    expect(result).toMatchObject({ sent: 1, dead: 1 })
    expect(await getEntry('good')).toBeUndefined()
  })

  it('does not recreate a flow deleted locally between the send and the reply', async () => {
    supabase.rpc.mockResolvedValue(ok)
    await queueUpsert(flow('a')) // never written to `flows`

    await flushOutbox()

    expect(fakeIdb.raw('flows').size).toBe(0)
  })
})
