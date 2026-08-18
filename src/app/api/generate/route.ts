import { NextRequest } from 'next/server'
import { propose } from '@/lib/pipeline/propose'
import { constrain } from '@/lib/pipeline/constrain'
import { validate } from '@/lib/pipeline/validate'
import { resolveDefaults } from '@/lib/session/defaults'
import type { SessionContext } from '@/lib/pipeline/types'

// Keyword patterns where theme implies poses that are blocked by specific contraindications
const THEME_CONSTRAINT_CONFLICTS: Array<{
  themeKeywords: RegExp
  blockedBy: string[]
  suggestedReframe: string
}> = [
  {
    themeKeywords: /hip.?open|hip.?flexor|pigeon/i,
    blockedBy: ['hip-replacement', 'hip-injury'],
    suggestedReframe: 'grounding and stability',
  },
  {
    themeKeywords: /inver|headstand|shoulder.?stand|handstand/i,
    blockedBy: ['no-inversions', 'high-blood-pressure', 'glaucoma', 'vertigo', 'neck-injury'],
    suggestedReframe: 'rooting into earth energy',
  },
  {
    themeKeywords: /backbend|heart.?open|spine.?exten/i,
    blockedBy: ['low-back-injury', 'herniated-disc', 'osteoporosis'],
    suggestedReframe: 'gentle opening and spaciousness',
  },
  {
    themeKeywords: /twist|rotation/i,
    blockedBy: ['sacroiliac-joint', 'scoliosis', 'pregnancy'],
    suggestedReframe: 'gentle lateral lengthening',
  },
]

function detectThemeConflict(
  theme: string,
  contraindications: string[]
): { conflicting: string[]; suggestedReframe: string } | null {
  if (!theme || !contraindications.length) return null

  for (const rule of THEME_CONSTRAINT_CONFLICTS) {
    if (rule.themeKeywords.test(theme)) {
      const active = rule.blockedBy.filter(c => contraindications.includes(c))
      if (active.length > 0) {
        return { conflicting: active, suggestedReframe: rule.suggestedReframe }
      }
    }
  }
  return null
}

export const maxDuration = 30

// POST /api/generate — SSE streaming endpoint for sequence generation
// Pipeline order (immutable): Propose → rules engine constrain → safety validate (RULE-H1)
export async function POST(req: NextRequest) {
  let ctx: SessionContext
  let skipDurationCheck = false
  try {
    const body = await req.json()
    skipDurationCheck = Boolean(body.skipDurationCheck)
    ctx = resolveDefaults(body as Partial<SessionContext>)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const encoder = new TextEncoder()

  function sseEvent(eventType: string, data: unknown): Uint8Array {
    return encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`)
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Pre-flight: detect theme-vs-constraint conflicts (FR-016)
        if (ctx.theme) {
          const conflict = detectThemeConflict(ctx.theme, ctx.hardConstraints.contraindications)
          if (conflict) {
            controller.enqueue(sseEvent('error', {
              code: 'THEME_CONFLICT',
              message: `Your theme "${ctx.theme}" conflicts with: ${conflict.conflicting.join(', ')}. Teacher acknowledgement required before continuing.`,
              conflictingConstraints: conflict.conflicting,
              theme: ctx.theme,
              suggestedReframe: conflict.suggestedReframe,
            }))
            controller.close()
            return
          }
        }

        // Stage 1: Propose
        controller.enqueue(sseEvent('progress', { stage: 'propose', message: 'Building your sequence…' }))
        const draft = await propose(ctx)

        // Stage 2: Rules engine constraint
        controller.enqueue(sseEvent('progress', { stage: 'constrain', message: 'Applying sequencing rules…' }))
        const constrained = constrain(draft, ctx)

        // Check for duration conflict (skip if teacher already accepted compressed sequence)
        if (!skipDurationCheck) {
          const targetHold = (ctx.durationMinutes ?? 75) * 0.8
          const holdDiff = Math.abs(constrained.totalHoldMinutes - targetHold)
          if (holdDiff > targetHold * 0.3) {
            controller.enqueue(sseEvent('error', {
              code: 'DURATION_CONFLICT',
              message: `Sequence hold time (${constrained.totalHoldMinutes} min) deviates significantly from target.`,
              totalHoldMinutes: constrained.totalHoldMinutes,
              targetMinutes: ctx.durationMinutes,
            }))
            controller.close()
            return
          }
        }

        // Stage 3: Safety validation
        controller.enqueue(sseEvent('progress', { stage: 'validate', message: 'Running safety checks…' }))
        const validated = validate(constrained)

        // Check for unresolvable safety violations
        const unresolvable = validated.safetyNotes.filter(n =>
          n.issue.startsWith('SAFETY_UNRESOLVABLE')
        )
        if (unresolvable.length > 0) {
          controller.enqueue(sseEvent('error', {
            code: 'SAFETY_UNRESOLVABLE',
            message: 'One or more poses could not be safely replaced given the provided constraints.',
            violations: unresolvable,
          }))
          controller.close()
          return
        }

        // Check that we have at least some poses
        if (validated.items.length === 0) {
          controller.enqueue(sseEvent('error', {
            code: 'NO_POSES_MATCH',
            message: 'No poses matched the given constraints. Try relaxing contraindications or changing style/element.',
          }))
          controller.close()
          return
        }

        // Emit final validated sequence
        controller.enqueue(sseEvent('sequence', validated))
        controller.close()
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(sseEvent('error', {
          code: 'PIPELINE_ERROR',
          message,
        }))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
