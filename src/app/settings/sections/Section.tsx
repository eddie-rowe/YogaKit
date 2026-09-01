import type { ReactNode } from 'react'

// One settings route, one visible index, one fixed section order (006 FR-001/002)
// — explicitly built to avoid the sprawl docs/design-research/19-settings-profile.md
// names as the anti-pattern: "NextMove-style multiple disconnected settings routes
// with no shared index."

/** Every section in the fixed order 006 FR-002 requires. The array is the source
 *  of truth for both the index and the render order, so the two cannot drift. */
export const SECTIONS = [
  { id: 'profile', title: 'Profile' },
  { id: 'appearance', title: 'Appearance' },
  { id: 'notifications', title: 'Notifications' },
  { id: 'privacy', title: 'Privacy' },
  { id: 'security', title: 'Account & security' },
  { id: 'data', title: 'Your data' },
  { id: 'billing', title: 'Billing' },
  { id: 'orgs', title: 'Organizations' },
  { id: 'studio', title: 'Studio' },
] as const

export type SectionId = (typeof SECTIONS)[number]['id']

export function Section({ id, title, children }: { id: SectionId; title: string; children: ReactNode }) {
  return (
    <section id={id} data-testid={`settings-section-${id}`} className="space-y-3 scroll-mt-20">
      <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

/** For a section whose feature doesn't exist yet.
 *
 *  006 FR-007: a setting that can't be changed must say why in plain language and
 *  must never be a silently inert control. A greyed-out toggle that does nothing
 *  is a lie about what the product can do; a sentence isn't. */
export function NotYet({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
      {children}
    </p>
  )
}
