import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { TopicExploreView } from '@/components/learning-path/TopicExploreView'
import { getTopicBySlug, isValidTopicSlug } from '@/data/learningTopics'

type Props = { params: { slug: string } }

export function generateMetadata({ params }: Props): Metadata {
  const t = getTopicBySlug(params.slug)
  if (!t) return { title: 'Chủ đề' }
  return {
    title: `${t.labelVi} — Lộ trình theo chủ đề`,
    description: t.descriptionVi,
  }
}

export default function TopicPage({ params }: Props) {
  if (!isValidTopicSlug(params.slug)) notFound()
  return (
    <Suspense fallback={<div className="min-h-screen bg-ds-base pt-20 px-4 text-ds-subtle text-sm">Đang tải…</div>}>
      <TopicExploreView slug={params.slug} />
    </Suspense>
  )
}
