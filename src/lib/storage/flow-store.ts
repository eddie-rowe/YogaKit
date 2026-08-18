// Flow persistence — IndexedDB via idb. Local-first, no server (constitution RULE-L3).

import { openDB, type IDBPDatabase } from 'idb'
import type { Flow } from '@/lib/flow/types'

const DB_NAME = 'krama'
const DB_VERSION = 1
const STORE_NAME = 'flows'

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

export async function saveFlow(flow: Flow): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, flow)
}

export async function getFlow(id: string): Promise<Flow | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, id)
}

export async function getAllFlows(): Promise<Flow[]> {
  const db = await getDb()
  return db.getAll(STORE_NAME)
}

export async function deleteFlow(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}
