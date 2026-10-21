import { describe, expect, it } from 'vitest'
import { activeIntentionAtLapseStart } from './return-card'

const rev = (id: string, createdAt: string) => ({ id, createdAt })

describe('activeIntentionAtLapseStart', () => {
  const revisions = [
    rev('a', '2026-01-01T08:00:00Z'),
    rev('b', '2026-02-01T08:00:00Z'),
    rev('c', '2026-03-01T08:00:00Z'),
  ]

  it('returns the version active when the lapse began, not the newest', () => {
    expect(activeIntentionAtLapseStart(revisions, '2026-02-15')?.id).toBe('b')
  })

  it('returns the newest when the lapse began after every revision', () => {
    expect(activeIntentionAtLapseStart(revisions, '2026-04-01')?.id).toBe('c')
  })

  it('returns the only revision when it predates the lapse', () => {
    expect(activeIntentionAtLapseStart([rev('a', '2026-01-01T08:00:00Z')], '2026-05-01')?.id).toBe('a')
  })

  it('returns null when there are no intentions', () => {
    expect(activeIntentionAtLapseStart([], '2026-05-01')).toBeNull()
  })

  it('returns null when every revision came after the lapse began', () => {
    expect(activeIntentionAtLapseStart(revisions, '2025-12-31')).toBeNull()
  })

  it('treats a revision made on the lapse-start day as active, latest of that day winning', () => {
    const sameDay = [rev('a', '2026-02-01T06:00:00Z'), rev('b', '2026-02-01T20:00:00Z')]
    expect(activeIntentionAtLapseStart(sameDay, '2026-02-01')?.id).toBe('b')
  })

  it('does not depend on input order', () => {
    expect(activeIntentionAtLapseStart([...revisions].reverse(), '2026-02-15')?.id).toBe('b')
  })

  it('accepts plain local dates as createdAt', () => {
    expect(activeIntentionAtLapseStart([rev('a', '2026-02-01'), rev('b', '2026-02-10')], '2026-02-05')?.id).toBe('a')
  })

  it('does not mutate its input', () => {
    const input = [...revisions].reverse()
    const copy = [...input]
    activeIntentionAtLapseStart(input, '2026-02-15')
    expect(input).toEqual(copy)
  })
})
