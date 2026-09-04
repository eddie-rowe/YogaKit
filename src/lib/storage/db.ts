// The IndexedDB handle both storage modules share (constitution RULE-L3).
//
// This file exists to break a cycle rather than to add a layer. `flow-store` has to
// read the outbox to derive a flow's sync state, and the outbox has to open the same
// database — so whichever of the two owned `openDB` would have been imported by the
// other and by itself. The connection is the thing they genuinely share, so it lives
// on its own and neither imports the other's storage.

import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'krama'

/** v1 shipped `flows` alone. v2 adds `outbox` (004 US2, data-model.md §5). */
export const DB_VERSION = 2

export const FLOWS_STORE = 'flows'
export const OUTBOX_STORE = 'outbox'

let dbPromise: Promise<IDBPDatabase> | null = null

export function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      // Creating the missing stores is the whole upgrade. Existing `flows` records
      // are not read, rewritten, or migrated: every field C2 adds is derived at read
      // time, so a v1 database becomes a valid v2 database by gaining an empty store.
      // A teacher's flows are the only copy of their work, and the safest migration
      // over them is the one that does not touch them.
      upgrade(db) {
        if (!db.objectStoreNames.contains(FLOWS_STORE)) {
          db.createObjectStore(FLOWS_STORE, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          db.createObjectStore(OUTBOX_STORE, { keyPath: 'flowId' })
        }
      },
    })
  }
  return dbPromise
}
