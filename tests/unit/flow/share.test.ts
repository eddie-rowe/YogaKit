import { describe, it, expect } from 'vitest'
import type { Flow } from '@/lib/flow/types'
import { stripAuthorOnly } from '@/lib/flow/share'
import { exportKramaFile, exportKramaFileForSharing } from '@/lib/storage/krama-file'

// Invariant I8, specs/004-sequencing-composer/contracts/flow-sharing.md: an export
// produced for sharing carries no `note` key on any item.

function makeFlow(): Flow {
  return {
    id: 'flow-1',
    title: 'Standing sequence',
    items: [
      {
        id: 'item-1', poseSlug: 'tadasana', mode: 'yang', measure: { breaths: 5 },
        note: 'watch her left knee here', phaseId: 'phase-1', order: 0,
      },
      {
        id: 'item-2', poseSlug: 'savasana', mode: 'yin', measure: { seconds: 300 },
        phaseId: null, order: 1,
      },
    ],
    phases: [{ id: 'phase-1', name: 'Warm', intentTag: 'brahmana', order: 0 }],
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-02T00:00:00.000Z',
    isBuiltIn: false,
    schema_version: '0.1.0',
  }
}

describe('stripAuthorOnly', () => {
  it('removes the note key rather than blanking it', () => {
    const stripped = stripAuthorOnly(makeFlow())
    for (const item of stripped.items) {
      expect(Object.hasOwn(item, 'note')).toBe(false)
    }
  })

  it('leaves the note absent from the serialized document', () => {
    // The assertion that matters: not "note is undefined" but "the string a
    // recipient receives does not contain it".
    const json = JSON.stringify(stripAuthorOnly(makeFlow()))
    expect(json).not.toContain('note')
    expect(json).not.toContain('left knee')
  })

  it('keeps every field that is structure', () => {
    const flow = makeFlow()
    const stripped = stripAuthorOnly(flow)
    expect(stripped.title).toBe('Standing sequence')
    expect(stripped.phases).toEqual(flow.phases)
    expect(stripped.items.map(i => [i.id, i.poseSlug, i.mode, i.order])).toEqual([
      ['item-1', 'tadasana', 'yang', 0],
      ['item-2', 'savasana', 'yin', 1],
    ])
    expect(stripped.items.map(i => i.measure)).toEqual([{ breaths: 5 }, { seconds: 300 }])
    expect(stripped.items.map(i => i.phaseId)).toEqual(['phase-1', null])
  })

  it('does not mutate the flow it was given', () => {
    const flow = makeFlow()
    stripAuthorOnly(flow)
    expect(flow.items[0].note).toBe('watch her left knee here')
  })

  it('is a no-op on a flow whose items carry no notes', () => {
    const flow = makeFlow()
    delete flow.items[0].note
    expect(stripAuthorOnly(flow)).toEqual(flow)
  })

  it('handles a flow with no items', () => {
    const flow = { ...makeFlow(), items: [] }
    expect(stripAuthorOnly(flow).items).toEqual([])
  })
})

describe('the sharing export path', () => {
  it('calls it: exportKramaFileForSharing carries no note', () => {
    const file = exportKramaFileForSharing(makeFlow(), '2026-09-02T00:00:00.000Z')
    expect(JSON.stringify(file)).not.toContain('left knee')
    expect(file.flow.items).toHaveLength(2)
    expect(file.exported_at).toBe('2026-09-02T00:00:00.000Z')
  })

  it('and the plain export does not: a teacher\'s own copy keeps everything', () => {
    // FR-029 is about an export produced *for sharing*. A backup of one's own work
    // that silently dropped one's own notes would be a data loss, not a privacy win.
    const file = exportKramaFile(makeFlow(), '2026-09-02T00:00:00.000Z')
    expect(file.flow.items[0].note).toBe('watch her left knee here')
  })
})
