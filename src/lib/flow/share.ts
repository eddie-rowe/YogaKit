// The author boundary, for the one path that has no RLS to lean on: a file.
// Contract: specs/004-sequencing-composer/contracts/flow-sharing.md (I8),
// shape: specs/004-sequencing-composer/data-model.md §6.

import type { Flow } from './types'

/**
 * A flow with `note` removed from every item.
 *
 * Used for a file export produced for sharing (FR-029) and nowhere else. It is
 * deliberately *not* the mechanism for FR-022: the server share path does not call
 * this and must not need to. Notes live in their own table, no policy on that table
 * mentions an organization, and the share query reads three tables that have no
 * column holding a note — so the data path is protected by the schema's shape rather
 * than by a function every future caller has to remember. If a reviewer can find an
 * application-layer function that is load-bearing for the author boundary, SC-009 has
 * already failed.
 *
 * A file has no such shape to lean on, so it gets a function.
 *
 * The key is deleted, not blanked: `JSON.stringify` omits an absent key and keeps an
 * `undefined`-valued one out too, but a `''` would travel and would read, on import,
 * as a note the author wrote and then cleared.
 */
export function stripAuthorOnly(flow: Flow): Flow {
  return {
    ...flow,
    items: flow.items.map(item => {
      // `delete` rather than a destructured omit: the omit leaves an unused binding,
      // and the lint config counts it (29 problems is a ceiling this may not raise).
      const copy = { ...item }
      delete copy.note
      return copy
    }),
  }
}
