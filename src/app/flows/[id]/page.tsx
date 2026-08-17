import { getAllPoses } from '@/lib/pose-library'
import { getBuiltInFlows } from '@/lib/flow-library'
import FlowDetailClient from './FlowDetailClient'

export const dynamic = 'force-dynamic'

export default async function FlowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <FlowDetailClient id={id} poses={getAllPoses()} builtins={getBuiltInFlows()} />
}
