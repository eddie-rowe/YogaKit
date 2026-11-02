'use client'

// Stop-sharing undo toast (005 T050, FR-049, Decisions #8 and #13). A single non-blocking toast
// with a 5-8s window instead of a confirmation dialog. `onExpire` fires once when the window
// ends; `onUndo` cancels expiry. Reuses the existing accent token and adds no motion. No RPC
// wiring here: the revoke call (T049) is the caller's. Presentational and unmounted.

import { useEffect, useRef, useState } from 'react'

export const DEFAULT_TOAST_MS = 6000
const MIN_TOAST_MS = 5000
const MAX_TOAST_MS = 8000

/** The undo window in ms: default 6000, clamped to 5000-8000. */
export function clampDuration(ms: number | undefined): number {
  if (ms === undefined) return DEFAULT_TOAST_MS
  return Math.min(MAX_TOAST_MS, Math.max(MIN_TOAST_MS, ms))
}

interface UndoToastProps {
  onUndo: () => void
  onExpire: () => void
  durationMs?: number
}

export default function UndoToast({ onUndo, onExpire, durationMs }: UndoToastProps) {
  const expire = useRef(onExpire)
  useEffect(() => {
    expire.current = onExpire
  })
  const [undone, setUndone] = useState(false)
  const window = clampDuration(durationMs)

  useEffect(() => {
    if (undone) return
    const id = setTimeout(() => expire.current(), window)
    return () => clearTimeout(id)
  }, [window, undone])

  return (
    <div
      role="status"
      data-testid="sadhana-undo-toast"
      className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm"
      style={{ background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--accent)' }}
    >
      <span>Sharing stopped.</span>
      <button
        type="button"
        data-testid="sadhana-undo-toast-undo"
        onClick={() => {
          setUndone(true)
          onUndo()
        }}
        className="underline"
        style={{ color: 'var(--accent)' }}
      >
        Undo
      </button>
    </div>
  )
}
