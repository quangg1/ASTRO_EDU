'use client'

import Link from 'next/link'
import {
  cohortsNavEnabledForStrategy,
  resolveDistributionStrategy,
  type DistributionStrategySource,
} from '@/features/courses/lib/distributionStrategy'

export function CohortStudioNavLink({
  slug,
  course,
  className = '',
}: {
  slug: string
  course: DistributionStrategySource
  className?: string
}) {
  const strategy = resolveDistributionStrategy(course)
  const enabled = cohortsNavEnabledForStrategy(strategy)

  const base =
    'mt-2 block text-center text-[11px] py-2 rounded-lg border transition-colors ' + className

  if (!enabled) {
    return (
      <span
        className={`${base} border-ds-border/40 text-ds-subtle/60 bg-white/[0.02] cursor-not-allowed`}
        title="Chế độ lớp học chỉ dành cho khóa Có giáo viên hoặc Hybrid. Chọn Instructor-led / Hybrid trong Chế độ phân phối."
      >
        Lớp học theo kỳ
        <span className="block text-[9px] mt-0.5 opacity-80">(Tự học — không dùng cohort)</span>
      </span>
    )
  }

  return (
    <Link
      href={`/studio/${slug}/cohorts`}
      className={`${base} border-purple-500/30 text-purple-200 hover:bg-purple-500/10`}
      title="Quản lý lớp, lịch mở bài, thông báo và chấm bài"
    >
      Lớp học theo kỳ →
    </Link>
  )
}
