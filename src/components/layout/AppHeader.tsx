'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PenLine, ListTree, Flower2, GraduationCap } from 'lucide-react'
import AccountMenu from './AccountMenu'
import SyncLabel from './SyncLabel'

// v0.1 five-tab nav (docs/krama-guardrails.md §1.3, spec §3). /dimensions, /sequence,
// /sequences and /api/generate are parked for v0.2 — unlinked here, not deleted.
// Below the `sm` breakpoint five text tabs don't fit next to the wordmark at
// iPhone width (390px), so mobile gets a native-style bottom tab bar instead;
// the top bar keeps the full text nav from `sm` up.
const NAV_LINKS = [
  { href: '/', label: 'Home', testId: 'nav-home', Icon: Home },
  { href: '/compose', label: 'Compose', testId: 'nav-compose', Icon: PenLine },
  { href: '/flows', label: 'Flows', testId: 'nav-flows', Icon: ListTree },
  { href: '/poses', label: 'Poses', testId: 'nav-poses', Icon: Flower2 },
  { href: '/learn', label: 'Learn', testId: 'nav-learn', Icon: GraduationCap },
]

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== '/' && pathname.startsWith(href))
}

export default function AppHeader() {
  const pathname = usePathname()

  // Print-only views — no chrome needed
  if (pathname === '/sequence/export' || pathname.startsWith('/read/')) return null

  return (
    <>
      <header
        className="sticky top-0 z-20 backdrop-blur-md border-b px-4 h-14 flex items-center justify-between"
        style={{ background: 'color-mix(in srgb, var(--surface) 90%, transparent)', borderColor: 'var(--border)' }}
      >
        <Link
          href="/"
          className="font-serif text-lg font-medium tracking-tight hover:opacity-70 transition-opacity"
          style={{ color: 'var(--foreground)' }}
        >
          YogaKit
        </Link>
        <div className="flex items-center gap-1">
          <SyncLabel />
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, testId }) => {
              const active = isActive(pathname, href)
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
          {/* Account lives beside the nav, not inside NAV_LINKS — 005 collapses
              that array from five tabs to three. */}
          <AccountMenu />
        </div>
      </header>

      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-20 backdrop-blur-md border-t flex items-stretch"
        style={{
          background: 'color-mix(in srgb, var(--surface) 92%, transparent)',
          borderColor: 'var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {NAV_LINKS.map(({ href, label, testId, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              data-testid={testId}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors duration-150"
              style={{ color: active ? 'var(--accent)' : 'var(--muted)', fontWeight: active ? 500 : 400 }}
            >
              <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}

// Reserves scroll space for the fixed mobile bottom tab bar so page content
// (e.g. a long Compose list) doesn't end up hidden underneath it.
export function MobileNavSpacer() {
  const pathname = usePathname()
  if (pathname === '/sequence/export' || pathname.startsWith('/read/')) return null
  return <div className="sm:hidden" style={{ height: 'calc(56px + env(safe-area-inset-bottom))' }} />
}
