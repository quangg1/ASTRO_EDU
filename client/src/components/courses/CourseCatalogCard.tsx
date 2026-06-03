'use client'

import Image from 'next/image'
import Link from 'next/link'
import { BookOpen, Clock } from 'lucide-react'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { courseLevelLabel, courseRequiresPayment, formatCatalogPrice } from './courseCatalogMeta'

export type CourseCatalogCardData = {
  slug: string
  title: string
  description?: string
  thumbnail?: string | null
  level?: string
  lessonCount?: number
  durationWeeks?: number | null
  isPaid?: boolean
  requiresPayment?: boolean
  price?: number
  currency?: string
}

export function CourseCatalogCard({
  course,
  href,
  progress,
  promoLabel,
}: {
  course: CourseCatalogCardData
  href: string
  /** Khi có — hiển thị tiến độ (trang Khóa học của tôi). */
  progress?: { percent: number; completed: number; total: number }
  /** Nhãn ưu đãi (VD: Giảm 20%). */
  promoLabel?: string | null
}) {
  const thumbSrc = course.thumbnail ? resolveMediaUrl(course.thumbnail) : null
  const levelLabel = courseLevelLabel(course.level)
  const paid = courseRequiresPayment(course)
  const priceLabel = formatCatalogPrice(
    course.price,
    course.currency,
    course.isPaid,
    course.requiresPayment,
  )
  const lessons = course.lessonCount ?? 0

  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-ds-border bg-ds-surface overflow-hidden hover:border-ds-accent-strong hover:shadow-lg hover:shadow-cyan-950/20 transition-all duration-300"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-ds-elevated">
        {thumbSrc ? (
          <Image
            src={thumbSrc}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-cyan-950/80 via-ds-base to-violet-950/60 flex items-center justify-center"
            aria-hidden
          >
            <span className="text-4xl opacity-60">🌌</span>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-black/55 text-white border border-ds-border backdrop-blur-sm">
            {levelLabel}
          </span>
        </div>
        {!progress && (paid || promoLabel) && (
          <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1">
            {promoLabel && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-500/95 text-white shadow-sm">
                {promoLabel}
              </span>
            )}
            {paid && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/90 text-amber-950">
                Trả phí
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 mb-2">
          <div
            className="h-7 w-7 shrink-0 rounded-md bg-ds-accent-soft border border-ds-border flex items-center justify-center text-[10px] font-bold text-ds-accent"
            aria-hidden
          >
            CL
          </div>
          <span className="text-xs text-ds-muted truncate">Cosmo Learn</span>
        </div>

        <h2 className="font-semibold text-ds-text text-[15px] leading-snug line-clamp-2 group-hover:text-ds-accent transition-colors mb-1.5">
          {course.title}
        </h2>

        {course.description ? (
          <p className="text-xs text-ds-subtle line-clamp-2 mb-3 leading-relaxed">{course.description}</p>
        ) : (
          <p className="text-xs text-ds-subtle mb-3">Khóa học thiên văn tương tác</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ds-muted mb-3">
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3 w-3 shrink-0" aria-hidden />
            {lessons} bài
          </span>
          {course.durationWeeks != null && course.durationWeeks > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" aria-hidden />
              {course.durationWeeks} tuần
            </span>
          )}
        </div>

        {progress ? (
          <div className="mt-auto pt-3 border-t border-ds-border">
            <div className="flex justify-between text-[11px] text-ds-muted mb-1.5">
              <span>
                {progress.completed}/{progress.total} bài
              </span>
              <span className="tabular-nums text-ds-accent font-medium">{progress.percent}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-ds-accent transition-all"
                style={{ width: `${Math.min(100, progress.percent)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-auto pt-3 border-t border-ds-border flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-ds-accent">{priceLabel}</span>
            <span className="text-[10px] uppercase tracking-wide text-ds-subtle">Khóa học</span>
          </div>
        )}
      </div>
    </Link>
  )
}

export function CourseCatalogCardSkeleton() {
  return (
    <div className="rounded-xl border border-ds-border bg-ds-surface overflow-hidden animate-pulse">
      <div className="aspect-[16/10] bg-white/5" />
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <div className="h-7 w-7 rounded-md bg-white/10" />
          <div className="h-3 flex-1 rounded bg-white/10 mt-2" />
        </div>
        <div className="h-4 w-full rounded bg-white/10" />
        <div className="h-4 w-2/3 rounded bg-white/10" />
        <div className="h-3 w-1/2 rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/10 mt-4" />
      </div>
    </div>
  )
}
