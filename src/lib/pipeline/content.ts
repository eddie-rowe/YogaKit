import type { FiveElement, Season, Style } from './types'

export interface SequenceContent {
  themeStatement: string
  philosophicalFraming: string
  quote: { text: string; attribution: string }
}

type ElementKey = FiveElement | 'none'

const FRAMINGS: Record<ElementKey, string[]> = {
  wood: [
    "Spring is the season of Wood — the liver and gallbladder meridians carry the energy of vision reaching for expression. In yin practice, we soften the fascia along these pathways, releasing winter's holding into creative potential. We practice the paradox of the tree: deep roots that allow bending without breaking.",
    "The wood element teaches us that true resilience requires flexibility. We do not hold ourselves rigid against life's forces — we learn to bend, to yield, and to spring back. Each long hold in this sequence offers the tendons and ligaments a quiet invitation to soften.",
  ],
  fire: [
    "The fire element governs the heart and small intestine meridians — the seat of joy, connection, and the capacity to discern what truly nourishes. This practice creates space in the heart center, not by forcing opening, but by removing what blocks it. Summer warmth can move freely when we soften our armor.",
    "In summer, fire energy is expansive and radiant. The heart meridian asks: where am I genuinely connected, and where am I performing connection? This practice offers a return to the authentic warmth at the center — the flame that needs no audience.",
  ],
  earth: [
    "Late summer is the harvest — the pivot between expansion and contraction, the season of receiving. The earth element, carried by the stomach and spleen meridians, governs digestion in the broadest sense: the capacity to take in experience, extract nourishment, and release the rest. This practice returns us again and again to center.",
    "Earth energy is the mother energy — stable, receptive, always present beneath movement and change. The spleen and stomach meridians run through the body's center, asking us to be open, to receive, to trust we will be nourished. In each long hold, we practice simply being here.",
  ],
  metal: [
    "Autumn is the season of Metal — when trees release what they no longer need, composting it into next year's nourishment. The lung and large intestine meridians carry the energetics of this release: the grief of letting go, and beneath it, the clarity and spaciousness that follow. Each exhale is a practice of surrender.",
    "The metal element teaches us that letting go is refinement — keeping what is precious, releasing what no longer serves. The lungs hold unprocessed grief; the large intestine holds what has not yet been released. This practice offers both the breath and the body an invitation to let go a little more completely.",
  ],
  water: [
    "Winter is the season of deep stillness — the time when the kidney and bladder meridians, which store the body's vital essence, ask for restoration rather than expenditure. Yin practice in winter is an act of wisdom: choosing depth over surface, stillness over movement, conservation over expression.",
    "Water flows to the lowest place. It does not resist or push — it yields completely to every contour, and in yielding, finds its way. The water element governs the bones themselves, the deep architecture of the body. This practice reaches toward that depth, offering the connective tissue around the spine and hips an invitation into stillness.",
  ],
  none: [
    "Yin practice asks something unusual of us: to be still in the midst of sensation, to stay present without fixing or adjusting. Each long hold is an invitation beneath the muscular body into connective tissue — tendons, ligaments, fascia — where we store not just tension but the traces of our experience.",
    "Restorative practice is an act of radical trust — that the body, given full support and complete stillness, knows exactly what it needs. We are not stretching or strengthening here; we are giving permission. Each shape is an invitation for the nervous system to remember the safety of rest.",
    "In this practice, we follow the breath as a thread of continuity through each shape. Each inhale creates space; each exhale invites release. There is nothing to add here, and nothing to remove — only the quiet work of arriving more fully in what is already present.",
  ],
}

const QUOTES: Record<ElementKey, Array<{ text: string; attribution: string }>> = {
  wood: [
    { text: 'The tree that does not bend with the wind will break.', attribution: 'Tibetan proverb' },
    { text: 'Between bud and blossom, the tree neither grips nor strains.', attribution: 'Traditional' },
    { text: 'In the spring, at the end of the day, you should smell like dirt.', attribution: 'Margaret Atwood' },
  ],
  fire: [
    { text: 'The most precious gift we can offer anyone is our full attention.', attribution: 'Thich Nhat Hanh' },
    { text: 'Set your life on fire. Seek those who fan your flames.', attribution: 'Rumi' },
    { text: 'Joy is not in things; it is in us.', attribution: 'Richard Wagner' },
  ],
  earth: [
    { text: 'Adopt the pace of nature: her secret is patience.', attribution: 'Ralph Waldo Emerson' },
    { text: 'To be rooted is perhaps the most important and least recognized need of the human soul.', attribution: 'Simone Weil' },
    { text: 'In stillness, the world is restored.', attribution: 'Lao Tzu' },
  ],
  metal: [
    { text: 'Let go, or be dragged.', attribution: 'Zen proverb' },
    { text: 'For everything there is a season, and a time for every matter under heaven.', attribution: 'Ecclesiastes 3:1' },
    { text: 'Inhale, and God approaches you. Hold the inhalation, and God remains with you. Exhale, and you approach God.', attribution: 'Krishnamacharya' },
  ],
  water: [
    { text: 'Water is fluid, soft, and yielding. But water will wear away rock, which is rigid and cannot yield.', attribution: 'Lao Tzu' },
    { text: 'In the depth of winter, I finally learned that within me lay an invincible summer.', attribution: 'Albert Camus' },
    { text: 'The quieter you become, the more you are able to hear.', attribution: 'Baba Ram Dass' },
  ],
  none: [
    { text: 'Yoga is the journey of the self, through the self, to the self.', attribution: 'The Bhagavad Gita' },
    { text: 'Do you have the patience to wait until your mud settles and the water is clear?', attribution: 'Lao Tzu' },
    { text: 'The present moment is the only moment available to us, and it is the door to all moments.', attribution: 'Thich Nhat Hanh' },
    { text: 'The body is your temple. Keep it pure and clean for the soul to reside in.', attribution: 'B.K.S. Iyengar' },
    { text: 'Stillness is where creativity and solutions to problems are found.', attribution: 'Eckhart Tolle' },
  ],
}

const ELEMENT_THEMES: Record<FiveElement, string[]> = {
  wood:  ['growth and renewal', 'flexibility and vision', 'the rising energy of spring', 'bending without breaking'],
  fire:  ['the warmth of the heart', 'joy and genuine connection', 'summer radiance', 'opening to love'],
  earth: ['centering and nourishment', 'the harvest season', 'rooting into stillness', 'receiving fully'],
  metal: ['letting go', 'refinement and clarity', 'the gift of the exhale', 'autumn release'],
  water: ['stillness and depth', 'restoring the reserves', 'the wisdom of winter', 'yielding without resistance'],
}

function pickFrom<T>(arr: T[], idx: number): T {
  return arr[((idx % arr.length) + arr.length) % arr.length]
}

interface ContentContext {
  style?: Style
  season?: Season
  elementFocus?: FiveElement
  theme?: string
  durationMinutes?: number
}

export function pickContent(ctx: ContentContext): SequenceContent {
  const element: ElementKey = ctx.elementFocus ?? 'none'
  const style = ctx.style ?? 'yin'
  const season = ctx.season ?? 'winter'

  const SEASONS: Season[] = ['spring', 'summer', 'late-summer', 'autumn', 'winter']
  const STYLES: Style[] = ['yin', 'vinyasa', 'ashtanga', 'restorative']
  const seasonIdx = Math.max(0, SEASONS.indexOf(season))
  const styleIdx = Math.max(0, STYLES.indexOf(style))
  const idx = seasonIdx + styleIdx * SEASONS.length

  const philosophicalFraming = pickFrom(FRAMINGS[element], idx)
  const quote = pickFrom(QUOTES[element], idx + 1)

  let themeStatement: string
  if (ctx.theme) {
    const descriptors = ctx.elementFocus ? ELEMENT_THEMES[ctx.elementFocus] : []
    const descriptor = descriptors.length > 0 ? ` — ${pickFrom(descriptors, idx)}` : ''
    themeStatement = `${ctx.theme}${descriptor}.`
  } else if (ctx.elementFocus) {
    const themes = ELEMENT_THEMES[ctx.elementFocus]
    themeStatement = `A ${style} practice for ${season} — ${pickFrom(themes, idx)}.`
  } else {
    themeStatement = `A ${style} practice for ${season}.`
  }

  return { themeStatement, philosophicalFraming, quote }
}
