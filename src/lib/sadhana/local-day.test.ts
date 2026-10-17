import { describe, expect, it } from 'vitest'
import { resolveLocalDay } from './local-day'

describe('resolveLocalDay', () => {
  it('returns YYYY-MM-DD in the given zone', () => {
    expect(resolveLocalDay(new Date('2026-03-10T12:00:00Z'), 'UTC')).toBe('2026-03-10')
  })

  it('attributes the day at the instant given, not an earlier one (midnight boundary)', () => {
    const opened = new Date('2026-03-10T23:59:00Z')
    const submitted = new Date('2026-03-11T00:01:00Z')
    expect(resolveLocalDay(opened, 'UTC')).toBe('2026-03-10')
    expect(resolveLocalDay(submitted, 'UTC')).toBe('2026-03-11')
  })

  it('uses the zone, so one instant is two different local days', () => {
    const t = new Date('2026-03-10T23:30:00Z')
    expect(resolveLocalDay(t, 'Asia/Tokyo')).toBe('2026-03-11')
    expect(resolveLocalDay(t, 'America/Los_Angeles')).toBe('2026-03-10')
  })

  it('handles the UTC+14 and UTC-12 extremes', () => {
    const t = new Date('2026-03-10T10:30:00Z')
    expect(resolveLocalDay(t, 'Pacific/Kiritimati')).toBe('2026-03-11')
    expect(resolveLocalDay(t, 'Etc/GMT+12')).toBe('2026-03-09')
  })

  it('is correct across DST transition days', () => {
    // US spring forward 2026-03-08: 02:00 -> 03:00 local.
    expect(resolveLocalDay(new Date('2026-03-08T09:59:00Z'), 'America/New_York')).toBe('2026-03-08')
    expect(resolveLocalDay(new Date('2026-03-09T03:59:00Z'), 'America/New_York')).toBe('2026-03-08')
    expect(resolveLocalDay(new Date('2026-03-09T04:00:00Z'), 'America/New_York')).toBe('2026-03-09')
    // US fall back 2026-11-01: 25-hour day.
    expect(resolveLocalDay(new Date('2026-11-02T04:59:00Z'), 'America/New_York')).toBe('2026-11-01')
    expect(resolveLocalDay(new Date('2026-11-02T05:00:00Z'), 'America/New_York')).toBe('2026-11-02')
  })

  it('pads month and day', () => {
    expect(resolveLocalDay(new Date('2026-01-02T12:00:00Z'), 'UTC')).toBe('2026-01-02')
  })

  it("defaults to the runtime's current zone, read at call time", () => {
    const t = new Date('2026-06-15T12:00:00Z')
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
    expect(resolveLocalDay(t)).toBe(resolveLocalDay(t, zone))
  })
})
