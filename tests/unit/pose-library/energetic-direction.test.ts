import fs from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  ENERGETIC_DIRECTIONS,
  describeEnergeticDirection,
} from '@/lib/pose-library/energetic-direction'

const schema = JSON.parse(fs.readFileSync('data/schemas/pose.schema.json', 'utf8'))
const allowed: string[] = schema.properties.energetic_direction.enum

describe('ENERGETIC_DIRECTIONS', () => {
  it('covers the schema enum exactly', () => {
    // The map's job is to be exhaustive over the data. A fourth direction added to the
    // schema should fail here rather than render a blank chip on a pose page.
    expect(Object.keys(ENERGETIC_DIRECTIONS).sort()).toEqual([...allowed].sort())
  })

  it('gives every direction both a Sanskrit label and an English gloss', () => {
    for (const direction of allowed) {
      const entry = ENERGETIC_DIRECTIONS[direction as keyof typeof ENERGETIC_DIRECTIONS]
      expect(entry.label.length).toBeGreaterThan(0)
      expect(entry.gloss.length).toBeGreaterThan(0)
    }
  })

  it('uses FR-010’s three English words', () => {
    expect(ENERGETIC_DIRECTIONS.brahmana.gloss).toBe('building')
    expect(ENERGETIC_DIRECTIONS.langhana.gloss).toBe('reducing')
    expect(ENERGETIC_DIRECTIONS.samana.gloss).toBe('balancing')
  })
})

describe('describeEnergeticDirection', () => {
  it('pairs the Sanskrit with the gloss', () => {
    expect(describeEnergeticDirection('brahmana')).toBe('Brahmana — building')
  })

  it('resolves every pose in the library (FR-011)', () => {
    // The reason US2 is small: the data has been complete since the Tier-1 geometry fields
    // landed. What was missing was a reader ever seeing it.
    const poses = fs
      .readdirSync('data/poses')
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join('data/poses', f), 'utf8')))

    expect(poses).toHaveLength(67)
    for (const pose of poses) {
      expect(describeEnergeticDirection(pose.energetic_direction)).not.toBeNull()
    }
  })

  it('returns null rather than throwing on absent or unknown values', () => {
    // The schema enum and the validator are the gate. A pose page is the wrong place to
    // discover that something got past them, and a thrown error there would take the whole
    // prerendered route down.
    expect(describeEnergeticDirection(null)).toBeNull()
    expect(describeEnergeticDirection(undefined)).toBeNull()
    expect(describeEnergeticDirection('')).toBeNull()
    expect(describeEnergeticDirection('yang')).toBeNull()
  })
})
