'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { Flow } from '@/lib/flow/types'
import { getAllFlows, deleteFlow, saveFlow } from '@/lib/storage/flow-store'
import { CURRENT_SCHEMA_VERSION, exportKramaFile, importKramaFile } from '@/lib/storage/krama-file'
import { formatDuration, totalSeconds } from '@/lib/flow/duration'

interface Props {
  builtins: Flow[]
}

function nowIso(): string {
  return new Date().toISOString()
}

export default function FlowsClient({ builtins }: Props) {
  const [savedFlows, setSavedFlows] = useState<Flow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function refresh() {
    setSavedFlows(await getAllFlows())
    setLoaded(true)
  }

  useEffect(() => {
    refresh()
  }, [])

  function handleExport(flow: Flow) {
    const file = exportKramaFile(flow, nowIso())
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${flow.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.krama.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete(id: string) {
    await deleteFlow(id)
    refresh()
  }

  async function handleImportFile(file: File) {
    setImportError(null)
    try {
      const raw = JSON.parse(await file.text())
      const result = importKramaFile(raw, crypto.randomUUID())
      if ('error' in result) {
        setImportError(result.error.message)
        return
      }
      await saveFlow(result.flow)
      refresh()
    } catch {
      setImportError('This file could not be read as a .krama.json flow.')
    }
  }

  return (
    <div className="kk-page">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl font-semibold">Flows</h1>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.krama.json,application/json"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleImportFile(file)
                e.target.value = ''
              }}
            />
            <button
              data-testid="flows-import"
              onClick={() => fileInputRef.current?.click()}
              className="kk-btn-outline px-3 py-1.5 text-sm"
            >
              Import
            </button>
            <Link href="/compose" className="kk-btn px-3 py-1.5 text-sm font-medium">
              New flow
            </Link>
          </div>
        </div>

        {/* The export format already carries its schema version and an export
            timestamp; naming the version here makes the portability contract
            visible before a file is written rather than only inside it
            (docs/design-research/21-portability-export-share.md). */}
        <p
          data-testid="flows-format-caption"
          className="text-xs"
          style={{ color: 'var(--muted)' }}
        >
          Exports are plain <code>.krama.json</code> files, schema v{CURRENT_SCHEMA_VERSION},
          stamped with the time they were written.
        </p>

        {importError && <div className="kk-warning px-3 py-2 text-sm">{importError}</div>}

        <div data-testid="flows-list" className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
            Built-in
          </h2>
          {builtins.map(flow => (
            <div key={flow.id} data-testid={`flows-item-${flow.id}`} className="kk-card px-3 py-2.5 flex items-center justify-between gap-2">
              <Link href={`/flows/${flow.id}`} className="flex-1">
                <div className="text-sm font-medium">{flow.title}</div>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                  {flow.items.length} poses · {formatDuration(totalSeconds(flow.items))} · read-only
                </div>
              </Link>
              <Link data-testid={`flows-duplicate-${flow.id}`} href={`/compose/${flow.id}`} className="kk-btn-outline px-2.5 py-1 text-xs">
                Duplicate
              </Link>
              <button data-testid={`flows-export-${flow.id}`} onClick={() => handleExport(flow)} className="kk-btn-outline px-2.5 py-1 text-xs">
                Export
              </button>
            </div>
          ))}

          <h2 className="text-xs font-semibold uppercase tracking-widest pt-3" style={{ color: 'var(--muted)' }}>
            Yours
          </h2>
          {loaded && savedFlows.length === 0 && (
            <p className="text-sm py-4" style={{ color: 'var(--muted)' }}>No saved flows yet. Duplicate a built-in or start a new one.</p>
          )}
          {savedFlows
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
            .map(flow => (
              <div key={flow.id} data-testid={`flows-item-${flow.id}`} className="kk-card px-3 py-2.5 flex items-center justify-between gap-2">
                <Link href={`/flows/${flow.id}`} className="flex-1">
                  <div className="text-sm font-medium">{flow.title}</div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>
                    {flow.items.length} poses · {formatDuration(totalSeconds(flow.items))}
                  </div>
                </Link>
                <Link href={`/compose/${flow.id}`} className="kk-btn-outline px-2.5 py-1 text-xs">
                  Edit
                </Link>
                <button data-testid={`flows-export-${flow.id}`} onClick={() => handleExport(flow)} className="kk-btn-outline px-2.5 py-1 text-xs">
                  Export
                </button>
                <button
                  data-testid={`flows-delete-${flow.id}`}
                  onClick={() => handleDelete(flow.id)}
                  className="text-xs px-2 py-1"
                  style={{ color: 'var(--muted)' }}
                >
                  Delete
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
