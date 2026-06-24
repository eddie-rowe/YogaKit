import { getAllPoses } from '@/lib/pose-library'
import type { Pose } from '@/lib/pipeline/types'
import PosesClient from './PosesClient'

export const dynamic = 'force-dynamic'

export default function PosesPage() {
  const poses = getAllPoses().sort((a, b) => a.english.localeCompare(b.english))
  return <PosesClient poses={poses} />
}
