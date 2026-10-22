import { describe, expect, it } from 'vitest'
import { YESTERDAY_WINDOW_HOURS, canLogYesterday, resolveCheckinDay } from './checkin-day'
import type { Checkin } from './streak'

const day = (localDate: string, kind: Checkin['kind'] = 'practice'): Checkin => ({ localDate, kind })

describe('resolveCheckinDay', () => {
  it('creates on a day with no check-in', () => {
    const r = resolveCheckinDay(new Date('2026-03-10T12:00:00Z'), [], 'today', 'UTC')
    expect(r).toEqual({ localDate: '2026-03-10', action: 'create' })
  })

  it('updates, never creates, on a second check-in the same local day', () => {
    const r = resolveCheckinDay(new Date('2026-03-10T20:00:00Z'), [day('2026-03-10')], 'today', 'UTC')
    expect(r).toEqual({ localDate: '2026-03-10', action: 'update' })
  })

  it('lands on the later day when submitted after midnight', () => {
    const r = resolveCheckinDay(new Date('2026-03-11T00:01:00Z'), [day('2026-03-10')], 'today', 'UTC')
    expect(r).toEqual({ localDate: '2026-03-11', action: 'create' })
  })

  it('honours yesterday inside the window', () => {
    const r = resolveCheckinDay(new Date('2026-03-11T01:00:00Z'), [], 'yesterday', 'UTC')
    expect(r).toEqual({ localDate: '2026-03-10', action: 'create' })
  })

  it('updates yesterday when it already has a check-in', () => {
    const r = resolveCheckinDay(new Date('2026-03-11T01:00:00Z'), [day('2026-03-10')], 'yesterday', 'UTC')
    expect(r).toEqual({ localDate: '2026-03-10', action: 'update' })
  })

  it('falls back to today when yesterday is not offered', () => {
    const r = resolveCheckinDay(new Date('2026-03-11T09:00:00Z'), [], 'yesterday', 'UTC')
    expect(r).toEqual({ localDate: '2026-03-11', action: 'create' })
  })

  it('defaults to today and the runtime zone', () => {
    const r = resolveCheckinDay(new Date(), [])
    expect(r.action).toBe('create')
    expect(r.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('canLogYesterday', () => {
  it('is offered just after local midnight', () => {
    expect(canLogYesterday(new Date('2026-03-11T00:00:00Z'), [], 'UTC')).toBe(true)
  })

  it('is offered up to the window edge and gone at it', () => {
    const edge = YESTERDAY_WINDOW_HOURS
    const before = new Date(Date.UTC(2026, 2, 11, edge - 1, 59))
    const at = new Date(Date.UTC(2026, 2, 11, edge, 0))
    expect(canLogYesterday(before, [], 'UTC')).toBe(true)
    expect(canLogYesterday(at, [], 'UTC')).toBe(false)
  })

  it('is gone once a newer check-in exists', () => {
    expect(canLogYesterday(new Date('2026-03-11T01:00:00Z'), [day('2026-03-11', 'rest')], 'UTC')).toBe(false)
  })

  it('is still offered when only older check-ins exist', () => {
    expect(canLogYesterday(new Date('2026-03-11T01:00:00Z'), [day('2026-03-08')], 'UTC')).toBe(true)
  })

  it('uses the practitioner zone, not UTC', () => {
    // 2026-03-11T01:00Z is 10:00 in Tokyo (outside window) and 18:00 prior day in LA.
    const t = new Date('2026-03-11T01:00:00Z')
    expect(canLogYesterday(t, [], 'Asia/Tokyo')).toBe(false)
    expect(canLogYesterday(t, [], 'America/Los_Angeles')).toBe(false)
    expect(canLogYesterday(new Date('2026-03-11T08:30:00Z'), [], 'America/Los_Angeles')).toBe(true)
  })

  it('measures from local midnight across a DST change', () => {
    // US spring forward 2026-03-08. 03:30 EDT (07:30Z) is 3.5 local hours after midnight
    // although only 2.5 elapsed hours have passed since 00:00 EST.
    expect(canLogYesterday(new Date('2026-03-08T07:30:00Z'), [], 'America/New_York')).toBe(true)
    expect(canLogYesterday(new Date('2026-03-08T10:30:00Z'), [], 'America/New_York')).toBe(false)
  })

  it('derives yesterday across a month boundary', () => {
    expect(canLogYesterday(new Date('2026-03-01T01:00:00Z'), [day('2026-02-28')], 'UTC')).toBe(true)
    expect(canLogYesterday(new Date('2026-03-01T01:00:00Z'), [day('2026-03-01')], 'UTC')).toBe(false)
  })
})
