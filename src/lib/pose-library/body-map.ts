import type { MuscleGroup, JointName, FiveElement, ChakraName } from '@/lib/pose-types'

export type SvgView = 'front' | 'back' | 'both'

export interface SvgRegion {
  id: string
  view: SvgView
  isDeep?: boolean
}

export interface JointDot {
  cx: number
  cy: number
  view: SvgView
  bilateral: boolean
}

export interface MeridianPath {
  view: SvgView
  element: FiveElement
  d: string
}

export interface ChakraDot {
  name: ChakraName
  label: string    // Sanskrit
  english: string  // English
  cx: number
  cy: number
  color: string
}

// SVG viewBox: 0 0 200 500

export const MUSCLE_REGION_MAP: Record<MuscleGroup, SvgRegion[]> = {
  quadriceps:            [{ id: 'region-quadriceps-l', view: 'front' }, { id: 'region-quadriceps-r', view: 'front' }],
  hamstrings:            [{ id: 'region-hamstrings-l', view: 'back' }, { id: 'region-hamstrings-r', view: 'back' }],
  glutes:                [{ id: 'region-glutes', view: 'back' }],
  psoas:                 [{ id: 'region-psoas', view: 'front', isDeep: true }],
  iliacus:               [{ id: 'region-iliacus-l', view: 'front' }, { id: 'region-iliacus-r', view: 'front' }],
  'hip-flexors':         [{ id: 'region-psoas', view: 'front', isDeep: true }, { id: 'region-iliacus-l', view: 'front' }, { id: 'region-iliacus-r', view: 'front' }],
  'hip-adductors':       [{ id: 'region-adductors-l', view: 'front' }, { id: 'region-adductors-r', view: 'front' }],
  'hip-abductors':       [{ id: 'region-abductors-l', view: 'front' }, { id: 'region-abductors-r', view: 'front' }],
  piriformis:            [{ id: 'region-piriformis-l', view: 'back', isDeep: true }, { id: 'region-piriformis-r', view: 'back', isDeep: true }],
  'IT-band':             [{ id: 'region-it-band-l', view: 'front' }, { id: 'region-it-band-r', view: 'front' }],
  'lumbar-spine':        [{ id: 'region-lumbar', view: 'back' }],
  'thoracic-spine':      [{ id: 'region-thoracic', view: 'back' }],
  'cervical-spine':      [{ id: 'region-cervical', view: 'back' }],
  'spinal-erectors':     [{ id: 'region-erectors-l', view: 'back' }, { id: 'region-erectors-r', view: 'back' }],
  'chest-pectorals':     [{ id: 'region-pecs-l', view: 'front' }, { id: 'region-pecs-r', view: 'front' }],
  'anterior-shoulder':   [{ id: 'region-ant-delt-l', view: 'front' }, { id: 'region-ant-delt-r', view: 'front' }],
  'posterior-shoulder':  [{ id: 'region-post-delt-l', view: 'back' }, { id: 'region-post-delt-r', view: 'back' }],
  lats:                  [{ id: 'region-lats-l', view: 'back' }, { id: 'region-lats-r', view: 'back' }],
  rhomboids:             [{ id: 'region-rhomboids', view: 'back' }],
  trapezius:             [{ id: 'region-trapezius', view: 'back' }],
  intercostals:          [{ id: 'region-intercostals-l', view: 'front' }, { id: 'region-intercostals-r', view: 'front' }],
  diaphragm:             [{ id: 'region-diaphragm', view: 'front', isDeep: true }],
  calves:                [{ id: 'region-calves-l', view: 'back' }, { id: 'region-calves-r', view: 'back' }],
  'tibialis-anterior':   [{ id: 'region-tibialis-l', view: 'front' }, { id: 'region-tibialis-r', view: 'front' }],
  'plantar-fascia':      [{ id: 'region-plantar-l', view: 'back' }, { id: 'region-plantar-r', view: 'back' }],
  achilles:              [{ id: 'region-achilles-l', view: 'back' }, { id: 'region-achilles-r', view: 'back' }],
  'ankle-ligaments':     [{ id: 'region-ankle-l', view: 'front' }, { id: 'region-ankle-r', view: 'front' }],
  'wrist-extensors':     [{ id: 'region-forearm-l', view: 'front' }, { id: 'region-forearm-r', view: 'front' }],
  obliques:              [{ id: 'region-obliques-l', view: 'front' }, { id: 'region-obliques-r', view: 'front' }],
  'sacroiliac-ligaments':[{ id: 'region-sacrum', view: 'back' }],
}

export const JOINT_DOT_MAP: Record<JointName, JointDot> = {
  neck:       { cx: 100, cy: 77, view: 'front', bilateral: false },
  cervical:   { cx: 100, cy: 77, view: 'back',  bilateral: false },
  thoracic:   { cx: 100, cy: 135, view: 'back', bilateral: false },
  lumbar:     { cx: 100, cy: 188, view: 'both', bilateral: false },
  sacroiliac: { cx: 90,  cy: 208, view: 'both', bilateral: true },
  hip:        { cx: 80,  cy: 224, view: 'both', bilateral: true },
  knee:       { cx: 80,  cy: 341, view: 'both', bilateral: true },
  ankle:      { cx: 78,  cy: 443, view: 'both', bilateral: true },
  toes:       { cx: 77,  cy: 468, view: 'front', bilateral: true },
  feet:       { cx: 80,  cy: 462, view: 'front', bilateral: true },
  shoulder:   { cx: 44,  cy: 92,  view: 'both', bilateral: true },
  elbow:      { cx: 26,  cy: 192, view: 'front', bilateral: true },
  wrist:      { cx: 18,  cy: 266, view: 'front', bilateral: true },
}

export const MERIDIAN_PATH_MAP: Record<string, MeridianPath[]> = {
  kidney: [{
    view: 'front', element: 'water',
    d: 'M 80,460 L 79,445 L 78,400 L 80,355 L 82,308 L 84,265 L 86,230 L 88,210 L 90,190 L 92,165 L 94,138 L 95,118',
  }],
  bladder: [{
    view: 'back', element: 'water',
    d: 'M 97,10 L 94,32 L 92,58 L 91,88 L 91,125 L 90,162 L 90,195 L 89,228 L 87,272 L 85,325 L 83,368 L 81,410 L 80,440 L 79,458',
  }],
  liver: [{
    view: 'front', element: 'wood',
    d: 'M 78,455 L 76,440 L 75,390 L 77,340 L 79,288 L 81,242 L 83,215 L 85,195 L 88,172',
  }],
  gallbladder: [{
    view: 'front', element: 'wood',
    d: 'M 78,32 L 74,52 L 68,78 L 60,98 L 56,130 L 55,162 L 57,195 L 59,228 L 61,272 L 62,325 L 62,368 L 62,408 L 62,438 L 62,458',
  }],
  stomach: [{
    view: 'front', element: 'earth',
    d: 'M 107,28 L 106,52 L 107,70 L 108,88 L 112,108 L 110,140 L 108,168 L 106,198 L 104,228 L 103,278 L 103,325 L 104,368 L 106,415 L 107,458',
  }],
  spleen: [{
    view: 'front', element: 'earth',
    d: 'M 90,468 L 88,452 L 86,435 L 84,400 L 82,360 L 80,315 L 80,270 L 82,232 L 86,210 L 90,192 L 94,172 L 96,155',
  }],
  heart: [{
    view: 'front', element: 'fire',
    d: 'M 52,110 L 44,124 L 36,145 L 28,168 L 22,190 L 18,212 L 17,238 L 17,256 L 17,265',
  }],
  'small-intestine': [{
    view: 'back', element: 'fire',
    d: 'M 17,265 L 18,250 L 21,228 L 25,202 L 30,175 L 36,152 L 42,132 L 48,114 L 56,98 L 68,88 L 82,84',
  }],
  pericardium: [{
    view: 'front', element: 'fire',
    d: 'M 63,115 L 50,122 L 40,140 L 32,162 L 26,188 L 22,215 L 20,242 L 20,260 L 20,270',
  }],
  'triple-warmer': [{
    view: 'back', element: 'fire',
    d: 'M 20,270 L 22,252 L 25,228 L 29,205 L 35,178 L 42,155 L 48,135 L 56,116 L 64,100 L 74,88 L 86,80 L 96,72',
  }],
  lung: [{
    view: 'front', element: 'metal',
    d: 'M 70,118 L 56,108 L 46,96 L 40,96 L 32,110 L 26,132 L 22,158 L 20,185 L 18,210 L 17,238 L 18,260 L 19,268',
  }],
  'large-intestine': [{
    view: 'front', element: 'metal',
    d: 'M 22,262 L 24,245 L 27,222 L 32,198 L 38,172 L 44,148 L 50,128 L 58,108 L 66,90 L 78,78 L 88,66 L 94,55',
  }],
}

export const CHAKRA_DOTS: ChakraDot[] = [
  { name: 'root',         label: 'Mūlādhāra',    english: 'Root',         cx: 100, cy: 222, color: '#dc2626' },
  { name: 'sacral',       label: 'Svādhiṣṭhāna', english: 'Sacral',       cx: 100, cy: 200, color: '#ea580c' },
  { name: 'solar-plexus', label: 'Maṇipūra',     english: 'Solar Plexus', cx: 100, cy: 175, color: '#ca8a04' },
  { name: 'heart',        label: 'Anāhata',       english: 'Heart',        cx: 100, cy: 148, color: '#16a34a' },
  { name: 'throat',       label: 'Viśuddha',      english: 'Throat',       cx: 100, cy: 100, color: '#2563eb' },
  { name: 'third-eye',    label: 'Ājñā',          english: 'Third Eye',    cx: 100, cy: 68,  color: '#7c3aed' },
  { name: 'crown',        label: 'Sahasrāra',     english: 'Crown',        cx: 100, cy: 20,  color: '#9333ea' },
]

export const ELEMENT_COLORS: Record<FiveElement, string> = {
  wood:  '#4ade80',
  fire:  '#f87171',
  earth: '#facc15',
  metal: '#94a3b8',
  water: '#60a5fa',
}

export function getActiveRegions(muscleGroups: MuscleGroup[], view: SvgView): Set<string> {
  const active = new Set<string>()
  for (const muscle of muscleGroups) {
    const regions = MUSCLE_REGION_MAP[muscle] ?? []
    for (const region of regions) {
      if (region.view === view || region.view === 'both' || view === region.view) {
        active.add(region.id)
      }
    }
  }
  return active
}

export function getDeepRegions(muscleGroups: MuscleGroup[], view: SvgView): Set<string> {
  const deep = new Set<string>()
  for (const muscle of muscleGroups) {
    const regions = MUSCLE_REGION_MAP[muscle] ?? []
    for (const region of regions) {
      if (region.isDeep && (region.view === view || region.view === 'both')) {
        deep.add(region.id)
      }
    }
  }
  return deep
}

/** Which muscle groups reach a given SVG region — the inverse of MUSCLE_REGION_MAP.
 *
 *  Derived at module load rather than written out, because the two cannot then disagree.
 *  The relation is genuinely many-to-many in both directions: `region-psoas` is reached
 *  from both `psoas` and `hip-flexors`, and `hip-flexors` reaches three regions. FR-014's
 *  "without appearing to select the wrong thing" is about exactly that overlap, so the
 *  inverse has to be a list, not a lookup. */
export const REGION_TO_MUSCLES: Map<string, MuscleGroup[]> = (() => {
  const inverse = new Map<string, MuscleGroup[]>()
  for (const [muscle, regions] of Object.entries(MUSCLE_REGION_MAP) as [MuscleGroup, SvgRegion[]][]) {
    for (const region of regions) {
      const existing = inverse.get(region.id)
      if (existing) existing.push(muscle)
      else inverse.set(region.id, [muscle])
    }
  }
  return inverse
})()

export interface ActiveJoint {
  /** The SVG element id, and the region key the legend links against. A mirrored dot
   *  carries the same key: both dots are the same joint, so tapping either highlights the
   *  one chip, and tapping the chip lights both dots. */
  id: string
  key: string
  joint: JointName
  cx: number
  cy: number
}

/** The joint dots to draw, carrying the joint name.
 *
 *  This used to return bare `{cx, cy}` and discard the name, which made joint-legend
 *  linking impossible: a dot at (80, 341) is not something a legend chip can find. */
export function getActiveJointIds(joints: JointName[], view: SvgView, bilateral: boolean): ActiveJoint[] {
  const dots: ActiveJoint[] = []
  for (const joint of joints) {
    const dot = JOINT_DOT_MAP[joint]
    if (!dot) continue
    if (dot.view !== view && dot.view !== 'both') continue
    dots.push({ id: `joint-${joint}`, key: `joint-${joint}`, joint, cx: dot.cx, cy: dot.cy })
    if (dot.bilateral && bilateral) {
      dots.push({ id: `joint-${joint}-mirror`, key: `joint-${joint}`, joint, cx: 200 - dot.cx, cy: dot.cy })
    }
  }
  return dots
}

export type LegendCategory = 'muscles' | 'meridians' | 'joints' | 'chakras'

export interface LegendEntry {
  /** Stable identity for the chip — the muscle group, meridian slug, joint name, or
   *  chakra name. Doubles as the testid suffix. */
  key: string
  label: string
  category: LegendCategory
  /** The SVG element ids this entry highlights. */
  regionIds: string[]
  /** Which view those ids live in, so a legend tap has something to switch *to*.
   *  'both' means the entry is visible either way and no switch is needed. */
  primaryView: SvgView
}

function collapseViews(views: SvgView[]): SvgView {
  if (views.length === 0) return 'both'
  if (views.every(v => v === 'front')) return 'front'
  if (views.every(v => v === 'back')) return 'back'
  return 'both'
}

/** The legend for one category, with each entry told where its regions live.
 *
 *  The view is what makes this necessary rather than cosmetic. Regions are front- or
 *  back-scoped, so tapping the `hamstrings` chip while the front view is showing would
 *  highlight nothing at all — MUSCLE_REGION_MAP.hamstrings is back-only. A legend tap has
 *  to be able to set the view and the highlight in one update, and for that it needs to
 *  know the view before the tap happens. */
export function getLegendEntries(
  category: LegendCategory,
  values: string[],
  chakraDots: ChakraDot[] = CHAKRA_DOTS
): LegendEntry[] {
  if (category === 'muscles') {
    return values.map(value => {
      const regions = MUSCLE_REGION_MAP[value as MuscleGroup] ?? []
      return {
        key: value,
        label: value,
        category,
        regionIds: regions.map(region => region.id),
        primaryView: collapseViews(regions.map(region => region.view)),
      }
    })
  }

  if (category === 'meridians') {
    return values.map(value => {
      const paths = MERIDIAN_PATH_MAP[value] ?? []
      return {
        key: value,
        label: value.replace(/-/g, ' '),
        category,
        regionIds: [`meridian-${value}`],
        primaryView: collapseViews(paths.map(path => path.view)),
      }
    })
  }

  if (category === 'joints') {
    return values.map(value => {
      const dot = JOINT_DOT_MAP[value as JointName]
      return {
        key: `joint-${value}`,
        label: value,
        category,
        regionIds: [`joint-${value}`, `joint-${value}-mirror`],
        primaryView: dot ? dot.view : 'both',
      }
    })
  }

  return values.map(value => {
    const dot = chakraDots.find(candidate => candidate.name === value)
    return {
      key: `chakra-${value}`,
      label: dot ? dot.english : value,
      category,
      // Chakras sit on the midline and are drawn in both views.
      regionIds: [`chakra-${value}`],
      primaryView: 'both' as SvgView,
    }
  })
}

export interface Selection {
  source: 'region' | 'legend'
  key: string
}

/** What a selection lights up, on both sides at once.
 *
 *  Asymmetric on purpose. A **legend** tap highlights that chip and the regions it maps to
 *  — the reader asked about one muscle. A **region** tap highlights that region and *every*
 *  chip that reaches it, because the question "what is this shape?" has more than one true
 *  answer where the map overlaps: tapping `region-psoas` is answered by both `psoas` and
 *  `hip-flexors`, and showing only one of them would be showing the wrong thing. */
export function resolveSelection(
  selection: Selection | null,
  entries: LegendEntry[]
): { regionIds: Set<string>; keys: Set<string> } {
  if (!selection) return { regionIds: new Set(), keys: new Set() }

  if (selection.source === 'legend') {
    const entry = entries.find(candidate => candidate.key === selection.key)
    return entry
      ? { regionIds: new Set(entry.regionIds), keys: new Set([entry.key]) }
      : { regionIds: new Set(), keys: new Set() }
  }

  const keys = entries
    .filter(entry => entry.regionIds.includes(selection.key))
    .map(entry => entry.key)

  return { regionIds: new Set([selection.key]), keys: new Set(keys) }
}
