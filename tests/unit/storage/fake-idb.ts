// A store-aware in-memory stand-in for `idb`.
//
// jsdom provides no IndexedDB, and the behaviour under test in this directory is never
// the storage engine — it is the selection and ordering rules layered on top of it. So
// the honest boundary is `idb` itself.
//
// It became shared the moment the outbox landed: `flow-store` and `outbox` now open one
// database with two stores, so a single flat Map would let a flow and its outbox entry
// overwrite each other and hide exactly the bug these tests exist to catch.

/** Key path per store, matching src/lib/storage/db.ts. */
const KEY_PATHS: Record<string, string> = { flows: 'id', outbox: 'flowId' }

export type Row = Record<string, unknown>

export function createFakeIdb() {
  const stores = new Map<string, Map<string, Row>>()

  const storeFor = (name: string) => {
    let store = stores.get(name)
    if (!store) {
      store = new Map()
      stores.set(name, store)
    }
    return store
  }

  const db = {
    get: async (name: string, key: string) => storeFor(name).get(key),
    getAll: async (name: string) => [...storeFor(name).values()],
    put: async (name: string, value: Row) => {
      const key = value[KEY_PATHS[name]] as string
      if (key === undefined) throw new Error(`fake-idb: no ${KEY_PATHS[name]} on a ${name} row`)
      storeFor(name).set(key, value)
    },
    delete: async (name: string, key: string) => {
      storeFor(name).delete(key)
    },
    clear: async (name: string) => storeFor(name).clear(),
    objectStoreNames: { contains: () => true },
  }

  return {
    /** Pass to `vi.mock('idb', ...)`. */
    module: { openDB: async () => db },
    /** Direct access, for seeding a legacy row that the public API cannot write. */
    raw: storeFor,
    reset: () => stores.clear(),
  }
}

/** One fake per test module.
 *
 *  Exported as a singleton rather than a factory so a `vi.mock('idb')` factory — which is
 *  hoisted above every import — and the test body can reach the same instance. Vitest
 *  isolates the module registry per test file, so files do not share this. */
export const fakeIdb = createFakeIdb()

/** The `vi.mock('idb', ...)` replacement:
 *  `vi.mock('idb', async () => (await import('./fake-idb')).idbModuleMock)` */
export const idbModuleMock = fakeIdb.module
