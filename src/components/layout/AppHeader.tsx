'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// v0.1 five-tab nav (docs/krama-guardrails.md §1.3, spec §3). /dimensions, /sequence,
// /sequences and /api/generate are parked for v0.2 — unlinked here, not deleted.
const NAV_LINKS = [
  { href: '/', label: 'Home', testId: 'nav-home' },
  { href: '/compose', label: 'Compose', testId: 'nav-compose' },
  { href: '/flows', label: 'Flows', testId: 'nav-flows' },
  { href: '/poses', label: 'Poses', testId: 'nav-poses' },
  { href: '/learn', label: 'Learn', testId: 'nav-learn' },
]

export default function AppHeader() {
  const pathname = usePathname()

  // Print-only views — no chrome needed
  if (pathname === '/sequence/export' || pathname.startsWith('/read/')) return null

  return (
    <header
      className="sticky top-0 z-20 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between"
      style={{ background: 'color-mix(in srgb, var(--surface) 90%, transparent)', borderColor: 'var(--border)' }}
    >
      <Link
        href="/"
        className="font-serif text-lg font-medium tracking-tight hover:opacity-70 transition-opacity"
        style={{ color: 'var(--foreground)' }}
      >
        Krama
      </Link>
      <nav className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label, testId }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              data-testid={testId}
              className="px-3 py-1.5 text-sm rounded-md transition-colors duration-150"
              style={
                active
                  ? { color: 'var(--accent-foreground)', background: 'var(--accent)', fontWeight: 500 }
                  : { color: 'var(--muted)' }
              }
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
