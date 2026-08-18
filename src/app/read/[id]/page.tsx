import { getAllPoses } from '@/lib/pose-library'
import { getBuiltInFlowById } from '@/lib/flow-library'
import ReadView from './ReadView'
import ReadViewClient from './ReadViewClient'
import './read-print.css'

export const dynamic = 'force-dynamic'

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const poses = getAllPoses()
  const builtin = getBuiltInFlowById(id)
  if (builtin) return <ReadView flow={builtin} poses={poses} />
  return <ReadViewClient id={id} poses={poses} />
}
