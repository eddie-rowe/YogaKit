import { describe, it, expect } from 'vitest'

import { getBuiltInFlowById, getBuiltInFlows } from '@/lib/flow-library'

// #39/#52: getBuiltInFlowById used to key on the Flow's UUID only, so
// /read/<slug> (the URL the app's own Datadog synthetics probe) never resolved
// and fell through to the client-only IndexedDB branch. Flow has no slug
// field — the slug exists only as the data/flows/<slug>.krama.json filename —
// so both forms must resolve.
const SLUG_TO_UUID: Record<string, string> = {
  'classic-yin-full-body': '91d035b8-519f-4b1c-a2f6-9541df9b8b65',
  'heart-openers-vinyasa': 'b79a753d-fc7c-42e7-8abc-10181fabdb12',
  'personal-practice-10min': 'bffbec9a-5c2c-4cce-9e14-d5ea768fb142',
}

describe('getBuiltInFlowById', () => {
  it('resolves all three built-in flows by slug', () => {
    for (const [slug, uuid] of Object.entries(SLUG_TO_UUID)) {
      const flow = getBuiltInFlowById(slug)
      expect(flow).toBeDefined()
      expect(flow?.id).toBe(uuid)
    }
  })

  it('resolves all three built-in flows by UUID (no regression)', () => {
    for (const uuid of Object.values(SLUG_TO_UUID)) {
      const flow = getBuiltInFlowById(uuid)
      expect(flow).toBeDefined()
      expect(flow?.id).toBe(uuid)
    }
  })

  it('returns undefined for an unknown id or slug', () => {
    expect(getBuiltInFlowById('does-not-exist')).toBeUndefined()
  })

  it('keeps getBuiltInFlows returning the full built-in set', () => {
    expect(getBuiltInFlows()).toHaveLength(Object.keys(SLUG_TO_UUID).length)
  })
})
