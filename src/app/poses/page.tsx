import { getAllPoses } from '@/lib/pose-library'
import { resolveDisplayName } from '@/lib/pose-library/display-name'
import PosesClient from './PosesClient'

// No `force-dynamic`. It was here without a stated reason and there is no request-scoped
// input on this page: getAllPoses() reads the same 67 JSON files every time, so the
// directive bought a per-request disk read of the whole library and cost the catalog its
// prerender. The offline read path never depended on it either — public/sw.js precaches
// /poses cache-first, so FR-036 held regardless (research.md §6).

export default function PosesPage() {
  const poses = getAllPoses().sort((a, b) => resolveDisplayName(a).localeCompare(resolveDisplayName(b)))
  return <PosesClient poses={poses} />
}
