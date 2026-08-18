import { getBuiltInFlows } from '@/lib/flow-library'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return <HomeClient builtins={getBuiltInFlows()} />
}
