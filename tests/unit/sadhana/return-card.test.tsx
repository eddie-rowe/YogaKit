import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ReturnCard from '@/components/sadhana/ReturnCard'
import type { ReentryOffer } from '@/lib/sadhana/reentry-offer'

const GUILT = /missed|lapse|fail|behind|catch up|streak|lost|broke|urgent|hurry|don'?t|must|shame/i

describe('ReturnCard (T039/T040)', () => {
  const base = { elapsedDays: 9, intention: 'Sit before the house wakes', onKeep: () => {}, onUpdate: () => {}, onRest: () => {} }

  it('states the elapsed time plainly and quotes the intention', () => {
    render(<ReturnCard {...base} />)
    expect(screen.getByTestId('sadhana-return-elapsed')).toHaveTextContent('9 days')
    expect(screen.getByTestId('sadhana-return-intention')).toHaveTextContent('Sit before the house wakes')
  })

  it('uses the singular for one day', () => {
    render(<ReturnCard {...base} elapsedDays={1} />)
    expect(screen.getByTestId('sadhana-return-elapsed')).toHaveTextContent('1 day')
    expect(screen.getByTestId('sadhana-return-elapsed')).not.toHaveTextContent('1 days')
  })

  it('omits the quote when no intention was active', () => {
    render(<ReturnCard {...base} intention={null} />)
    expect(screen.queryByTestId('sadhana-return-intention')).toBeNull()
  })

  it('renders keep and update with identical class weight, plus the resting response', () => {
    render(<ReturnCard {...base} />)
    const keep = screen.getByTestId('sadhana-return-keep')
    const update = screen.getByTestId('sadhana-return-update')
    expect(keep.className).toBe(update.className)
    expect(keep.getAttribute('style')).toBe(update.getAttribute('style'))
    expect(screen.getByTestId('sadhana-return-rest')).toHaveTextContent("I'm resting, not stopping")
  })

  it('fires each callback', () => {
    const onKeep = vi.fn()
    const onUpdate = vi.fn()
    const onRest = vi.fn()
    render(<ReturnCard {...base} onKeep={onKeep} onUpdate={onUpdate} onRest={onRest} />)
    fireEvent.click(screen.getByTestId('sadhana-return-keep'))
    fireEvent.click(screen.getByTestId('sadhana-return-update'))
    fireEvent.click(screen.getByTestId('sadhana-return-rest'))
    expect(onKeep).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledTimes(1)
    expect(onRest).toHaveBeenCalledTimes(1)
  })

  it('frames nothing as a lapse and proposes no catching up', () => {
    const { container } = render(<ReturnCard {...base} />)
    expect(container.textContent).not.toMatch(GUILT)
  })
  describe('re-entry offer (T041 mount, FR-032/033)', () => {
    const phaseOffer: ReentryOffer = { kind: 'phase', phaseId: 'p1', itemIds: ['a', 'b'] }
    const poseOffer: ReentryOffer = { kind: 'pose', itemId: 'a', poseSlug: 'tadasana' }

    it('renders one plain line naming a phase unit and a start control', () => {
      const onStartOffer = vi.fn()
      render(<ReturnCard {...base} offer={phaseOffer} onStartOffer={onStartOffer} />)
      expect(screen.getByTestId('sadhana-return-offer')).toHaveTextContent(/first phase/i)
      fireEvent.click(screen.getByTestId('sadhana-return-offer-start'))
      expect(onStartOffer).toHaveBeenCalledTimes(1)
    })

    it('names a single pose when the offer is a pose', () => {
      render(<ReturnCard {...base} offer={poseOffer} onStartOffer={() => {}} />)
      expect(screen.getByTestId('sadhana-return-offer')).toHaveTextContent(/first pose/i)
    })

    it.each([[undefined], [null]])('renders nothing extra when offer is %s', (offer) => {
      render(<ReturnCard {...base} offer={offer} />)
      expect(screen.queryByTestId('sadhana-return-offer')).toBeNull()
      expect(screen.queryByTestId('sadhana-return-offer-start')).toBeNull()
    })

    it('uses no catch-up or guilt wording and does not count anything missed', () => {
      const { container } = render(<ReturnCard {...base} offer={phaseOffer} onStartOffer={() => {}} />)
      const offerText = screen.getByTestId('sadhana-return-offer').textContent ?? ''
      expect(offerText).not.toMatch(GUILT)
      expect(offerText).not.toMatch(/\d/)
      expect(container.textContent).not.toMatch(/make up|catch/i)
    })

    it('gives the start control the same class and style as keep and update', () => {
      render(<ReturnCard {...base} offer={phaseOffer} onStartOffer={() => {}} />)
      const keep = screen.getByTestId('sadhana-return-keep')
      const start = screen.getByTestId('sadhana-return-offer-start')
      expect(start.className).toBe(keep.className)
      expect(start.getAttribute('style')).toBe(keep.getAttribute('style'))
    })

    it('leaves the three existing responses identical with and without an offer', () => {
      const a = render(<ReturnCard {...base} />)
      const without = ['keep', 'update', 'rest'].map((k) => {
        const el = screen.getByTestId(`sadhana-return-${k}`)
        return [el.className, el.getAttribute('style')]
      })
      a.unmount()
      render(<ReturnCard {...base} offer={phaseOffer} onStartOffer={() => {}} />)
      const withOffer = ['keep', 'update', 'rest'].map((k) => {
        const el = screen.getByTestId(`sadhana-return-${k}`)
        return [el.className, el.getAttribute('style')]
      })
      expect(withOffer).toEqual(without)
    })
  })
})
