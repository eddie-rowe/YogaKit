// Flow persistence — IndexedDB via idb. Local-first, no server (constitution RULE-L3).

import { openDB, type IDBPDatabase } from 'idb'
import type { Flow } from '@/lib/flow/types'

const DB_NAME = 'krama'
const DB_VERSION = 1
const STORE_NAME = 'flows'

/** Where a locally-durable flow stands relative to the server.
 *
 *  There is no sync target yet — every write is `pending` until one exists. The
 *  field is recorded now so the write path already distinguishes these states
 *  when the outbox lands, rather than being retrofitted underneath a UI that
 *  assumes them (specs/004-sequencing-composer, UX-009). */
export type SyncState = 'synced' | 'pending' | 'failed'

/** A flow as it sits on disk: the domain entity plus its replication status. */
export type StoredFlow = Flow & { syncState: SyncState }

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

/** Records already on disk predate `syncState`; they are unreplicated by
 *  definition, so they read back as `pending` rather than as undefined. */
function withSyncState(flow: Flow & { syncState?: SyncState }): StoredFlow {
  return { ...flow, syncState: flow.syncState ?? 'pending' }
}

export async function saveFlow(flow: Flow, syncState: SyncState = 'pending'): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, { ...flow, syncState })
}

export async function getFlow(id: string): Promise<StoredFlow | undefined> {
  const db = await getDb()
  const flow = await db.get(STORE_NAME, id)
  return flow ? withSyncState(flow) : undefined
}

export async function getAllFlows(): Promise<StoredFlow[]> {
  const db = await getDb()
  const flows = await db.getAll(STORE_NAME)
  return flows.map(withSyncState)
}

export async function deleteFlow(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}

/** Drops every locally-cached flow.
 *
 *  Sign-out must call this: the cache outlives the session, so without it the
 *  next person to sign in on a shared device reads the previous user's flows
 *  (specs/004-sequencing-composer, UX-011). */
export async function clearAllFlows(): Promise<void> {
  const db = await getDb()
  await db.clear(STORE_NAME)
}
