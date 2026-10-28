import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'

import PosesClient from '@/app/poses/PosesClient'
import { getAllPoses } from '@/lib/pose-library'
import { THEMES } from '@/lib/pose-library/theme-taxonomy'

// 003 US5: FR-027 (subheads), FR-028 (cross-filters), FR-029 (closed set), FR-030
// (browsing is stateless with respect to the reader).

const poses = getAllPoses()

function openThemeView() {
  render(<PosesClient poses={poses} />)
  fireEvent.click(screen.getByTestId('poses-view-toggle-theme'))
}

describe('theme view (T060, T061)', () => {
  it('renders one section per taxonomy slug, no more', () => {
    openThemeView()
    const sections = Array.from(document.querySelectorAll('[data-testid^="poses-theme-section-"]'))
    const ids = sections.map(s => s.getAttribute('data-testid')!.replace('poses-theme-section-', ''))
    expect(ids.sort()).toEqual(THEMES.map(t => t.slug).sort())
  })

  it('titles each section with the theme label and shows its subhead (FR-027)', () => {
    openThemeView()
    for (const theme of THEMES) {
      const section = screen.getByTestId(`poses-theme-section-${theme.slug}`)
      expect(within(section).getByRole('heading', { level: 2 }).textContent).toBe(theme.label)
      expect(within(section).getByText(theme.subhead)).toBeInTheDocument()
    }
  })

  it('lists a pose once per section even if it carries two emotions that fold into one theme', () => {
    openThemeView()
    for (const section of document.querySelectorAll('[data-testid^="poses-theme-section-"]')) {
      const ids = Array.from(section.querySelectorAll('[data-testid^="poses-card-"]')).map(b => b.getAttribute('data-testid'))
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('cross-filters and statelessness (T063, T064)', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('keeps element, chakra and dosha filters visible in theme mode (FR-028)', () => {
    openThemeView()
    expect(screen.getByText('Element')).toBeInTheDocument()
    expect(screen.getByText('Chakra')).toBeInTheDocument()
    expect(screen.getByText('Dosha affinity')).toBeInTheDocument()
  })

  it('narrows sections through an element filter without leaving the closed set', () => {
    openThemeView()
    const before = document.querySelectorAll('[data-testid^="poses-theme-section-"]').length
    fireEvent.click(screen.getAllByRole('button', { name: 'fire' })[0])
    const after = Array.from(document.querySelectorAll('[data-testid^="poses-theme-section-"]'))
    expect(after.length).toBeLessThanOrEqual(before)
    const known = new Set(THEMES.map(t => `poses-theme-section-${t.slug}`))
    expect(after.every(s => known.has(s.getAttribute('data-testid')!))).toBe(true)
  })

  it('writes nothing about the reader while browsing (FR-030)', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    openThemeView()
    fireEvent.click(screen.getAllByRole('button', { name: 'fire' })[0])
    fireEvent.click(document.querySelector('[data-testid^="poses-card-"]')!)
    expect(setItem).not.toHaveBeenCalled()
    expect(document.cookie).toBe('')
    setItem.mockRestore()
  })
})
