'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { fetchCourses, type Course, type FetchCoursesOpts } from '@/features/courses/public'
import { courseRequiresPayment } from '@/components/courses/courseCatalogMeta'
import { CourseCatalogCard, CourseCatalogCardSkeleton } from '@/components/courses/CourseCatalogCard'
import { CoursePromoBanner } from '@/components/courses/CoursePromoBanner'
import { fetchActivePromotions, type ActivePromoCampaign } from '@/features/promotions/public'
import { readRouteCache, writeRouteCache } from '@/lib/clientRouteCache'

type CoursesCache = { courses: Course[]; promos: ActivePromoCampaign[] }

function coursesCacheKey(level: string, pricing: string) {
  return `courses:catalog:${level}:${pricing}`
}

export default function CoursesPage() {
  const [level, setLevel] = useState<NonNullable<FetchCoursesOpts['level']>>('')
  const [pricing, setPricing] = useState<NonNullable<FetchCoursesOpts['pricing']>>('')
  const cacheKey = coursesCacheKey(level, pricing)
  const cached = readRouteCache<CoursesCache>(cacheKey)
  const [courses, setCourses] = useState<Course[]>(cached?.courses ?? [])
  const [promos, setPromos] = useState<ActivePromoCampaign[]>(cached?.promos ?? [])
  const [loading, setLoading] = useState(!cached?.courses?.length)

  useEffect(() => {
    const hit = readRouteCache<CoursesCache>(cacheKey)
    if (hit?.courses?.length) {
      setCourses(hit.courses)
      setPromos(hit.promos)
      setLoading(false)
    } else if (!courses.length) {
      setLoading(true)
    }
    let cancelled = false
    Promise.all([fetchCourses({ level, pricing }), fetchActivePromotions(6)])
      .then(([nextCourses, nextPromos]) => {
        if (cancelled) return
        writeRouteCache(cacheKey, { courses: nextCourses, promos: nextPromos })
        setCourses(nextCourses)
        setPromos(nextPromos)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [level, pricing, cacheKey])

  const promoByCourseId = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of promos) {
      if (p.appliesToAll) {
        for (const c of courses) {
          if (courseRequiresPayment(c)) map.set(c.id, p.discountLabelVi)
        }
      } else {
        for (const c of p.courses) {
          map.set(c.id, p.discountLabelVi)
        }
      }
    }
    return map
  }, [promos, courses])

  const featuredPromo = promos[0]
  const featuredCheckoutHref =
    featuredPromo?.courses[0]?.checkoutHref ||
    featuredPromo?.primaryCheckoutHref ||
    '/courses?pricing=paid'

  return (
    <div className="min-h-screen bg-ds-base">
      <main className="pt-16 px-4 sm:px-6 pb-12 max-w-7xl mx-auto">
        <header className="mt-8 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-ds-text mb-2">Khóa học</h1>
          <p className="text-ds-muted text-sm max-w-2xl leading-relaxed">
            Khám phá khóa học thiên văn với mô phỏng 3D — Lịch sử Trái Đất, Hệ Mặt Trời, Dải Ngân Hà và hơn thế
            nữa.
          </p>
        </header>

        {featuredPromo && (
          <CoursePromoBanner banner={featuredPromo} checkoutHref={featuredCheckoutHref} />
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wide text-ds-subtle w-full sm:w-auto">Độ khó</span>
          {(
            [
              ['', 'Tất cả'],
              ['beginner', 'Cơ bản'],
              ['intermediate', 'Trung cấp'],
              ['advanced', 'Nâng cao'],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v || 'all'}
              type="button"
              onClick={() => setLevel(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                level === v
                  ? 'border-ds-accent-strong bg-ds-accent-soft text-cyan-200'
                  : 'border-ds-border text-ds-muted hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-10">
          <span className="text-[10px] uppercase tracking-wide text-ds-subtle w-full sm:w-auto">Giá</span>
          {(['', 'free', 'paid'] as const).map((v) => (
            <button
              key={v || 'all-pr'}
              type="button"
              onClick={() => setPricing(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                pricing === v
                  ? 'border-ds-accent-strong bg-ds-accent-soft text-cyan-200'
                  : 'border-ds-border text-ds-muted hover:bg-white/5'
              }`}
            >
              {v === '' ? 'Tất cả' : v === 'free' ? 'Miễn phí' : 'Trả phí'}
            </button>
          ))}
          <Link href="/tutorial" className="ml-auto text-xs text-ds-accent hover:text-cyan-100">
            Lộ trình miễn phí →
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CourseCatalogCardSkeleton key={i} />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="text-ds-subtle">Chưa có khóa học phù hợp bộ lọc.</p>
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.map((c) => (
              <CourseCatalogCard
                key={c.id}
                href={`/courses/${c.slug}`}
                course={{
                  slug: c.slug,
                  title: c.title,
                  description: c.description,
                  thumbnail: c.thumbnail,
                  level: c.level,
                  lessonCount: c.lessonCount,
                  durationWeeks: c.durationWeeks,
                  isPaid: c.isPaid,
                  requiresPayment: c.requiresPayment,
                  price: c.price,
                  currency: c.currency,
                }}
                promoLabel={promoByCourseId.get(c.id) ?? null}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
