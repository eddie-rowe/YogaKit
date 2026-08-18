import type { FiveElement, Season, Style } from './types'

export interface SequenceContent {
  themeStatement: string
  philosophicalFraming: string
  quote: { text: string; attribution: string }
  sutra: { text: string; attribution: string }
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
    { text: 'Out of your vulnerabilities will come your strength.', attribution: 'Sigmund Freud' },
    { text: 'The only way to make sense out of change is to plunge into it, move with it, and join the dance.', attribution: 'Alan Watts' },
    { text: 'Growth demands a temporary surrender of security.', attribution: 'Gail Sheehy' },
    { text: 'What fire does not destroy, it hardens.', attribution: 'Rumi' },
  ],
  fire: [
    { text: 'The most precious gift we can offer anyone is our full attention.', attribution: 'Thich Nhat Hanh' },
    { text: 'Set your life on fire. Seek those who fan your flames.', attribution: 'Rumi' },
    { text: 'Joy is not in things; it is in us.', attribution: 'Richard Wagner' },
    { text: 'The heart is like a garden: it can grow compassion or fear, resentment or love.', attribution: 'Jack Kornfield' },
    { text: 'Out beyond ideas of wrongdoing and rightdoing, there is a field. I will meet you there.', attribution: 'Rumi' },
    { text: 'Love is the bridge between you and everything.', attribution: 'Rumi' },
    { text: 'When you do things from your soul, you feel a river moving in you, a joy.', attribution: 'Rumi' },
  ],
  earth: [
    { text: 'Adopt the pace of nature: her secret is patience.', attribution: 'Ralph Waldo Emerson' },
    { text: 'To be rooted is perhaps the most important and least recognized need of the human soul.', attribution: 'Simone Weil' },
    { text: 'In stillness, the world is restored.', attribution: 'Lao Tzu' },
    { text: 'The present moment always will have been.', attribution: 'Thich Nhat Hanh' },
    { text: 'Peace is every step.', attribution: 'Thich Nhat Hanh' },
    { text: 'Yoga is a light, which once lit will never dim. The better your practice, the brighter the flame.', attribution: 'B.K.S. Iyengar' },
    { text: 'The flower that blooms in adversity is the most rare and beautiful of all.', attribution: 'Buddha' },
  ],
  metal: [
    { text: 'Let go, or be dragged.', attribution: 'Zen proverb' },
    { text: 'For everything there is a season, and a time for every matter under heaven.', attribution: 'Ecclesiastes 3:1' },
    { text: 'Inhale, and God approaches you. Hold the inhalation, and God remains with you. Exhale, and you approach God.', attribution: 'Krishnamacharya' },
    { text: 'When we are no longer able to change a situation, we are challenged to change ourselves.', attribution: 'Viktor Frankl' },
    { text: 'Things falling apart is a kind of testing and also a kind of healing.', attribution: 'Pema Chödrön' },
    { text: 'You are the sky. Everything else is just the weather.', attribution: 'Pema Chödrön' },
    { text: 'Yoga teaches us to cure what need not be endured and endure what cannot be cured.', attribution: 'B.K.S. Iyengar' },
  ],
  water: [
    { text: 'Water is fluid, soft, and yielding. But water will wear away rock, which is rigid and cannot yield.', attribution: 'Lao Tzu' },
    { text: 'In the depth of winter, I finally learned that within me lay an invincible summer.', attribution: 'Albert Camus' },
    { text: 'The quieter you become, the more you are able to hear.', attribution: 'Baba Ram Dass' },
    { text: 'We are like islands in the sea, separate on the surface but connected in the deep.', attribution: 'William James' },
    { text: 'The mind that is still is like a clear mirror — it reflects everything without distortion.', attribution: 'Thich Nhat Hanh' },
    { text: 'Still water knows no fear.', attribution: 'Pema Chödrön' },
    { text: 'It is not impermanence that makes us suffer. What makes us suffer is wanting things to be permanent when they are not.', attribution: 'Thich Nhat Hanh' },
  ],
  none: [
    { text: 'Yoga is the journey of the self, through the self, to the self.', attribution: 'The Bhagavad Gita' },
    { text: 'Do you have the patience to wait until your mud settles and the water is clear?', attribution: 'Lao Tzu' },
    { text: 'The present moment is the only moment available to us, and it is the door to all moments.', attribution: 'Thich Nhat Hanh' },
    { text: 'The body is your temple. Keep it pure and clean for the soul to reside in.', attribution: 'B.K.S. Iyengar' },
    { text: 'Stillness is where creativity and solutions to problems are found.', attribution: 'Eckhart Tolle' },
    { text: 'Yoga is not about touching your toes, it is about what you learn on the way down.', attribution: 'Jigar Gor' },
    { text: 'The nature of yoga is to shine the light of awareness into the darkest corners of the body.', attribution: 'Jason Crandell' },
  ],
}

const SUTRAS: Array<{ text: string; attribution: string }> = [
  { text: 'Yoga is the stilling of the fluctuations of the mind.', attribution: 'Yoga Sutras of Patanjali, I.2' },
  { text: 'Then the seer abides in its own nature.', attribution: 'Yoga Sutras of Patanjali, I.3' },
  { text: 'Practice becomes firmly grounded when it is pursued for a long time, without interruption and with full devotion.', attribution: 'Yoga Sutras of Patanjali, I.14' },
  { text: 'Undisturbed calmness of mind is attained by cultivating friendliness toward the happy, compassion for the unhappy, delight in the virtuous, and indifference toward the wicked.', attribution: 'Yoga Sutras of Patanjali, I.33' },
  { text: 'The mind becomes clear and serene when the qualities of the heart are cultivated: friendliness, compassion, gladness, equanimity.', attribution: 'Yoga Sutras of Patanjali, I.33' },
  { text: 'Suffering is the consequence of ignoring the distinction between the permanent and the impermanent.', attribution: 'Yoga Sutras of Patanjali, II.15' },
  { text: 'Non-violence, truthfulness, non-stealing, continence, and non-possessiveness are the great vows.', attribution: 'Yoga Sutras of Patanjali, II.30' },
  { text: 'The posture of yoga is steady and comfortable.', attribution: 'Yoga Sutras of Patanjali, II.46' },
  { text: 'Mastery of the posture is achieved when effort becomes effortless and the infinite within is reached.', attribution: 'Yoga Sutras of Patanjali, II.47' },
  { text: 'When breath is still, the mind is still; when breath is active, the mind is active.', attribution: 'Yoga Sutras of Patanjali, II.49' },
]

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
  const sutra = pickFrom(SUTRAS, idx + 2)

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

  return { themeStatement, philosophicalFraming, quote, sutra }
}
