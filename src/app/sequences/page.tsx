import { REFERENCE_SEQUENCES } from '@/lib/reference-sequences'
import SequencesClient from './SequencesClient'

export const metadata = {
  title: 'Reference Sequences — Yoga Kit',
  description: 'Community and research-backed yoga sequences for every style.',
}

export default function SequencesPage() {
  return <SequencesClient sequences={REFERENCE_SEQUENCES} />
}
