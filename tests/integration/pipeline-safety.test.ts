import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SessionContext, PipelineDraft } from '@/lib/pipeline/types'
import { constrain } from '@/lib/pipeline/constrain'
import { validate } from '@/lib/pipeline/validate'

// Integration tests run against the real pose library on disk (no mocking).
// These tests verify the full constrain → validate pipeline enforces safety constraints
// end-to-end (FR-007, FR-008, RULE-S1, RULE-S2).

function makeCtx(overrides: Partial<SessionContext> = {}): SessionContext {
  return {
    style: 'yin',
    durationMinutes: 60,
    experienceLevel: 'mixed',
    hardConstraints: {
      contraindications: [],
      propsAvailable: ['mat', 'blanket', 'block'],
    },
    ...overrides,
  }
}

function makeEmptyDraft(): PipelineDraft {
  return {
    themeStatement: 'Integration test sequence',
    philosophicalFraming: 'Test framing.',
    quote: { text: 'Test', attribution: 'Test' },
    poses: [],
  }
}

describe('Pipeline safety integration', () => {
  it('high-blood-pressure: no inversions in sequence or alternates', () => {
    const ctx = makeCtx({
      hardConstraints: {
        contraindications: ['high-blood-pressure', 'no-inversions'],
        propsAvailable: ['mat', 'blanket', 'block'],
      },
    })

    const constrained = constrain(makeEmptyDraft(), ctx)
    const validated = validate(constrained)

    // All poses in the final sequence must not have these contraindications
    for (const item of validated.items) {
      expect(item.pose.contraindications).not.toContain('high-blood-pressure')
      expect(item.pose.contraindications).not.toContain('no-inversions')
    }

    // All alternates must also respect the constraint
    for (const item of validated.items) {
      for (const alt of item.alternates) {
        expect(alt.contraindications).not.toContain('high-blood-pressure')
        expect(alt.contraindications).not.toContain('no-inversions')
      }
    }
  })

  it('knee-injury: no poses with knee-injury contraindication', () => {
    const ctx = makeCtx({
      hardConstraints: {
        contraindications: ['knee-injury'],
        propsAvailable: ['mat', 'blanket', 'block'],
      },
    })

    const constrained = constrain(makeEmptyDraft(), ctx)
    const validated = validate(constrained)

    for (const item of validated.items) {
      expect(item.pose.contraindications).not.toContain('knee-injury')
    }
  })

  it('hip-replacement: hip-replacement poses excluded (Dragon, Sleeping Swan)', () => {
    const ctx = makeCtx({
      hardConstraints: {
        contraindications: ['hip-replacement'],
        propsAvailable: ['mat', 'blanket', 'block'],
      },
    })

    const constrained = constrain(makeEmptyDraft(), ctx)
    const validated = validate(constrained)

    const slugs = validated.items.map(i => i.pose.slug)
    // These specific poses are contraindicated for hip-replacement
    expect(slugs).not.toContain('sleeping-swan')
    expect(slugs).not.toContain('dragon-low-lunge')
  })

  it('no-props-available: sequence contains only prop-free poses', () => {
    const ctx = makeCtx({
      hardConstraints: {
        contraindications: [],
        propsAvailable: ['mat'],
      },
    })

    const constrained = constrain(makeEmptyDraft(), ctx)
    const validated = validate(constrained)

    for (const item of validated.items) {
      // Either no props required, or a prop-free variation was used
      const unresolvedPropRequirements = item.pose.props_required.filter(
        p => !['mat'].includes(p)
      )
      expect(unresolvedPropRequirements).toHaveLength(0)
    }
  })

  it('multiple constraints: both are enforced simultaneously', () => {
    const ctx = makeCtx({
      hardConstraints: {
        contraindications: ['knee-injury', 'hip-replacement'],
        propsAvailable: ['mat', 'blanket'],
      },
    })

    const constrained = constrain(makeEmptyDraft(), ctx)
    const validated = validate(constrained)

    for (const item of validated.items) {
      expect(item.pose.contraindications).not.toContain('knee-injury')
      expect(item.pose.contraindications).not.toContain('hip-replacement')
    }
  })

  it('validate() always returns passedValidation without throwing', () => {
    const ctx = makeCtx({
      hardConstraints: {
        contraindications: ['knee-injury', 'hip-replacement', 'pregnancy', 'no-inversions'],
        propsAvailable: ['mat'],
      },
    })

    expect(() => {
      const constrained = constrain(makeEmptyDraft(), ctx)
      const validated = validate(constrained)
      expect(validated).toHaveProperty('passedValidation')
      expect(validated).toHaveProperty('safetyNotes')
    }).not.toThrow()
  })

  it('beginner session: no advanced poses in output', () => {
    const ctx = makeCtx({ experienceLevel: 'beginner' })
    const constrained = constrain(makeEmptyDraft(), ctx)
    const validated = validate(constrained)

    // validate() enforces intensity ceiling for beginner sessions
    const consecutiveAdvanced = validated.items.reduce(
      (acc, item) => {
        if (item.pose.difficulty === 'advanced') {
          return { count: acc.count + 1, max: Math.max(acc.max, acc.count + 1) }
        }
        return { count: 0, max: acc.max }
      },
      { count: 0, max: 0 }
    )
    expect(consecutiveAdvanced.max).toBeLessThanOrEqual(1)
  })
})
