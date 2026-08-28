import { notFound } from 'next/navigation'
import { getReferenceSequenceById, REFERENCE_SEQUENCES } from '@/lib/reference-sequences'
import { getPoseBySlug } from '@/lib/pose-library'
import SequenceDetailClient from './SequenceDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export function generateStaticParams() {
  return REFERENCE_SEQUENCES.map(s => ({ id: s.id }))
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params
  const seq = getReferenceSequenceById(id)
  if (!seq) return {}
  return {
    title: `${seq.title} | YogaKit`,
    description: seq.description,
  }
}

export default async function SequenceDetailPage({ params }: Props) {
  const { id } = await params
  const seq = getReferenceSequenceById(id)
  if (!seq) notFound()

  const resolvedPoses = seq.poses.map(p => ({
    ...p,
    pose: getPoseBySlug(p.slug) ?? null,
  }))

  return <SequenceDetailClient sequence={seq} resolvedPoses={resolvedPoses} />
}
