// .krama.json export/import — the entire portability story for v0.1.
// Contract: specs/001-krama-mvp-spec/contracts/flow-file-format.md

import type { Flow, KramaFile } from '@/lib/flow/types'
import { stripAuthorOnly } from '@/lib/flow/share'

export const CURRENT_SCHEMA_VERSION = '0.1.0'

export interface ImportError {
  code: 'UNKNOWN_SCHEMA_VERSION' | 'MALFORMED' | 'MIGRATION_FAILED'
  message: string
}

export type ImportResult = { flow: Flow } | { error: ImportError }

// One pure migration function per version pair. Empty for v0.1 — there is no older
// schema_version to migrate from yet. Populate as MINOR bumps ship (see contract).
type Migration = (raw: Record<string, unknown>) => Record<string, unknown>
const MIGRATIONS: Record<string, Migration> = {}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasValidFlowShape(flow: unknown): flow is Flow {
  if (!isPlainObject(flow)) return false
  return (
    typeof flow.id === 'string' &&
    typeof flow.title === 'string' &&
    Array.isArray(flow.items) &&
    Array.isArray(flow.phases) &&
    typeof flow.createdAt === 'string' &&
    typeof flow.updatedAt === 'string' &&
    typeof flow.isBuiltIn === 'boolean' &&
    typeof flow.schema_version === 'string'
  )
}

export function exportKramaFile(flow: Flow, exportedAt: string): KramaFile {
  return {
    schema_version: CURRENT_SCHEMA_VERSION,
    exported_at: exportedAt,
    flow,
  }
}

/**
 * The same file, produced to give to someone else: author-only notes are not in it
 * (FR-029). Two functions rather than a flag, because the caller has to say which of
 * the two things they are doing, and "export" alone does not say it. The plain
 * `exportKramaFile` above is a teacher's own copy of their own work and keeps
 * everything.
 */
export function exportKramaFileForSharing(flow: Flow, exportedAt: string): KramaFile {
  return exportKramaFile(stripAuthorOnly(flow), exportedAt)
}

export function importKramaFile(raw: unknown, newId: string): ImportResult {
  if (!isPlainObject(raw)) {
    return { error: { code: 'MALFORMED', message: 'This file is not a valid .krama.json file.' } }
  }

  const schemaVersion = raw.schema_version
  if (typeof schemaVersion !== 'string') {
    return { error: { code: 'MALFORMED', message: 'This file is missing a schema_version.' } }
  }

  let flowData = raw.flow
  if (schemaVersion !== CURRENT_SCHEMA_VERSION) {
    const migrate = MIGRATIONS[schemaVersion]
    if (!migrate) {
      return {
        error: {
          code: 'UNKNOWN_SCHEMA_VERSION',
          message: `This file uses schema version ${schemaVersion}, which this version of Krama (supports ${CURRENT_SCHEMA_VERSION}) doesn't recognize.`,
        },
      }
    }
    try {
      flowData = migrate(isPlainObject(flowData) ? flowData : {})
    } catch {
      return {
        error: {
          code: 'MIGRATION_FAILED',
          message: `Could not migrate this file from schema version ${schemaVersion}.`,
        },
      }
    }
  }

  if (!hasValidFlowShape(flowData)) {
    return { error: { code: 'MALFORMED', message: 'This file does not contain a valid flow.' } }
  }

  return {
    flow: {
      ...flowData,
      id: newId,
      isBuiltIn: false,
    },
  }
}
