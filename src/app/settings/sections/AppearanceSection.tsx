'use client'

import { notifyClientValueChanged, useClientValue } from '@/lib/hooks/useClientValue'
import { applyTheme, readThemeCookie, type ThemeChoice } from '@/lib/theme'
import { Section } from './Section'

const OPTIONS: { value: ThemeChoice; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Follows your device' },
  { value: 'light', label: 'Light', hint: '' },
  { value: 'dark', label: 'Dark', hint: '' },
]

export default function AppearanceSection() {
  // The cookie doesn't exist on the server, and guessing here would flash the
  // wrong option selected. The *theme itself* is already correct by this point —
  // the pre-paint script in layout.tsx stamped it before anything painted (006
  // FR-032). This only drives which chip looks chosen, so 'system' is the right
  // thing to render until the real cookie is readable.
  const choice = useClientValue(() => readThemeCookie(document.cookie), 'system')

  function pick(next: ThemeChoice) {
    applyTheme(next)
    notifyClientValueChanged()
  }

  return (
    <Section id="appearance" title="Appearance">
      <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-2">
        {OPTIONS.map(option => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={choice === option.value}
            data-testid={`settings-theme-${option.value}`}
            data-active={choice === option.value}
            onClick={() => pick(option.value)}
            className="kk-chip px-3.5 text-sm"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        System follows your device, including its own light and dark schedule.
      </p>
    </Section>
  )
}
