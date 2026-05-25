'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { fetchCourse, type Course, type CourseLessonOutline, type CourseModule, type Lesson } from '@/features/courses/api/coursesApi'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { courseLevelLabel, courseRequiresPayment, formatCatalogPrice } from '@/components/courses/courseCatalogMeta'
import { trackEvent } from '@/lib/analytics'
import { fetchCoursePromoBanner, type CoursePromoBanner as PromoBanner } from '@/features/promotions/api/promoApi'
import { CoursePromoBanner } from '@/components/courses/CoursePromoBanner'
import { CommunityAskButton } from '@/components/community/learning/CommunityAskButton'

function isOutlineEntry(l: Lesson | CourseLessonOutline): l is CourseLessonOutline {
  return !('content' in l)
}

function groupLessons(
  courseModules: CourseModule[],
  lessons: (Lesson | CourseLessonOutline)[]
): { key: string; label: string; index: number; lessons: (Lesson | CourseLessonOutline)[] }[] {
  const sorted = [...lessons].sort((a, b) => a.order - b.order)
  if (courseModules.length === 0) {
    return Object.entries(
      sorted.reduce((acc: Record<string, (Lesson | CourseLessonOutline)[]>, l) => {
        const k = l.week != null ? `w-${l.week}` : 'none'
        if (!acc[k]) acc[k] = []
        acc[k].push(l)
        return acc
      }, {})
    )
      .sort(([a], [b]) => (a === 'none' ? -1 : b === 'none' ? 1 : a.localeCompare(b)))
      .map(([k, ls], i) => ({
        key: k,
        label: k === 'none' ? 'Bài học' : `Tuần ${k.replace('w-', '')}`,
        index: i,
        lessons: ls,
      }))
  }
  const map: Record<string, (Lesson | CourseLessonOutline)[]> = {}
  courseModules.forEach((m) => {
    map[m._id || m.slug] = []
  })
  map._unassigned = []
  sorted.forEach((l) => {
    const key = l.moduleId && map[l.moduleId] ? l.moduleId : '_unassigned'
    map[key].push(l)
  })
  const groups = courseModules.map((m, mi) => ({
    key: m._id || m.slug,
    label: m.title,
    index: mi,
    lessons: map[m._id || m.slug] ?? [],
  }))
  if ((map._unassigned?.length ?? 0) > 0) {
    groups.push({ key: '_unassigned', label: 'Chưa gán module', index: groups.length, lessons: map._unassigned })
  }
  return groups
}

export function CourseLandingClient({
  slug,
  initialCourse,
  enrolledFlash,
}: {
  slug: string
  initialCourse: Course
  enrolledFlash?: boolean
}) {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [course, setCourse] = useState(initialCourse)
  const [promoBanner, setPromoBanner] = useState<PromoBanner | null>(null)

  useEffect(() => setCourse(initialCourse), [initialCourse])

  useEffect(() => {
    let cancelled = false
    fetchCourse(slug).then((c) => {
      if (!cancelled && c) setCourse(c)
    })
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    if (!course.id || course.enrollment) return
    if (!courseRequiresPayment(course)) return
    let cancelled = false
    void fetchCoursePromoBanner(course.id).then((b) => {
      if (!cancelled) setPromoBanner(b)
    })
    return () => {
      cancelled = true
    }
  }, [course.id, course.enrollment, course.isPaid, course.price, course.requiresPayment])

  const isEnrolled = course.enrollment != null
  const lessons = course.lessons ?? []
  const courseModules = (course.modules ?? []).sort((a, b) => a.order - b.order)
  const groups = useMemo(() => groupLessons(courseModules, lessons), [courseModules, lessons])

  const firstLessonSlug = lessons.length ? [...lessons].sort((a, b) => a.order - b.order)[0]?.slug : null

  const learnHref = firstLessonSlug ? `/courses/${slug}/learn/${encodeURIComponent(firstLessonSlug)}` : null

  const crossHref = course.crossSellTutorialHref?.trim() || '/tutorial'

  const levelLabel = courseLevelLabel(course.level)
  const isPaid = courseRequiresPayment(course)
  const checkoutHref = `/courses/${slug}/checkout`
  const priceLabel = formatCatalogPrice(
    course.price,
    course.currency,
    course.isPaid,
    course.requiresPayment,
  )
  const thumbSrc = course.thumbnail ? resolveMediaUrl(course.thumbnail) : null

  const handleBuyNow = () => {
    if (!checked) return
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(checkoutHref)}`)
      return
    }
    trackEvent('checkout_started', {
      course_slug: slug,
      amount: course.price ?? 0,
      currency: course.currency || 'VND',
      surface: 'course_landing',
    })
    router.push(checkoutHref)
  }

  return (
    <div className="min-h-screen bg-ds-base">
      {enrolledFlash && (
        <div className="pt-14 px-4">
          <div className="max-w-3xl mx-auto rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            Ghi danh / thanh toán thành công. Chọn bài học bên dưới để tiếp tục.
          </div>
        </div>
      )}
      <main className={`px-4 pb-16 max-w-3xl mx-auto ${enrolledFlash ? 'pt-4' : 'pt-20'}`}>
        <Link href="/courses" className="text-sm text-ds-accent hover:text-cyan-100 mb-6 inline-block">
          ← Danh sách khóa học
        </Link>

        {!isEnrolled && isPaid && promoBanner && (
          <CoursePromoBanner banner={promoBanner} checkoutHref={checkoutHref} />
        )}

        <div className="rounded-2xl border border-ds-border bg-ds-overlay overflow-hidden mb-8">
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-ds-elevated">
            {thumbSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbSrc} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/80 via-ds-base to-violet-950/50 flex items-center justify-center text-5xl opacity-50">
                🌌
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-ds-surface via-ds-surface/40 to-transparent" />
          </div>
          <div className="p-6 -mt-6 relative">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-ds-subtle mb-2">
              <span className="px-2 py-0.5 rounded-full bg-white/5 border border-ds-border text-gray-300">{levelLabel}</span>
              {course.durationWeeks != null && <span>{course.durationWeeks} tuần</span>}
              <span>·</span>
              <span>{lessons.length} bài</span>
              {course.isPaid && (course.price ?? 0) > 0 && (
                <>
                  <span>·</span>
                  <span className="text-amber-200/90">
                    {course.currency === 'USD' ? `$${course.price}` : `${(course.price ?? 0).toLocaleString('en-US')} ₫`}
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">{course.title}</h1>
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{course.description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              {isEnrolled && learnHref && (
                <Link
                  href={learnHref}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 transition-colors"
                >
                  Vào học
                </Link>
              )}
              {!isEnrolled && isPaid && (
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 transition-colors"
                >
                  Mua ngay · {priceLabel}
                </button>
              )}
              {!isEnrolled && learnHref && (
                <Link
                  href={learnHref}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-ds-border-strong text-gray-200 text-sm hover:bg-white/5 transition-colors"
                >
                  {isPaid ? 'Xem trước nội dung' : 'Xem nội dung khóa học'}
                </Link>
              )}
              <Link
                href="/tutorial"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-ds-border-strong text-gray-200 text-sm hover:bg-white/5 transition-colors"
              >
                Lộ trình miễn phí
              </Link>
              <CommunityAskButton
                variant="outline"
                className="!w-auto"
                context={{
                  pathSource: 'course',
                  courseSlug: slug,
                  courseId: course.id,
                  courseTitle: course.title,
                }}
              >
                Hỏi cộng đồng về khóa này
              </CommunityAskButton>
            </div>
            {!isEnrolled && isPaid && (
              <p className="mt-4 text-xs text-ds-subtle leading-relaxed">
                Thanh toán trên trang checkout (demo thẻ — không trừ tiền thật). Gem chỉ dùng để giảm giá.
              </p>
            )}
          </div>
        </div>

        {!isEnrolled && isPaid && (
          <aside className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-100">Một lần mua — truy cập trọn khóa</p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">{priceLabel}</p>
            </div>
            <button
              type="button"
              onClick={handleBuyNow}
              className="shrink-0 px-6 py-3 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500 transition-colors"
            >
              Mua ngay
            </button>
          </aside>
        )}

        <section className="rounded-2xl border border-ds-border bg-ds-surface p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-1">Chương trình (syllabus)</h2>
          <p className="text-xs text-ds-subtle mb-5">Xem trước cấu trúc bài học trước khi ghi danh.</p>
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.key} className="rounded-xl border border-white/5 bg-black/20 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 bg-white/[0.02]">
                  <p className="text-[10px] text-cyan-500/80 font-semibold uppercase tracking-wider">Module {g.index + 1}</p>
                  <p className="text-sm text-white font-medium">{g.label}</p>
                </div>
                <ul className="divide-y divide-white/5">
                  {g.lessons.map((lesson) => {
                    const ol = isOutlineEntry(lesson)
                    const meta = ol
                      ? lesson.type === 'quiz'
                        ? `${lesson.quizQuestionCount ?? 0} câu hỏi`
                        : `${lesson.sectionCount ?? 0} block`
                      : lesson.type === 'quiz'
                        ? 'Quiz'
                        : lesson.type === 'visualization'
                          ? '3D'
                          : lesson.videoUrl
                            ? 'Video'
                            : 'Đọc'
                    return (
                      <li key={lesson.slug} className="px-4 py-3 flex items-start gap-3">
                        <span className="text-[10px] text-ds-subtle w-6 shrink-0 pt-0.5">{lesson.order + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-200">{lesson.title}</p>
                          {lesson.description && <p className="text-xs text-ds-subtle mt-0.5 line-clamp-2">{lesson.description}</p>}
                          <p className="text-[10px] text-ds-subtle mt-1">{meta}</p>
                        </div>
                        {learnHref && (
                          <Link
                            href={`/courses/${slug}/learn/${encodeURIComponent(lesson.slug)}`}
                            className="text-[11px] text-ds-accent hover:text-cyan-100 shrink-0"
                          >
                            Mở →
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-ds-accent-strong bg-cyan-950/10 p-6">
          <h2 className="text-sm font-semibold text-cyan-200 mb-2">{course.crossSellTutorialLabelVi || 'Học thêm miễn phí · Lộ trình'}</h2>
          {course.crossSellTutorialBodyVi && <p className="text-sm text-ds-muted mb-4 leading-relaxed">{course.crossSellTutorialBodyVi}</p>}
          <Link
            href={crossHref}
            className="inline-flex px-4 py-2 rounded-lg bg-white/10 text-sm text-white hover:bg-cyan-600/40 border border-ds-border transition-colors"
          >
            Mở lộ trình →
          </Link>
        </section>
      </main>
    </div>
  )
}
