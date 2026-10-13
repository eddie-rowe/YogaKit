// 006 US2 (T028): who can see an account's practice signals (FR-017).
// Pure: no I/O, no copy. Zero enrollments yields `none` — callers render no audience text.

export interface Enrollment {
  name: string
  /** false once the account has revoked sharing for this cohort. */
  shared: boolean
}

export type Audience = { kind: 'none' } | { kind: 'cohorts'; names: string[] }

export function deriveAudience(enrollments: readonly Enrollment[]): Audience {
  const names = [...new Set(enrollments.filter((x) => x.shared).map((x) => x.name))]
  return names.length === 0 ? { kind: 'none' } : { kind: 'cohorts', names }
}
