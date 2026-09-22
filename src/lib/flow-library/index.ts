// Built-in flow library — the 3 shipped .krama.json templates in data/flows/.
// Mirrors src/lib/pose-library/index.ts's server-only fs read pattern.

import fs from 'node:fs'
import path from 'node:path'

import type { Flow } from '@/lib/flow/types'
import type { KramaFile } from '@/lib/flow/types'

interface BuiltInIndex {
  flows: Flow[]
  bySlug: Map<string, Flow>
}

function loadBuiltInFlows(): BuiltInIndex {
  const flowsDir = path.join(process.cwd(), 'data', 'flows')
  if (!fs.existsSync(flowsDir)) return { flows: [], bySlug: new Map() }

  const files = fs.readdirSync(flowsDir).filter((f: string) => f.endsWith('.krama.json'))
  const bySlug = new Map<string, Flow>()
  const flows = files
    .map((file: string) => {
      const content = fs.readFileSync(path.join(flowsDir, file), 'utf-8')
      const parsed = JSON.parse(content) as KramaFile
      const flow = parsed.flow
      bySlug.set(file.replace(/\.krama\.json$/, ''), flow)
      return flow
    })
    .sort((a, b) => a.title.localeCompare(b.title))

  return { flows, bySlug }
}

let _builtInCache: BuiltInIndex | null = null

function getBuiltInIndex(): BuiltInIndex {
  if (!_builtInCache) {
    _builtInCache = loadBuiltInFlows()
  }
  return _builtInCache
}

export function getBuiltInFlows(): Flow[] {
  return getBuiltInIndex().flows
}

// Accepts either the flow's UUID (id field) or its data/flows/<slug>.krama.json
// filename slug — the slug only exists as a filename, never as a Flow field, so
// built-in flows are looked up by UUID first (existing links), slug second.
export function getBuiltInFlowById(idOrSlug: string): Flow | undefined {
  const { flows, bySlug } = getBuiltInIndex()
  return flows.find(f => f.id === idOrSlug) ?? bySlug.get(idOrSlug)
}
