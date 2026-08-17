import { getAllPoses } from '@/lib/pose-library'
import { getBuiltInFlows } from '@/lib/flow-library'
import ComposeClient from '../ComposeClient'

export const dynamic = 'force-dynamic'

export default async function ComposeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ComposeClient poses={getAllPoses()} builtins={getBuiltInFlows()} flowId={id} />
}
