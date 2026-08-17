import { describe, it, expect } from 'vitest'
import { exportKramaFile, importKramaFile, CURRENT_SCHEMA_VERSION } from '@/lib/storage/krama-file'
import type { Flow } from '@/lib/flow/types'

function makeFlow(overrides: Partial<Flow> = {}): Flow {
  return {
    id: 'original-id',
    title: 'Heart Openers Vinyasa',
    items: [
      {
        id: 'item-1',
        poseSlug: 'camel',
        mode: 'yang',
        measure: { breaths: 5 },
        note: 'cue slow exit',
        phaseId: 'phase-1',
        order: 0,
      },
    ],
    phases: [{ id: 'phase-1', name: 'Peak', intentTag: 'brahmana', order: 0 }],
    createdAt: '2026-08-17T00:00:00.000Z',
    updatedAt: '2026-08-17T00:00:00.000Z',
    isBuiltIn: true,
    schema_version: CURRENT_SCHEMA_VERSION,
    ...overrides,
  }
}

describe('.krama.json round-trip (SC-005)', () => {
  it('importKramaFile(exportKramaFile(flow)) matches the original except id and isBuiltIn', () => {
    const flow = makeFlow()
    const file = exportKramaFile(flow, '2026-08-17T12:00:00.000Z')
    const result = importKramaFile(file, 'new-id')

    expect('flow' in result).toBe(true)
    const imported = (result as { flow: Flow }).flow
    expect(imported).toEqual({ ...flow, id: 'new-id', isBuiltIn: false })
  })

  it('exports the app current schema_version regardless of the flow object contents', () => {
    const flow = makeFlow({ schema_version: '0.0.9' })
    const file = exportKramaFile(flow, '2026-08-17T12:00:00.000Z')
    expect(file.schema_version).toBe(CURRENT_SCHEMA_VERSION)
    expect(file.exported_at).toBe('2026-08-17T12:00:00.000Z')
  })

  it('always forces isBuiltIn: false on import, even for an exported built-in', () => {
    const flow = makeFlow({ isBuiltIn: true })
    const file = exportKramaFile(flow, '2026-08-17T12:00:00.000Z')
    const result = importKramaFile(file, 'new-id') as { flow: Flow }
    expect(result.flow.isBuiltIn).toBe(false)
  })

  it('returns MALFORMED for non-object input', () => {
    const result = importKramaFile('not an object', 'new-id')
    expect('error' in result && result.error.code).toBe('MALFORMED')
  })

  it('returns MALFORMED when schema_version is missing', () => {
    const result = importKramaFile({ flow: makeFlow() }, 'new-id')
    expect('error' in result && result.error.code).toBe('MALFORMED')
  })

  it('returns MALFORMED when the flow object fails basic shape checks', () => {
    const result = importKramaFile(
      { schema_version: CURRENT_SCHEMA_VERSION, exported_at: 'x', flow: { title: 'no id or items' } },
      'new-id'
    )
    expect('error' in result && result.error.code).toBe('MALFORMED')
  })

  it('returns UNKNOWN_SCHEMA_VERSION for an unrecognized future schema_version', () => {
    const flow = makeFlow()
    const result = importKramaFile(
      { schema_version: '9.9.9', exported_at: 'x', flow },
      'new-id'
    )
    expect('error' in result && result.error.code).toBe('UNKNOWN_SCHEMA_VERSION')
    expect((result as { error: { message: string } }).error.message).toContain('9.9.9')
  })
})
