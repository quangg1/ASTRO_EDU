'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Loading } from '@/components/ui/Loading'

const KnowledgeStarMap = dynamic(() => import('@/features/concepts/ui/KnowledgeStarMap'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-ds-base">
      <Loading />
    </div>
  ),
})

function KnowledgeMapFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-base">
      <Loading />
    </div>
  )
}

export default function KnowledgeMapPage() {
  return (
    <Suspense fallback={<KnowledgeMapFallback />}>
      <KnowledgeStarMap />
    </Suspense>
  )
}
