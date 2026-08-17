'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_LINKS = [
  { href: '/dimensions', label: 'Build' },
  { href: '/sequences', label: 'Sequences' },
  { href: '/poses', label: 'Poses' },
]

export default function AppHeader() {
  const pathname = usePathname()

  // Print-only export page — no chrome needed
  if (pathname === '/sequence/export') return null

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#e2dbd4] px-4 h-14 flex items-center justify-between">
      <Link
        href="/dimensions"
        className="font-serif text-lg font-medium tracking-tight text-[#1c1714] hover:opacity-70 transition-opacity"
      >
        Yoga Kit
      </Link>
      <nav className="flex items-center gap-1">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href
            || (href === '/sequences' && pathname.startsWith('/sequences'))
            || (href === '/poses' && pathname.startsWith('/poses'))
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                active
                  ? 'text-[#1c1714] font-medium bg-[#1c1714]/8'
                  : 'text-[#8a7d73] hover:text-[#1c1714] hover:bg-[#1c1714]/5'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
