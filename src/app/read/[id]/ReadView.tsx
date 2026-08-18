import type { Pose } from '@/lib/pipeline/types'
import type { Flow } from '@/lib/flow/types'
import { isStillnessNode } from '@/lib/flow/types'
import { resolveDisplayName } from '@/lib/pose-library/display-name'

interface Props {
  flow: Flow
  poses: Pose[]
}

// A teacher glances at this mid-pose (spec §10.6, "the 6am test") — large type,
// minimal chrome, one breath mark per phase of the hold so it reads at arm's length.
function breathMark(measure: { breaths?: number; seconds?: number }): string {
  if (measure.breaths != null) return `${measure.breaths} breath${measure.breaths === 1 ? '' : 's'}`
  if (measure.seconds != null) {
    const minutes = Math.round(measure.seconds / 60)
    return minutes >= 1 ? `${minutes} min` : `${measure.seconds}s`
  }
  return ''
}

export default function ReadView({ flow, poses }: Props) {
  const poseBySlug = new Map(poses.map(p => [p.slug, p]))
  const items = [...flow.items].sort((a, b) => a.order - b.order)

  const grouped: Array<{ phaseId: string | null; name: string | null; items: typeof items }> = []
  for (const item of items) {
    const last = grouped[grouped.length - 1]
    if (last && last.phaseId === item.phaseId) {
      last.items.push(item)
    } else {
      const phase = flow.phases.find(p => p.id === item.phaseId)
      grouped.push({ phaseId: item.phaseId, name: phase?.name ?? null, items: [item] })
    }
  }

  return (
    <div className="kk-page print-page">
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-8">
        <header className="mb-2">
          <h1 className="font-serif text-3xl font-semibold">{flow.title}</h1>
        </header>

        {grouped.map((group, gi) => (
          <section key={gi} data-testid={group.phaseId ? `read-phase-${group.phaseId}` : undefined}>
            {group.name && (
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
                {group.name}
              </h2>
            )}
            <div className="space-y-4">
              {group.items.map(item => {
                const globalIndex = items.indexOf(item)
                const pose = poseBySlug.get(item.poseSlug)
                const stillness = isStillnessNode(item.poseSlug)
                return (
                  <div
                    key={item.id}
                    data-testid={`read-item-${globalIndex}`}
                    className={`pose-row flex items-baseline justify-between gap-4 pb-2 border-b ${stillness ? 'kk-stillness' : ''}`}
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className={stillness ? 'text-xl' : 'text-2xl font-medium'}>
                      {pose ? resolveDisplayName(pose) : item.poseSlug}
                    </span>
                    <span data-testid="read-breath-mark" className="text-lg whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                      {breathMark(item.measure)}
                    </span>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
