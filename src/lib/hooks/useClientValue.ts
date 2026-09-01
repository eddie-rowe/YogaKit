'use client'

import { useSyncExternalStore } from 'react'

/** Reads a value that only exists in the browser — a cookie, a localStorage key —
 *  without a mount effect that sets state.
 *
 *  The mount-effect version of this (useState(null) + useEffect(setState)) is what
 *  react-hooks/set-state-in-effect flags, and the rule is right: it renders once
 *  with a value nobody chose, then again with the real one. useSyncExternalStore
 *  exists for exactly this shape — `serverValue` is what SSR and hydration render,
 *  and React reconciles against the real reading immediately after.
 *
 *  There is no browser event for "the cookie changed" or "this tab wrote
 *  localStorage", so the store is notified by hand: whoever writes the value calls
 *  notifyClientValueChanged(). That is a blunt instrument — it re-reads every
 *  subscriber, not just the one that changed — but the subscribers are a handful of
 *  settings controls reading single primitives, so precision would cost more than
 *  it buys. */
const listeners = new Set<() => void>()

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange)
  return () => {
    listeners.delete(onStoreChange)
  }
}

/** Call after writing a cookie or localStorage key that a useClientValue reads. */
export function notifyClientValueChanged(): void {
  for (const listener of listeners) listener()
}

/** `read` MUST return a primitive, or a value stable across calls when nothing has
 *  changed. Returning a fresh object each time makes React re-render forever. */
export function useClientValue<T>(read: () => T, serverValue: T): T {
  return useSyncExternalStore(subscribe, read, () => serverValue)
}
