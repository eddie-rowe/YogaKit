import Anthropic from '@anthropic-ai/sdk'
import type {
  SessionContext,
  PipelineDraft,
  DraftPoseEntry,
  FiveElement,
  Style,
  Season,
} from './types'
import { getAllPoses } from '@/lib/pose-library'
import { getElementRecord } from '@/lib/meridians'

const MODEL = 'claude-opus-4-8'
const TIMEOUT_MS = 25_000

// Build an anonymized, PII-free prompt from session context (FR-006b, RULE-P3)
export function buildPrompt(ctx: SessionContext, availableSlugs: string[]): string {
  const element = ctx.elementFocus
  const elementInfo = element ? getElementRecord(element) : null
  const meridians = ctx.meridianFocus?.join(', ') ?? (elementInfo?.meridians.map(m => m.slug).join(', ') ?? 'none specified')

  // Categorical descriptors only — no names, ages, or identifying info
  const constraints = ctx.hardConstraints.contraindications.length
    ? `Contraindications (categorical): ${ctx.hardConstraints.contraindications.join(', ')}`
    : 'No student contraindications specified'

  const propsLine = ctx.hardConstraints.propsAvailable.length
    ? `Props available: ${ctx.hardConstraints.propsAvailable.join(', ')}`
    : 'Mat only'

  return `You are assisting a yoga teacher to design a class sequence. You are a specialist in yin yoga, TCM meridian theory, and yoga sequencing.

SESSION PARAMETERS (no student PII):
- Style: ${ctx.style ?? 'yin'}
- Duration: ${ctx.durationMinutes ?? 75} minutes
- Season: ${ctx.season ?? 'unspecified'}
- Experience level: ${ctx.experienceLevel ?? 'mixed'}
- Time of day: ${ctx.timeOfDay ?? 'unspecified'}
- Element focus: ${element ?? 'unspecified'}
- Meridian focus: ${meridians}
- Intensity curve: ${ctx.intensityCurve ?? 'bell'}
- Theme: ${ctx.theme ?? 'unspecified'}
- Goal: ${ctx.goal ?? 'unspecified'}
- ${constraints}
- ${propsLine}
${elementInfo ? `\nELEMENT CONTEXT — ${element}:
- Season: ${elementInfo.season}
- Themes: ${elementInfo.themes.join(', ')}
- Emotions (balanced): ${elementInfo.emotions.balanced}
- Body focus: ${elementInfo.body_focus.join(', ')}` : ''}

AVAILABLE POSE LIBRARY (slugs you may select from):
${availableSlugs.join(', ')}

TASK: Design a complete yoga sequence for this session. Return ONLY valid JSON matching this schema:

{
  "themeStatement": "string — one evocative sentence teachers can open class with",
  "philosophicalFraming": "string — 2-3 sentences on the practice's deeper intention",
  "quote": { "text": "string", "attribution": "string" },
  "poses": [
    {
      "poseSlug": "string — must be from the available list above",
      "modeType": "yin | yang | both",
      "holdMinutes": number,
      "why": "string — brief rationale for this pose in this sequence",
      "transitionFromPrev": "string — how to move from previous pose (empty string for first pose)",
      "suggestedAlternateSlugs": ["string"] // 1-3 alternate slugs that serve similar function
    }
  ]
}

SEQUENCING GUIDELINES:
- Respect the intensity curve (${ctx.intensityCurve ?? 'bell'})
- Begin supine or seated for yin/restorative; standing for vinyasa/ashtanga
- Always end with savasana or a similar deep rest pose
- For yin: hold poses 3-7 minutes, include rebounding/counter-poses, alternate sides for bilateral poses
- Total hold time should approximate ${ctx.durationMinutes ?? 75} minutes minus ~15 minutes for transitions
- Only reference slugs from the AVAILABLE POSE LIBRARY list above
- Suggest realistic alternates for each pose

Return only valid JSON. No markdown, no explanation outside the JSON.`
}

export async function propose(ctx: SessionContext): Promise<PipelineDraft> {
  const client = new Anthropic()

  // Filter available poses based on hard constraints (pre-filter before sending to AI)
  const allPoses = getAllPoses()
  const contraindications = ctx.hardConstraints.contraindications
  const availablePoses = allPoses.filter(
    p => !p.contraindications.some(c => contraindications.includes(c))
  )
  const availableSlugs = availablePoses.map(p => p.slug)

  const prompt = buildPrompt(ctx, availableSlugs)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal: controller.signal }
    )

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(raw) as {
      themeStatement: string
      philosophicalFraming: string
      quote: { text: string; attribution: string }
      poses: DraftPoseEntry[]
    }

    return {
      themeStatement: parsed.themeStatement,
      philosophicalFraming: parsed.philosophicalFraming,
      quote: parsed.quote,
      poses: parsed.poses,
      aiModelUsed: MODEL,
      generationSkipped: false,
    }
  } catch (err) {
    // Graceful fallback to rules-only mode on timeout or parse failure
    return fallbackDraft(ctx, availableSlugs)
  } finally {
    clearTimeout(timer)
  }
}

// Minimal fallback when AI is unavailable — rules engine will fill in the sequence
function fallbackDraft(ctx: SessionContext, availableSlugs: string[]): PipelineDraft {
  const style: Style = ctx.style ?? 'yin'
  const season: Season = ctx.season ?? 'winter'
  const element: FiveElement | undefined = ctx.elementFocus

  return {
    themeStatement: `A ${style} practice for ${season}${element ? `, working with ${element} element energy` : ''}.`,
    philosophicalFraming: 'This sequence was generated in fallback mode. The teacher may add their own framing.',
    quote: {
      text: 'In the beginner\'s mind there are many possibilities.',
      attribution: 'Shunryu Suzuki',
    },
    poses: [],
    aiModelUsed: 'none',
    generationSkipped: true,
  }
}
