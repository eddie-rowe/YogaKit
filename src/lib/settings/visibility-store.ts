// 006 US2 (T027): practice-signal sharing state, shared by every mounting (FR-014, FR-016).
// Pure subscribe/get store, shaped for React useSyncExternalStore. No network, DB, or storage:
// persistence is injected by the component layer, which calls markRecorded() once it lands.

export type VisibilityState = 'shared' | 'revoked' | 'pending-record'

export interface VisibilityStore {
  get(): VisibilityState
  subscribe(listener: () => void): () => void
  share(): void
  /** Starts a revoke. Reads `pending-record`, never `revoked`, until markRecorded(). */
  requestRevoke(): void
  markRecorded(): void
}

export function createVisibilityStore(initial: VisibilityState = 'shared'): VisibilityStore {
  let state = initial
  const listeners = new Set<() => void>()
  const set = (next: VisibilityState) => {
    if (next === state) return
    state = next
    for (const l of [...listeners]) l()
  }
  return {
    get: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    share: () => set('shared'),
    requestRevoke: () => set('pending-record'),
    markRecorded: () => {
      if (state === 'pending-record') set('revoked')
    },
  }
}
