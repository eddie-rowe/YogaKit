import { getAllPoses } from '@/lib/pose-library'
import { getBuiltInFlows } from '@/lib/flow-library'
import ComposeClient from './ComposeClient'

export const dynamic = 'force-dynamic'

export default function ComposePage() {
  return <ComposeClient poses={getAllPoses()} builtins={getBuiltInFlows()} />
}
