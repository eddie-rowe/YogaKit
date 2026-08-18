import { getAllPoses } from '@/lib/pose-library'
import { resolveDisplayName } from '@/lib/pose-library/display-name'
import PosesClient from './PosesClient'

export const dynamic = 'force-dynamic'

export default function PosesPage() {
  const poses = getAllPoses().sort((a, b) => resolveDisplayName(a).localeCompare(resolveDisplayName(b)))
  return <PosesClient poses={poses} />
}
