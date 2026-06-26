import { notFound } from 'next/navigation'
import { getAllPoses, getPoseBySlug } from '@/lib/pose-library'
import PoseDetailClient from './PoseDetailClient'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getAllPoses().map(p => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const pose = getPoseBySlug(slug)
  if (!pose) return { title: 'Pose not found — Krama' }
  return {
    title: `${pose.english} (${pose.sanskrit}) — Krama`,
    description: `Anatomy, meridians, and sequencing for ${pose.english} in yin yoga.`,
  }
}

export default async function PoseDetailPage({ params }: Props) {
  const { slug } = await params
  const pose = getPoseBySlug(slug)
  if (!pose) notFound()
  return <PoseDetailClient pose={pose} />
}
