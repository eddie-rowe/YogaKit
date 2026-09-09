/**
 * Unit tests for DatadogRumView (fix for the DatadogAppRouter view-churn bug).
 *
 * These are the cases that would have caught the production bug: DatadogAppRouter
 * (from @datadog/browser-rum-nextjs) starts a view during render, guarded by a
 * per-instance useRef, so a discarded render attempt or a remount fires it again for
 * the same pathname. DatadogRumView starts the view in an effect and guards with
 * module-scoped state instead, specifically so a remount cannot restart an
 * already-started view (case 2 below is the one the SDK's own guard fails).
 *
 * Module state (`lastPathname`, `pendingNavigationUrl`) is reset between cases via
 * `resetDatadogRumView()` rather than `vi.resetModules()` — the mocks are wired with
 * `vi.mock` at module scope and re-importing per test would fight that setup, so a
 * dedicated reset hook keeps each case starting from a clean slate.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

const { startViewMock, usePathnameMock } = vi.hoisted(() => ({
  startViewMock: vi.fn(),
  usePathnameMock: vi.fn(),
}))

vi.mock('@datadog/browser-rum', () => ({
  datadogRum: { startView: startViewMock },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => usePathnameMock(),
}))

import { DatadogRumView, recordNavigationUrl, resetDatadogRumView } from '@/components/DatadogRumView'

describe('DatadogRumView', () => {
  beforeEach(() => {
    startViewMock.mockClear()
    usePathnameMock.mockReset()
    resetDatadogRumView()
  })

  it('starts exactly one view on mount', () => {
    usePathnameMock.mockReturnValue('/poses')
    render(<DatadogRumView />)
    expect(startViewMock).toHaveBeenCalledTimes(1)
    expect(startViewMock).toHaveBeenCalledWith({ name: '/poses', url: undefined })
  })

  it('does not start a second view on a remount at the same pathname', () => {
    usePathnameMock.mockReturnValue('/poses')
    const { unmount } = render(<DatadogRumView />)
    unmount()
    render(<DatadogRumView />)
    expect(startViewMock).toHaveBeenCalledTimes(1)
  })

  it('does not start a second view on a re-render at the same pathname', () => {
    usePathnameMock.mockReturnValue('/poses')
    const { rerender } = render(<DatadogRumView />)
    rerender(<DatadogRumView />)
    rerender(<DatadogRumView />)
    expect(startViewMock).toHaveBeenCalledTimes(1)
  })

  it('starts a second view when the pathname changes', () => {
    usePathnameMock.mockReturnValue('/poses')
    const { rerender } = render(<DatadogRumView />)
    usePathnameMock.mockReturnValue('/flows')
    rerender(<DatadogRumView />)
    expect(startViewMock).toHaveBeenCalledTimes(2)
    expect(startViewMock).toHaveBeenNthCalledWith(2, { name: '/flows', url: undefined })
  })

  it('starts a second view when navigating between two paths with the same scrubbed name', () => {
    usePathnameMock.mockReturnValue('/read/flow-a')
    const { rerender } = render(<DatadogRumView />)
    usePathnameMock.mockReturnValue('/read/flow-b')
    rerender(<DatadogRumView />)
    expect(startViewMock).toHaveBeenCalledTimes(2)
    expect(startViewMock).toHaveBeenNthCalledWith(1, { name: '/read/[id]', url: undefined })
    expect(startViewMock).toHaveBeenNthCalledWith(2, { name: '/read/[id]', url: undefined })
  })

  it('passes the scrubbed template as the view name, never the raw path', () => {
    usePathnameMock.mockReturnValue('/poses/downward-facing-dog')
    render(<DatadogRumView />)
    expect(startViewMock).toHaveBeenCalledWith({ name: '/poses/[slug]', url: undefined })
  })

  it('consumes a pending navigation url exactly once', () => {
    usePathnameMock.mockReturnValue('/flows')
    recordNavigationUrl('https://yogakit.vercel.app/flows')
    const { rerender } = render(<DatadogRumView />)
    expect(startViewMock).toHaveBeenNthCalledWith(1, {
      name: '/flows',
      url: 'https://yogakit.vercel.app/flows',
    })

    usePathnameMock.mockReturnValue('/sequences/seq-1')
    rerender(<DatadogRumView />)
    expect(startViewMock).toHaveBeenNthCalledWith(2, { name: '/sequences/[id]', url: undefined })
  })
})
