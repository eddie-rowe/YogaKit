export interface ContraindicationOption {
  slug: string
  label: string
}

export const CONTRAINDICATION_OPTIONS: ContraindicationOption[] = [
  { slug: 'high-blood-pressure', label: 'High blood pressure' },
  { slug: 'low-blood-pressure', label: 'Low blood pressure' },
  { slug: 'glaucoma', label: 'Glaucoma' },
  { slug: 'pregnancy', label: 'Pregnancy' },
  { slug: 'no-inversions', label: 'No inversions' },
  { slug: 'neck-injury', label: 'Neck injury' },
  { slug: 'shoulder-injury', label: 'Shoulder injury' },
  { slug: 'wrist-injury', label: 'Wrist injury' },
  { slug: 'elbow-injury', label: 'Elbow injury' },
  { slug: 'low-back-injury', label: 'Low back injury' },
  { slug: 'mid-back-injury', label: 'Mid-back injury' },
  { slug: 'hip-replacement', label: 'Hip replacement' },
  { slug: 'hip-injury', label: 'Hip injury' },
  { slug: 'knee-injury', label: 'Knee injury' },
  { slug: 'ankle-injury', label: 'Ankle injury' },
  { slug: 'sacroiliac-joint', label: 'SI joint issues' },
  { slug: 'osteoporosis', label: 'Osteoporosis' },
  { slug: 'herniated-disc', label: 'Herniated disc' },
  { slug: 'scoliosis', label: 'Scoliosis' },
  { slug: 'meniscus-injury', label: 'Meniscus injury' },
  { slug: 'rotator-cuff', label: 'Rotator cuff injury' },
  { slug: 'carpal-tunnel', label: 'Carpal tunnel' },
  { slug: 'sciatica', label: 'Sciatica' },
  { slug: 'fibromyalgia', label: 'Fibromyalgia' },
  { slug: 'arthritis', label: 'Arthritis' },
  { slug: 'multiple-sclerosis', label: 'Multiple sclerosis' },
  { slug: 'vertigo', label: 'Vertigo / dizziness' },
  { slug: 'lymphedema', label: 'Lymphedema' },
  { slug: 'deep-vein-thrombosis', label: 'Deep vein thrombosis (DVT)' },
]

export const ALL_PROPS = [
  'mat',
  'blanket',
  'block',
  'strap',
  'bolster',
  'eye-pillow',
  'chair',
  'wall',
]
