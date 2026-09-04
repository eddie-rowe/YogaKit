import { describe, it, expect } from 'vitest'
import { deriveSyncState } from '@/lib/storage/flow-store'
import type { OutboxEntry } from '@/lib/storage/outbox'

function entry(state: OutboxEntry['state']): OutboxEntry {
  return {
    flowId: 'a',
    op: 'upsert',
    payload: null,
    queuedAt: '2026-01-01T00:00:00.000Z',
    attempts: 0,
    lastError: null,
    state,
  }
}

describe('deriveSyncState', () => {
  it('reports pending for a flow with no entry and no history', () => {
    // data-model.md §5 says "no entry means synced". That is the deviation recorded in
    // DECISIONS.md: the outbox is authenticated-only, so a signed-out teacher never has
    // an entry, and reading absence as success would let sign-out delete every flow they
    // ever made. `synced` requires positive evidence.
    expect(deriveSyncState(undefined, undefined)).toBe('pending')
  })

  it('trusts a stored synced only when nothing is outstanding', () => {
    expect(deriveSyncState('synced', undefined)).toBe('synced')
  })

  it('reports pending for a synced flow edited since', () => {
    expect(deriveSyncState('synced', entry('queued'))).toBe('pending')
  })

  it('reports failed for an entry that has stopped being retried', () => {
    expect(deriveSyncState('synced', entry('dead'))).toBe('failed')
    expect(deriveSyncState(undefined, entry('dead'))).toBe('failed')
  })
})
