import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SharedFlow } from '@/lib/storage/sharing'

// The share read/write path (004 US3). Supabase is mocked: what is being tested is the
// query this module asks for and the shape it assembles, which is exactly where a note
// would have to reappear. The policies themselves are proven against real Postgres in
// scripts/verify-migrations.sh (I3-I9) — that is the right place for them, and this is
// the right place for the client's half.

const { state, saveFlowMock, queueUpsertMock } = vi.hoisted(() => ({
  state: {
    results: {} as Record<string, { data: unknown; error: unknown }>,
    calls: [] as unknown[][],
    session: { user: { id: 'me' } } as { user: { id: string } } | null,
  },
  saveFlowMock: vi.fn().mockResolvedValue(undefined),
  queueUpsertMock: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getSession: async () => ({ data: { session: state.session } }) },
    from(table: string) {
      const chain: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'neq', 'not', 'is', 'in', 'order', 'update', 'maybeSingle']) {
        chain[method] = (...args: unknown[]) => {
          state.calls.push([table, method, ...args])
          return chain
        }
      }
      chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve(state.results[table] ?? { data: null, error: null }).then(resolve, reject)
      return chain
    },
  }),
}))

vi.mock('@/lib/storage/flow-store', () => ({ saveFlow: saveFlowMock }))
vi.mock('@/lib/storage/sync', () => ({ queueUpsert: queueUpsertMock }))

const {
  listMyOrgs,
  getFlowShare,
  shareFlowWithOrg,
  revokeFlowShare,
  listFlowsSharedWithMe,
  adoptSharedFlow,
} = await import('@/lib/storage/sharing')

function sharedRow() {
  return {
    id: 'server-flow-1',
    title: 'Standing sequence',
    schema_version: '0.1.0',
    created_at: '2026-09-01T00:00:00.000Z',
    updated_at: '2026-09-02T00:00:00.000Z',
    user_id: 'author',
    shared_org_id: 'org-1',
    organizations: { name: 'Willow Studio' },
    phases: [{ id: 'p1', name: 'Warm', intent_tag: 'brahmana', position: 0 }],
    flow_items: [
      { id: 'i2', pose_slug: 'savasana', mode: 'yin', measure_breaths: null, measure_seconds: 300, phase_id: null, position: 1 },
      { id: 'i1', pose_slug: 'tadasana', mode: 'yang', measure_breaths: 5, measure_seconds: null, phase_id: 'p1', position: 0 },
    ],
  }
}

beforeEach(() => {
  state.results = {}
  state.calls = []
  state.session = { user: { id: 'me' } }
  saveFlowMock.mockClear()
  queueUpsertMock.mockClear()
})

describe('listMyOrgs', () => {
  it('returns the active memberships, flattening the embedded name', async () => {
    state.results.memberships = {
      data: [{ org_id: 'org-1', status: 'active', organizations: { name: 'Willow Studio' } }],
      error: null,
    }
    expect(await listMyOrgs()).toEqual([{ id: 'org-1', name: 'Willow Studio' }])
  })

  it('is empty and asks nothing when there is no session', async () => {
    state.session = null
    expect(await listMyOrgs()).toEqual([])
    expect(state.calls).toEqual([])
  })
})

describe('getFlowShare / shareFlowWithOrg / revokeFlowShare', () => {
  it('reads the one column', async () => {
    state.results.flows = { data: { shared_org_id: 'org-1' }, error: null }
    expect(await getFlowShare('flow-1')).toBe('org-1')
  })

  it('reads null for a flow that has never reached the account', async () => {
    state.results.flows = { data: null, error: null }
    expect(await getFlowShare('flow-1')).toBeNull()
  })

  it('shares and revokes by updating shared_org_id and nothing else', async () => {
    await shareFlowWithOrg('flow-1', 'org-1')
    await revokeFlowShare('flow-1')
    const updates = state.calls.filter(c => c[1] === 'update')
    expect(updates).toEqual([
      ['flows', 'update', { shared_org_id: 'org-1' }],
      ['flows', 'update', { shared_org_id: null }],
    ])
  })

  it('surfaces a rejected share rather than reporting success', async () => {
    state.results.flows = { data: null, error: { message: 'new row violates row-level security policy' } }
    await expect(shareFlowWithOrg('flow-1', 'org-elsewhere')).rejects.toBeTruthy()
  })
})

describe('listFlowsSharedWithMe', () => {
  it('asks three tables, and none of them is the notes table', async () => {
    state.results.flows = { data: [sharedRow()], error: null }
    state.results.profile_cards = { data: [{ user_id: 'author', display_name: 'Ana' }], error: null }
    await listFlowsSharedWithMe()

    const select = state.calls.find(c => c[0] === 'flows' && c[1] === 'select')?.[2] as string
    expect(select).toContain('phases (')
    expect(select).toContain('flow_items (')
    expect(select).not.toContain('note')
    expect(state.calls.map(c => c[0])).not.toContain(['flow', 'item', 'notes'].join('_'))
  })

  it('assembles a Flow with items in order, measures split back out, and no note', async () => {
    state.results.flows = { data: [sharedRow()], error: null }
    state.results.profile_cards = { data: [{ user_id: 'author', display_name: 'Ana' }], error: null }

    const [shared] = await listFlowsSharedWithMe()
    expect(shared.orgName).toBe('Willow Studio')
    expect(shared.authorName).toBe('Ana')
    expect(shared.flow.items.map(i => i.id)).toEqual(['i1', 'i2'])
    expect(shared.flow.items.map(i => i.measure)).toEqual([{ breaths: 5 }, { seconds: 300 }])
    expect(shared.flow.items.map(i => i.phaseId)).toEqual(['p1', null])
    expect(shared.flow.phases).toEqual([{ id: 'p1', name: 'Warm', intentTag: 'brahmana', order: 0 }])
    expect(JSON.stringify(shared.flow)).not.toContain('note')
  })

  it('leaves the author unnamed rather than failing when no card is readable', async () => {
    state.results.flows = { data: [sharedRow()], error: null }
    state.results.profile_cards = { data: [], error: null }
    expect((await listFlowsSharedWithMe())[0].authorName).toBeNull()
  })

  it('excludes the caller\'s own flows, and filters soft deletes out', async () => {
    state.results.flows = { data: [], error: null }
    await listFlowsSharedWithMe()
    expect(state.calls).toContainEqual(['flows', 'neq', 'user_id', 'me'])
    expect(state.calls).toContainEqual(['flows', 'is', 'deleted_at', null])
  })

  it('is empty and asks nothing when there is no session', async () => {
    state.session = null
    expect(await listFlowsSharedWithMe()).toEqual([])
    expect(state.calls).toEqual([])
  })
})

describe('adoptSharedFlow', () => {
  function shared(): SharedFlow {
    return {
      orgId: 'org-1',
      orgName: 'Willow Studio',
      authorName: 'Ana',
      flow: {
        id: 'server-flow-1',
        title: 'Standing sequence',
        items: [
          { id: 'i1', poseSlug: 'tadasana', mode: 'yang', measure: { breaths: 5 }, phaseId: 'p1', order: 0 },
          { id: 'i2', poseSlug: 'savasana', mode: 'yin', measure: { seconds: 300 }, phaseId: null, order: 1 },
        ],
        phases: [{ id: 'p1', name: 'Warm', intentTag: 'brahmana', order: 0 }],
        createdAt: '2026-09-01T00:00:00.000Z',
        updatedAt: '2026-09-02T00:00:00.000Z',
        isBuiltIn: false,
        schema_version: '0.1.0',
      },
    }
  }

  it('gives every id in the copy a new value', async () => {
    const copy = await adoptSharedFlow(shared())
    expect(copy.id).not.toBe('server-flow-1')
    expect(copy.items.map(i => i.id)).not.toContain('i1')
    expect(copy.phases.map(p => p.id)).not.toContain('p1')
    expect(new Set([copy.id, ...copy.items.map(i => i.id), ...copy.phases.map(p => p.id)]).size).toBe(4)
  })

  it('keeps items in their phase by remapping, not by keeping the old id', async () => {
    const copy = await adoptSharedFlow(shared())
    expect(copy.items[0].phaseId).toBe(copy.phases[0].id)
    expect(copy.items[1].phaseId).toBeNull()
  })

  it('carries the structure and the title', async () => {
    const copy = await adoptSharedFlow(shared())
    expect(copy.title).toBe('Standing sequence')
    expect(copy.items.map(i => [i.poseSlug, i.mode, i.order])).toEqual([
      ['tadasana', 'yang', 0],
      ['savasana', 'yin', 1],
    ])
    expect(copy.isBuiltIn).toBe(false)
  })

  it('is the recipient\'s own new flow, dated now', async () => {
    const copy = await adoptSharedFlow(shared(), new Date('2026-09-04T10:00:00.000Z'))
    expect(copy.createdAt).toBe('2026-09-04T10:00:00.000Z')
    expect(copy.updatedAt).toBe('2026-09-04T10:00:00.000Z')
  })

  it('saves locally before it queues, so the copy survives a closed tab', async () => {
    const order: string[] = []
    saveFlowMock.mockImplementationOnce(async () => { order.push('save') })
    queueUpsertMock.mockImplementationOnce(async () => { order.push('queue') })
    await adoptSharedFlow(shared())
    expect(order).toEqual(['save', 'queue'])
  })
})
