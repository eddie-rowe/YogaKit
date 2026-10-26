import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, fireEvent } from '@testing-library/react'

import PoseCard from '@/app/poses/PoseCard'
import { getAllPoses } from '@/lib/pose-library'
import {
  COMPLEXITY_EXPLANATION,
  INJURY_RISK_EXPLANATION,
  SCORE_EXPLANATION_FOOTER,
} from '@/app/poses/score-explanation'

const poses = getAllPoses()

describe('score explanation triggers (FR-022, SC-009)', () => {
  it('every rendered score node has an adjacent explanation trigger', () => {
    for (const pose of poses) {
      const { container, unmount } = render(<PoseCard pose={pose} onOpen={() => {}} />)
      const scores = container.querySelectorAll('[data-testid^="score-value-"]')
      const triggers = container.querySelectorAll('[data-testid^="score-explain-"]')
      expect(scores.length).toBeGreaterThanOrEqual(1) // complexity is unconditional
      expect(triggers.length).toBe(scores.length)
      scores.forEach(score => {
        const field = score.getAttribute('data-testid')!.replace('score-value-', '').split('-' + pose.slug)[0]
        expect(score.parentElement!.querySelector(`[data-testid="score-explain-${field}-${pose.slug}"]`)).not.toBeNull()
      })
      unmount()
    }
  })

  it('renders injury_risk only when the field is present', () => {
    const base = poses[0]
    const { rerender } = render(<PoseCard pose={{ ...base, injury_risk: undefined }} onOpen={() => {}} />)
    expect(screen.queryByTestId(`score-injury_risk-${base.slug}`)).not.toBeInTheDocument()
    expect(screen.getByTestId(`score-complexity-${base.slug}`)).toBeInTheDocument()
    rerender(<PoseCard pose={{ ...base, injury_risk: 3 }} onOpen={() => {}} />)
    expect(screen.getByTestId(`score-injury_risk-${base.slug}`)).toBeInTheDocument()
  })

  it('opens the explanation in place, with lineage and the shared footer', () => {
    const pose = { ...poses[0], complexity: 4, injury_risk: 2 }
    render(<PoseCard pose={pose} onOpen={() => {}} />)
    const trigger = screen.getByTestId(`score-explain-complexity-${pose.slug}`)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByTestId(`score-explanation-complexity-${pose.slug}`)
    expect(panel).toHaveTextContent(COMPLEXITY_EXPLANATION.body)
    expect(panel).toHaveTextContent(`Lineage: ${pose.source}`)
    expect(panel).toHaveTextContent(SCORE_EXPLANATION_FOOTER)
    fireEvent.click(trigger)
    expect(screen.queryByTestId(`score-explanation-complexity-${pose.slug}`)).not.toBeInTheDocument()
  })
})

describe('score explanation copy (rule 1 of contracts/score-explanation.md)', () => {
  // The signed-off copy itself says "not calculated" and "not derived from the sequencing
  // engine" — negations that disclaim a mechanism. Those exact phrases are allowed; any
  // other use of the vocabulary would assert a computation that does not exist.
  const NEGATED = [/not calculated/gi, /not derived from the sequencing engine/gi]
  const BANNED = [/calculated/i, /derived/i, /computed/i, /the engine/i]

  const strings = [COMPLEXITY_EXPLANATION.body, INJURY_RISK_EXPLANATION.body, SCORE_EXPLANATION_FOOTER]

  it.each(strings.map(s => [s.slice(0, 40), s]))('asserts no computation: %s…', (_label, text) => {
    const stripped = NEGATED.reduce((acc, re) => acc.replace(re, ''), text)
    for (const re of BANNED) expect(stripped).not.toMatch(re)
  })

  it('does not mention weighting constants or give instruction', () => {
    for (const s of strings) {
      expect(s).not.toMatch(/weight/i)
      expect(s).not.toMatch(/\byou (?:should|must)\b/i)
    }
  })

  it('keeps the complexity and injury-risk strings as separate exported constants', () => {
    expect(COMPLEXITY_EXPLANATION.body).not.toBe(INJURY_RISK_EXPLANATION.body)
  })
})

describe('filter chip touch targets (FR-026)', () => {
  const css = fs.readFileSync(path.join(process.cwd(), 'src/app/globals.css'), 'utf8')
  const client = fs.readFileSync(path.join(process.cwd(), 'src/app/poses/PosesClient.tsx'), 'utf8')

  it('.kk-chip carries a 40px (2.5rem) floor for touch pointers', () => {
    const coarse = css.match(/@media \(pointer: coarse\)\s*\{\s*\.kk-chip\s*\{[^}]*min-height:\s*2\.5rem/)
    expect(coarse).not.toBeNull()
  })

  it('every chip button in the catalog filter either uses kk-chip or sets min-h-10', () => {
    const buttons = client.match(/<button[\s\S]*?<\/button>/g) ?? []
    const chips = buttons.filter(b => /className=/.test(b) && !/underline/.test(b))
    expect(chips.length).toBeGreaterThan(10)
    for (const b of chips) expect(b).toMatch(/kk-chip|min-h-10/)
  })
})
