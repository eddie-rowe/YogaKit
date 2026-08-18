import { getBuiltInFlows } from '@/lib/flow-library'
import FlowsClient from './FlowsClient'

export const dynamic = 'force-dynamic'

export default function FlowsPage() {
  return <FlowsClient builtins={getBuiltInFlows()} />
}
