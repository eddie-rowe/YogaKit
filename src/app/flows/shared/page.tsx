import { getAllPoses } from '@/lib/pose-library'
import SharedFlowsClient from './SharedFlowsClient'

// Dynamic for the same reason as every other authenticated page: there is nothing to
// prerender, and the list is entirely a function of who is asking. The pose library
// still comes from the repo at build time (RULE-O6) and is passed down, so an
// unresolvable slug in someone else's flow renders against this build's data.
export const dynamic = 'force-dynamic'

export default function SharedFlowsPage() {
  return <SharedFlowsClient poses={getAllPoses()} />
}
