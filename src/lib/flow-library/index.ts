// Built-in flow library — the 3 shipped .krama.json templates in data/flows/.
// Mirrors src/lib/pose-library/index.ts's server-only fs read pattern.

import fs from 'node:fs'
import path from 'node:path'

import type { Flow } from '@/lib/flow/types'
import type { KramaFile } from '@/lib/flow/types'

function loadBuiltInFlows(): Flow[] {
  const flowsDir = path.join(process.cwd(), 'data', 'flows')
  if (!fs.existsSync(flowsDir)) return []

  const files = fs.readdirSync(flowsDir).filter((f: string) => f.endsWith('.krama.json'))
  return files
    .map((file: string) => {
      const content = fs.readFileSync(path.join(flowsDir, file), 'utf-8')
      const parsed = JSON.parse(content) as KramaFile
      return parsed.flow
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

let _builtInCache: Flow[] | null = null

export function getBuiltInFlows(): Flow[] {
  if (!_builtInCache) {
    _builtInCache = loadBuiltInFlows()
  }
  return _builtInCache
}

export function getBuiltInFlowById(id: string): Flow | undefined {
  return getBuiltInFlows().find(f => f.id === id)
}
