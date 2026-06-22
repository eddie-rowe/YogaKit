import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SessionContext } from '@/lib/pipeline/types'

vi.mock('@/lib/pose-library', () => ({
  getAllPoses: vi.fn(() => []),
}))

vi.mock('@/lib/meridians', () => ({
  getElementRecord: vi.fn(() => ({
    element: 'water',
    season: 'winter',
    meridians: [{ slug: 'kidney' }, { slug: 'bladder' }],
    themes: ['stillness'],
    emotions: { balanced: 'courage', excess: 'fear', deficiency: 'exhaustion' },
    body_focus: ['inner leg', 'low back'],
  })),
}))

import { buildPrompt } from '@/lib/pipeline/propose'

function makeCtx(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    style: 'yin',
    durationMinutes: 75,
    experienceLevel: 'mixed',
    elementFocus: 'water',
    hardConstraints: {
      contraindications: ['knee-injury', 'hip-replacement'],
      propsAvailable: ['mat', 'blanket'],
    },
    ...overrides,
  }
}

describe('buildPrompt() — PII absence (FR-006b, RULE-P3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('contains only categorical descriptors, never student-identifying data', () => {
    const ctx = makeCtx()
    const prompt = buildPrompt(ctx, ['sphinx', 'butterfly', 'savasana'])

    // No names, ages, or identifying references
    expect(prompt).not.toMatch(/\bname\b/i)
    expect(prompt).not.toMatch(/\bage\b\s*:\s*\d+/i)
    expect(prompt).not.toMatch(/student\s+is\s+\w+/i)
    expect(prompt).not.toMatch(/patient/i)
  })

  it('includes categorical contraindication labels, not diagnoses or names', () => {
    const prompt = buildPrompt(makeCtx(), ['sphinx'])
    // Slug-form contraindications are OK
    expect(prompt).toContain('knee-injury')
    expect(prompt).toContain('hip-replacement')
  })

  it('does NOT include age ranges even when provided', () => {
    const ctx = makeCtx({ ageRange: { min: 20, max: 35 } })
    const prompt = buildPrompt(ctx, ['sphinx'])
    // ageRange is not in the prompt (not included in prompt builder)
    expect(prompt).not.toMatch(/\b(20|35)\b/)
  })

  it('includes element framing for meridian-focused sessions', () => {
    const prompt = buildPrompt(makeCtx(), ['sphinx'])
    expect(prompt).toContain('water')
    expect(prompt).toContain('stillness')
  })

  it('includes available pose slugs in the prompt', () => {
    const slugs = ['sphinx', 'butterfly', 'sleeping-swan']
    const prompt = buildPrompt(makeCtx(), slugs)
    for (const slug of slugs) {
      expect(prompt).toContain(slug)
    }
  })

  it('specifies the session duration in the prompt', () => {
    const prompt = buildPrompt(makeCtx({ durationMinutes: 90 }), [])
    expect(prompt).toContain('90')
  })

  it('instructs model to return only JSON', () => {
    const prompt = buildPrompt(makeCtx(), [])
    expect(prompt).toContain('Return ONLY valid JSON')
  })
})
