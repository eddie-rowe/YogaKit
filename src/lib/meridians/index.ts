import type { ElementRecord, FiveElement, MeridianRecord } from '@/lib/pipeline/types'

function loadMeridianData(): Record<FiveElement, ElementRecord> {
  const fs = require('fs') as typeof import('fs')
  const path = require('path') as typeof import('path')
  const dir = path.join(process.cwd(), 'data', 'meridians')
  const elements: FiveElement[] = ['wood', 'fire', 'earth', 'metal', 'water']
  const result = {} as Record<FiveElement, ElementRecord>
  for (const el of elements) {
    const content = fs.readFileSync(path.join(dir, `${el}.json`), 'utf-8')
    result[el] = JSON.parse(content) as ElementRecord
  }
  return result
}

let _cache: Record<FiveElement, ElementRecord> | null = null

function getData(): Record<FiveElement, ElementRecord> {
  if (!_cache) _cache = loadMeridianData()
  return _cache
}

export function getElementRecord(element: FiveElement): ElementRecord {
  return getData()[element]
}

export function getAllElements(): ElementRecord[] {
  return Object.values(getData())
}

export function getMeridianBySlug(slug: string): MeridianRecord | undefined {
  for (const record of getAllElements()) {
    const found = record.meridians.find(m => m.slug === slug)
    if (found) return found
  }
  return undefined
}

export function getMeridianSlugsForElement(element: FiveElement): string[] {
  return getData()[element].meridians.map(m => m.slug)
}
