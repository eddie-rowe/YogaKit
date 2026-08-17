import type { Style, FiveElement, IntensityCurve, SequencingPosition } from '@/lib/pipeline/types'

export interface ReferenceSequencePose {
  slug: string
  hold_minutes: number
  side?: 'left' | 'right' | 'both'
  sequencing_position: SequencingPosition
  note?: string
}

export interface ReferenceSequence {
  id: string
  title: string
  style: Style
  tradition: string
  source_url?: string
  duration_minutes: number
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  element?: FiveElement
  intensity_curve: IntensityCurve
  accent_color: string
  description: string
  tags: string[]
  poses: ReferenceSequencePose[]
  available: boolean
}

export const REFERENCE_SEQUENCES: ReferenceSequence[] = [
  // ─── Yin ────────────────────────────────────────────────────────────────────

  {
    id: 'classic-yin-full-body',
    title: 'Classic Full Body Yin',
    style: 'yin',
    tradition: 'Paul Grilley / Bernie Clark tradition',
    source_url: 'https://www.yinyoga.com',
    duration_minutes: 60,
    difficulty: 'beginner',
    intensity_curve: 'bell',
    accent_color: '#7c3aed',
    description:
      'The foundational yin sequence taught across studios worldwide. Moves through the hips, pelvis, and spine in a balanced arc — deep enough to reach connective tissue, gentle enough for all levels.',
    tags: ['full-body', 'hips', 'spine', 'classic', 'beginner-friendly'],
    available: true,
    poses: [
      { slug: 'butterfly',        hold_minutes: 4, sequencing_position: 'opening',     note: 'Feet together, spine rounds naturally forward. A perfect opening survey of the hips and inner groin.' },
      { slug: 'wide-knee-child',  hold_minutes: 3, sequencing_position: 'opening',     note: 'Brief reset between halves. Knees wide to decompress the sacrum.' },
      { slug: 'dragon-low-lunge', hold_minutes: 4, side: 'both', sequencing_position: 'building', note: 'Front knee tracks over ankle. Hip flexor and hip joint compression, one side at a time.' },
      { slug: 'half-saddle',      hold_minutes: 4, side: 'both', sequencing_position: 'building', note: 'One leg bent back in Saddle position, other extended. Targets the quad and psoas of the bent-leg side.' },
      { slug: 'saddle',           hold_minutes: 4, sequencing_position: 'peak',        note: 'Both knees bent back. The peak compression of the lumbar and sacral area. Offer bolster support.' },
      { slug: 'sphinx',           hold_minutes: 4, sequencing_position: 'peak',        note: 'Forearms grounded. Gentle extension of the lumbar after the Saddle compression.' },
      { slug: 'reclining-twist',  hold_minutes: 3, side: 'both', sequencing_position: 'cooldown',  note: 'Supine twist neutralises the spine after prone backbends.' },
      { slug: 'constructive-rest',hold_minutes: 3, sequencing_position: 'cooldown',    note: 'Knees bent, feet flat. Psoas fully released. A transition toward stillness.' },
      { slug: 'savasana',         hold_minutes: 7, sequencing_position: 'integration', note: 'Allow 5–10 minutes minimum. The practice integrates here.' },
    ],
  },

  {
    id: 'yin-hip-opening',
    title: 'Yin Hip Opening',
    style: 'yin',
    tradition: 'Sarah Powers / Insight Yoga tradition',
    source_url: 'https://insightyoga.com',
    duration_minutes: 75,
    difficulty: 'intermediate',
    intensity_curve: 'bell',
    accent_color: '#ea580c',
    description:
      'A deep dive into the hip complex — psoas, iliotibial band, external rotators, and hip socket. Longer holds allow the fascia and joint capsule to yield at a cellular level.',
    tags: ['hips', 'deep', 'intermediate', 'hip-flexors', 'outer-hip'],
    available: true,
    poses: [
      { slug: 'butterfly',       hold_minutes: 4, sequencing_position: 'opening',     note: 'Survey the inner groin and adductors before going deeper.' },
      { slug: 'dragon-low-lunge',hold_minutes: 5, side: 'both', sequencing_position: 'building', note: 'Front hip crease softens over 5 minutes. Keep back knee cushioned.' },
      { slug: 'sleeping-swan',   hold_minutes: 5, side: 'both', sequencing_position: 'peak',     note: 'External rotation of the front hip. Support the front hip with a folded blanket if needed.' },
      { slug: 'frog',            hold_minutes: 5, sequencing_position: 'peak',        note: 'Adductors and groin under sustained load. Offer blocks under knees for accessibility.' },
      { slug: 'shoelace',        hold_minutes: 4, side: 'both', sequencing_position: 'cooldown',  note: 'Deep outer hip stack. Follow with a windshield-wiper rebound.' },
      { slug: 'reclining-twist', hold_minutes: 4, side: 'both', sequencing_position: 'cooldown',  note: 'Spine neutralisation and sacral release.' },
      { slug: 'savasana',        hold_minutes: 7, sequencing_position: 'integration' },
    ],
  },

  {
    id: 'yin-spinal-health',
    title: 'Yin Spinal Health',
    style: 'yin',
    tradition: 'Bernie Clark / yinyoga.com',
    source_url: 'https://www.yinyoga.com/sequences',
    duration_minutes: 45,
    difficulty: 'beginner',
    intensity_curve: 'gradual-ramp',
    accent_color: '#2563eb',
    description:
      'Targets the vertebral ligaments, intervertebral discs, and thoracic fascia. Especially well-suited to students with desk-bound lifestyles or thoracic stiffness.',
    tags: ['spine', 'thoracic', 'backbend', 'decompression', 'beginner-friendly'],
    available: true,
    poses: [
      { slug: 'child-pose',      hold_minutes: 4, sequencing_position: 'opening',     note: 'Lumbar decompression and gentle forward fold to warm the spine.' },
      { slug: 'anahatasana',     hold_minutes: 4, sequencing_position: 'opening',     note: 'Hips over knees. The thoracic spine extends as gravity draws the heart toward the floor.' },
      { slug: 'sphinx',          hold_minutes: 4, sequencing_position: 'building',    note: 'Moderate lumbar extension. Elbows directly below shoulders.' },
      { slug: 'seal',            hold_minutes: 4, sequencing_position: 'peak',        note: 'Hands replace forearms for deeper lumbar compression. Skip if low-back sensitive.' },
      { slug: 'supported-fish',  hold_minutes: 4, sequencing_position: 'cooldown',    note: 'Bolster under the thoracic spine. Counter-curves the cervical spine gently.' },
      { slug: 'constructive-rest',hold_minutes: 3, sequencing_position: 'cooldown',   note: 'Spinal neutral. Observe the lumbar response after the backbend sequence.' },
      { slug: 'savasana',        hold_minutes: 5, sequencing_position: 'integration' },
    ],
  },

  {
    id: 'yin-heart-opening',
    title: 'Yin Heart Opening',
    style: 'yin',
    tradition: 'Sarah Powers / Five Elements tradition',
    duration_minutes: 50,
    difficulty: 'beginner',
    element: 'fire',
    intensity_curve: 'plateau',
    accent_color: '#dc2626',
    description:
      'Centres on the heart and lung meridians, which run through the anterior chest and inner arms. Sustains a moderate intensity throughout to allow consistent opening of the thoracic cage.',
    tags: ['heart', 'chest', 'meridians', 'fire-element', 'emotional', 'thoracic'],
    available: true,
    poses: [
      { slug: 'anahatasana',    hold_minutes: 4, sequencing_position: 'opening',     note: 'Heart melts toward the earth. Hips stack high over knees.' },
      { slug: 'melting-heart',  hold_minutes: 4, sequencing_position: 'building',    note: 'Like Anahatasana but hips slide back. Deeper chest contact with the floor.' },
      { slug: 'supported-fish', hold_minutes: 5, sequencing_position: 'peak',        note: 'Bolster supports the thoracic spine in gentle extension. Arms wide or over head.' },
      { slug: 'bridge-yin',     hold_minutes: 4, sequencing_position: 'peak',        note: 'Passive version — no gluteal engagement. Let the lumbar sag toward the floor.' },
      { slug: 'thread-needle',  hold_minutes: 4, side: 'both', sequencing_position: 'cooldown', note: 'Supine shoulder stretch. One arm threads under the torso.' },
      { slug: 'savasana',       hold_minutes: 5, sequencing_position: 'integration' },
    ],
  },

  {
    id: 'yin-grounding-root',
    title: 'Yin Grounding & Root',
    style: 'yin',
    tradition: 'TCM Five Elements / Water element approach',
    duration_minutes: 60,
    difficulty: 'beginner',
    element: 'water',
    intensity_curve: 'bell',
    accent_color: '#60a5fa',
    description:
      'A kidney-bladder meridian sequence that draws attention downward into the earth. Emphasises the root and sacral chakras, the soles of the feet, and the posterior chain.',
    tags: ['grounding', 'water-element', 'kidney', 'root-chakra', 'calming'],
    available: true,
    poses: [
      { slug: 'toe-squat',         hold_minutes: 2, sequencing_position: 'opening',     note: 'Activates the kidney meridian starting at the sole of the foot. Surprisingly intense.' },
      { slug: 'frog',              hold_minutes: 4, sequencing_position: 'building',    note: 'Groin and adductors open while the sacrum remains heavy.' },
      { slug: 'sleeping-swan',     hold_minutes: 5, side: 'both', sequencing_position: 'peak', note: 'External rotation roots the sitting bones.' },
      { slug: 'square',            hold_minutes: 4, side: 'both', sequencing_position: 'cooldown', note: 'Outer hip and piriformis in a neutral spine.' },
      { slug: 'caterpillar',       hold_minutes: 4, sequencing_position: 'cooldown',    note: 'Full forward fold. Spine rounds freely. All effort drops away.' },
      { slug: 'constructive-rest', hold_minutes: 3, sequencing_position: 'cooldown' },
      { slug: 'savasana',          hold_minutes: 7, sequencing_position: 'integration' },
    ],
  },

  {
    id: 'yin-for-sleep',
    title: 'Yin for Sleep',
    style: 'yin',
    tradition: 'Restorative Yin / Parasympathetic recovery',
    duration_minutes: 45,
    difficulty: 'beginner',
    element: 'water',
    intensity_curve: 'gradual-ramp',
    accent_color: '#7c3aed',
    description:
      'Designed for late-evening practice. Longer holds and gravity-assisted shapes send the nervous system into deep parasympathetic tone. No effort, no struggle — only release.',
    tags: ['sleep', 'evening', 'water-element', 'parasympathetic', 'restorative', 'beginner-friendly'],
    available: true,
    poses: [
      { slug: 'child-pose',           hold_minutes: 5, sequencing_position: 'opening',     note: 'Use a bolster between thighs and chest. Allow the forehead to rest.' },
      { slug: 'supta-baddha-konasana',hold_minutes: 6, sequencing_position: 'building',    note: 'Soles of feet together, knees fall wide. Bolster under knees for support.' },
      { slug: 'legs-up-the-wall',     hold_minutes: 8, sequencing_position: 'peak',        note: 'Reverses venous return. Eye pillow encouraged. Hold 8–12 minutes.' },
      { slug: 'constructive-rest',    hold_minutes: 5, sequencing_position: 'cooldown',    note: 'Knees bent, feet hip-width. Full permission to be still.' },
      { slug: 'savasana',             hold_minutes: 10, sequencing_position: 'integration', note: 'Do not rush. Allow 10 minutes minimum. Students may sleep — that is success.' },
    ],
  },

  // ─── Restorative ────────────────────────────────────────────────────────────

  {
    id: 'restorative-reset',
    title: 'Restorative Reset',
    style: 'restorative',
    tradition: 'Judith Hanson Lasater tradition',
    source_url: 'https://restorativeyogateacher.com',
    duration_minutes: 60,
    difficulty: 'beginner',
    intensity_curve: 'plateau',
    accent_color: '#16a34a',
    description:
      'Fully supported shapes held for 8–12 minutes each. Props replace muscle effort so the nervous system can genuinely downregulate. Ideal for burnout, illness recovery, or high-stress periods.',
    tags: ['restorative', 'props', 'parasympathetic', 'burnout', 'recovery', 'beginner-friendly'],
    available: true,
    poses: [
      { slug: 'supta-baddha-konasana', hold_minutes: 10, sequencing_position: 'opening',     note: 'Full bolster support under spine and knees. Eye pillow, blanket over body.' },
      { slug: 'constructive-rest',     hold_minutes: 8,  sequencing_position: 'building',    note: 'Knees bent, feet flat on bolster. Fully supported contact with the earth.' },
      { slug: 'wide-knee-child',       hold_minutes: 8,  sequencing_position: 'peak',        note: 'Bolster supports the torso from knees to chest. Head rests on stacked blocks.' },
      { slug: 'legs-up-the-wall',      hold_minutes: 10, sequencing_position: 'cooldown',    note: 'Blanket under hips, folded or bolster. 10–15 minutes is ideal.' },
      { slug: 'savasana',              hold_minutes: 10, sequencing_position: 'integration',  note: 'Fully blanketed. At least 10 minutes. Non-negotiable.' },
    ],
  },

  {
    id: 'restorative-for-stress',
    title: 'Restorative for Stress',
    style: 'restorative',
    tradition: 'Modern Clinical Yoga / Parasympathetic focus',
    duration_minutes: 45,
    difficulty: 'beginner',
    element: 'water',
    intensity_curve: 'gradual-ramp',
    accent_color: '#2563eb',
    description:
      'A minimal, high-impact sequence for acute stress or anxiety. Four shapes, maximum prop support, no transitions that require effort. Based on clinical yoga therapy research for HRV improvement.',
    tags: ['stress', 'anxiety', 'water-element', 'clinical', 'minimal', 'beginner-friendly'],
    available: true,
    poses: [
      { slug: 'wide-knee-child',       hold_minutes: 8,  sequencing_position: 'opening',  note: 'Forehead on mat or block. Bolster between thighs and chest. 5–10 slow breaths to settle.' },
      { slug: 'supta-baddha-konasana', hold_minutes: 12, sequencing_position: 'building', note: 'Full bolster under spine. Sandbag on thighs optional. Target: 6 breaths/minute.' },
      { slug: 'legs-up-the-wall',      hold_minutes: 12, sequencing_position: 'peak',     note: 'Supported inversion. Hips elevated 4–6 inches. Hold up to 15 minutes if available.' },
      { slug: 'savasana',              hold_minutes: 10, sequencing_position: 'integration', note: 'Blanket, eye pillow, room darkened. Minimum 10 minutes.' },
    ],
  },

  // ─── Vinyasa (stub) ─────────────────────────────────────────────────────────

  {
    id: 'vinyasa-sun-salutation-flow',
    title: 'Sun Salutation Flow',
    style: 'vinyasa',
    tradition: 'Krishnamacharya / Pattabhi Jois lineage',
    duration_minutes: 60,
    difficulty: 'intermediate',
    intensity_curve: 'bell',
    accent_color: '#f59e0b',
    description:
      'A classic Surya Namaskar-based vinyasa sequence building from A and B series into standing poses, a seated interlude, and final rest.',
    tags: ['vinyasa', 'flow', 'sun-salutation', 'standing', 'dynamic'],
    available: false,
    poses: [],
  },

  // ─── Ashtanga (stub) ────────────────────────────────────────────────────────

  {
    id: 'ashtanga-primary-series',
    title: 'Ashtanga Primary Series',
    style: 'ashtanga',
    tradition: 'K. Pattabhi Jois / KPJAYI Mysore tradition',
    source_url: 'https://kpjayi.org',
    duration_minutes: 90,
    difficulty: 'advanced',
    intensity_curve: 'front-loaded',
    accent_color: '#dc2626',
    description:
      'Yoga Chikitsa — the first series of Ashtanga. A fixed, sequential series of 41 poses linking breath to movement (vinyasa). Always practised in the same order.',
    tags: ['ashtanga', 'primary-series', 'mysore', 'traditional', 'advanced', 'fixed-sequence'],
    available: false,
    poses: [],
  },
]

export function getReferenceSequenceById(id: string): ReferenceSequence | undefined {
  return REFERENCE_SEQUENCES.find(s => s.id === id)
}

export function getReferenceSequencesByStyle(style: Style): ReferenceSequence[] {
  return REFERENCE_SEQUENCES.filter(s => s.style === style)
}
