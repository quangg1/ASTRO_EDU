'use client'

import { Suspense } from 'react'
import { Loading } from '@/components/ui/Loading'
import { ExplorePageContent } from './ExplorePageContent'

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-ds-base text-ds-text pt-20">
          <Loading />
        </main>
      }
    >
      <ExplorePageContent />
    </Suspense>
  )
}
