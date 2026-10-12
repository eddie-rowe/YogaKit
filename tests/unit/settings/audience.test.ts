import { describe, expect, it } from 'vitest'
import { deriveAudience, type Enrollment } from '@/lib/settings/audience'

const e = (name: string, shared = true): Enrollment => ({ name, shared })

describe('deriveAudience (FR-017)', () => {
  it('zero enrollments: none, no implied audience', () => {
    expect(deriveAudience([])).toEqual({ kind: 'none' })
  })
  it('one shared enrollment', () => {
    expect(deriveAudience([e('Spring')])).toEqual({ kind: 'cohorts', names: ['Spring'] })
  })
  it('a revoked enrollment is excluded; only revoked yields none', () => {
    expect(deriveAudience([e('Spring', false)])).toEqual({ kind: 'none' })
  })
  it('mixed keeps shared names in order', () => {
    expect(deriveAudience([e('A'), e('B', false), e('C')])).toEqual({
      kind: 'cohorts',
      names: ['A', 'C'],
    })
  })
  it('duplicate cohort names collapse', () => {
    expect(deriveAudience([e('A'), e('A')])).toEqual({ kind: 'cohorts', names: ['A'] })
  })
  it('does not mutate input', () => {
    const input = [e('A'), e('B', false)]
    const snap = JSON.stringify(input)
    deriveAudience(input)
    expect(JSON.stringify(input)).toBe(snap)
  })
})
