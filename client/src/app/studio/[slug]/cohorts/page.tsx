'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canEnterStudio } from '@/lib/roles'
import { fetchCourseForEditor } from '@/features/courses/public'
import { CohortStudioManager } from '@/features/courses/cohort/CohortStudioManager'
import {
  cohortsNavEnabledForStrategy,
  resolveDistributionStrategy,
} from '@/features/courses/lib/distributionStrategy'
import Link from 'next/link'

export default function StudioCohortsPage() {
  const { slug } = useParams() as { slug: string }
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [title, setTitle] = useState('')
  const [lessonCount, setLessonCount] = useState(0)
  const [distributionStrategy, setDistributionStrategy] = useState<string | null>(null)
  const titleLoadedRef = useRef('')

  useEffect(() => {
    if (checked && !user) router.replace(`/login?redirect=/studio/${slug}/cohorts`)
    if (checked && user && !canEnterStudio(user)) router.replace('/')
  }, [checked, user?.id, slug, router])

  useEffect(() => {
    if (!slug || !user?.id) return
    if (titleLoadedRef.current === slug) return
    titleLoadedRef.current = slug
    fetchCourseForEditor(slug).then((c) => {
      if (c?.title) setTitle(c.title)
      setLessonCount(c?.lessons?.length ?? 0)
      if (c) setDistributionStrategy(resolveDistributionStrategy(c))
    })
  }, [slug, user?.id])

  if (!checked) return null
  if (!user) return null

  const strategy = distributionStrategy ? resolveDistributionStrategy({ distributionStrategy }) : 'hybrid'
  if (distributionStrategy && !cohortsNavEnabledForStrategy(strategy)) {
    return (
      <div className="min-h-screen bg-ds-base pt-20 px-6 max-w-lg mx-auto space-y-4 text-center">
        <h1 className="text-lg font-semibold text-white">Lớp theo kỳ không áp dụng</h1>
        <p className="text-sm text-ds-muted leading-relaxed">
          Khóa «{title || slug}» đang ở chế độ <strong className="text-cyan-300">Tự học (Catalog)</strong>. Đổi sang{' '}
          <strong className="text-violet-300">Có giáo viên</strong> hoặc <strong className="text-amber-300">Hybrid</strong>{' '}
          trong Studio → Storefront → Chế độ phân phối.
        </p>
        <Link href={`/studio/${slug}`} className="inline-block text-sm text-ds-accent hover:underline">
          ← Về soạn khóa
        </Link>
      </div>
    )
  }

  return <CohortStudioManager courseSlug={slug} courseTitle={title || slug} lessonCount={lessonCount} />
}
