import type { EnergeticDirection } from '@/lib/pose-types'

/** The three energetic directions, glossed.
 *
 *  The data has carried `energetic_direction` on all 67 poses since the Tier-1 geometry
 *  fields landed, but the only place it reached a reader was a composer chip rendering the
 *  bare Sanskrit token — `brahmana`, unglossed, which tells a teacher who has not met the
 *  term nothing at all. FR-010 names the three in English as building, reducing, and
 *  balancing, and that pairing is what this map holds.
 *
 *  Both halves are kept, deliberately. The Sanskrit is the traditional vocabulary a yin
 *  teacher will recognise and want to see; the English is what makes it readable to someone
 *  who wouldn't. Dropping either would be a choice about who the catalog is for.
 *
 *  `004` will want the same mapping for the composer — see research.md's note. */
export const ENERGETIC_DIRECTIONS: Record<EnergeticDirection, { label: string; gloss: string }> = {
  brahmana: {
    label: 'Brahmana',
    gloss: 'building',
  },
  langhana: {
    label: 'Langhana',
    gloss: 'reducing',
  },
  samana: {
    label: 'Samana',
    gloss: 'balancing',
  },
}

/** "Brahmana — building". Returns null for an unknown value rather than throwing: the
 *  schema's enum and the validator are the gate, and a pose page is the wrong place to
 *  discover that data got past them. */
export function describeEnergeticDirection(direction: string | null | undefined): string | null {
  if (!direction) return null
  const entry = ENERGETIC_DIRECTIONS[direction as EnergeticDirection]
  return entry ? `${entry.label} — ${entry.gloss}` : null
}
