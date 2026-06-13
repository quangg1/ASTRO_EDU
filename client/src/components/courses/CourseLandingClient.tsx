'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import {
  fetchCourse,
  fetchCourseForEditor,
  fetchCourseOutline,
  type Course,
  type CourseLessonOutline,
  type CourseModule,
  type Lesson,
} from '@/features/courses/api/coursesApi'
import { hasClientSession } from '@/features/auth/public'
import { resolveMediaUrl } from '@/lib/apiConfig'
import { courseLevelLabel, courseRequiresPayment, formatCatalogPrice } from '@/components/courses/courseCatalogMeta'
import { trackEvent } from '@/lib/analytics'
import { fetchCoursePromoBanner, type CoursePromoBanner as PromoBanner } from '@/features/promotions/api/promoApi'
import { CoursePromoBanner } from '@/components/courses/CoursePromoBanner'
import { CommunityAskButton } from '@/components/community/learning/CommunityAskButton'
import { CourseCohortsJoin } from '@/features/courses/cohort/CourseCohortsJoin'
import { ModuleMaterialsList } from '@/features/courses/cohort/ModuleMaterialsList'
import { CourseInstructorCard } from '@/components/courses/CourseInstructorCard'
import { hasCourseLearnerAccess } from '@/features/courses/lib/courseLearnerAccess'

function isOutlineEntry(l: Lesson | CourseLessonOutline): l is CourseLessonOutline {
  return !('content' in l)
}

function groupLessons(
  courseModules: CourseModule[],
  lessons: (Lesson | CourseLessonOutline)[]
): {
  key: string
  label: string
  index: number
  lessons: (Lesson | CourseLessonOutline)[]
  materials?: CourseModule['materials']
}[] {
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
    materials: m.materials,
  }))
  if ((map._unassigned?.length ?? 0) > 0) {
    groups.push({
      key: '_unassigned',
      label: 'Chưa gán module',
      index: groups.length,
      lessons: map._unassigned,
      materials: undefined,
    })
  }
  return groups
}

export function CourseLandingClient({
  slug,
  initialCourse,
  previewBootstrap,
  enrolledFlash,
  ownedFlash,
  cohortPlacedFlash,
}: {
  slug: string
  initialCourse?: Course
  /** Studio / GV: tải khóa nháp phía client (SSR không gửi token). */
  previewBootstrap?: boolean
  enrolledFlash?: boolean
  /** Đã sở hữu — chặn mua lại catalog. */
  ownedFlash?: boolean
  cohortPlacedFlash?: boolean
}) {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [course, setCourse] = useState<Course | null>(initialCourse ?? null)
  const [loading, setLoading] = useState(Boolean(previewBootstrap))
  const [loadError, setLoadError] = useState<string | null>(null)
  const [promoBanner, setPromoBanner] = useState<PromoBanner | null>(null)

  useEffect(() => {
    if (initialCourse) {
      setCourse(initialCourse)
      setLoading(false)
      setLoadError(null)
    }
  }, [initialCourse])

  useEffect(() => {
    if (!previewBootstrap || !checked) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    if (!hasClientSession()) {
      setLoadError('Chưa đăng nhập trong cửa sổ này. Mở preview từ Studio (cùng tab) hoặc đăng nhập lại.')
      setLoading(false)
      return
    }
    void (async () => {
      const { course: c, error } = await fetchCourseOutline(slug)
      if (cancelled) return
      if (c) {
        setCourse(c)
        setLoading(false)
        return
      }
      const editor = await fetchCourseForEditor(slug)
      if (cancelled) return
      if (editor) {
        setCourse({
          ...editor,
          enrollment: null,
          outlineOnly: true,
          editorPreview: editor.published === false,
        } as Course)
        setLoading(false)
        return
      }
      setLoadError(
        error || 'Không tải được khóa học. Kiểm tra bạn có quyền sửa khóa này trong Studio.',
      )
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [slug, previewBootstrap, checked])

  useEffect(() => {
    if (previewBootstrap || !slug) return
    let cancelled = false
    fetchCourse(slug).then((c) => {
      if (cancelled || !c) return
      setCourse((prev) => {
        if (c.teacher || !prev?.teacher) return c
        return { ...c, teacher: prev.teacher }
      })
    })
    return () => {
      cancelled = true
    }
  }, [slug, previewBootstrap])

  useEffect(() => {
    if (!enrolledFlash || previewBootstrap || !slug || !user?.id) return
    let cancelled = false
    void fetchCourseOutline(slug).then(({ course: c }) => {
      if (!cancelled && c) setCourse(c)
    })
    return () => {
      cancelled = true
    }
  }, [enrolledFlash, previewBootstrap, slug, user?.id])

  useEffect(() => {
    if (!course?.id || course.enrollment) return
    if (!courseRequiresPayment(course)) return
    let cancelled = false
    void fetchCoursePromoBanner(course.id).then((b) => {
      if (!cancelled) setPromoBanner(b)
    })
    return () => {
      cancelled = true
    }
  }, [course?.id, course?.enrollment, course?.isPaid, course?.price, course?.requiresPayment])

  const lessons = course?.lessons ?? []
  const courseModules = useMemo(
    () => [...(course?.modules ?? [])].sort((a, b) => a.order - b.order),
    [course?.modules],
  )
  const groups = useMemo(() => groupLessons(courseModules, lessons), [courseModules, lessons])

  if (loading) {
    return (
      <div className="min-h-screen bg-ds-base pt-24 px-4 text-center text-ds-subtle text-sm">
        Đang tải trang khóa học…
      </div>
    )
  }

  if (!course || loadError) {
    return (
      <div className="min-h-screen bg-ds-base pt-24 px-4 max-w-md mx-auto text-center space-y-3">
        <p className="text-ds-text text-sm">{loadError || 'Không tìm thấy khóa học'}</p>
        <Link href="/studio" className="text-sm text-ds-accent hover:text-ds-text">
          ← Quay lại Studio
        </Link>
      </div>
    )
  }

  const hasLearnerAccess = hasCourseLearnerAccess(course)
  const catalogOpen = course.catalogEnabled !== false

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
      {ownedFlash && !enrolledFlash && (
        <div className="pt-14 px-4">
          <div className="max-w-3xl mx-auto rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-ds-text">
            Bạn đã có quyền truy cập khóa học này — không cần mua lại gói tự học. Muốn học theo lớp có GV,
            chọn lớp ở mục bên dưới.
          </div>
        </div>
      )}
      {(course.editorPreview || course.published === false) && (
        <div className={`px-4 ${enrolledFlash ? 'pt-2' : 'pt-16'}`}>
          <div className="max-w-3xl mx-auto rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Xem trước bản nháp — học viên chưa thấy khóa này trên catalog cho đến khi bạn publish.
          </div>
        </div>
      )}
      <main className={`px-4 pb-16 max-w-3xl mx-auto ${enrolledFlash ? 'pt-4' : course.editorPreview || course.published === false ? 'pt-4' : 'pt-20'}`}>
        <Link href="/courses" className="text-sm text-ds-accent hover:text-ds-text mb-6 inline-block">
          ← Danh sách khóa học
        </Link>

        {!hasLearnerAccess && isPaid && promoBanner && (
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

            {course.teacher ? (
              <div className="mt-6">
                <CourseInstructorCard teacher={course.teacher} />
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              {hasLearnerAccess && learnHref && (
                <Link
                  href={learnHref}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:opacity-90 transition-colors"
                >
                  {course.deliveryContext?.mode === 'editor' && !course.enrollment
                    ? 'Vào học (giảng viên)'
                    : 'Vào học'}
                </Link>
              )}
              {!hasLearnerAccess && isPaid && catalogOpen && (
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:opacity-90 transition-colors"
                >
                  Mua ngay · {priceLabel}
                </button>
              )}
              {!hasLearnerAccess && learnHref && (
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
            {!hasLearnerAccess && isPaid && (
              <p className="mt-4 text-xs text-ds-subtle leading-relaxed">
                Thanh toán trên trang checkout (demo thẻ — không trừ tiền thật). Gem chỉ dùng để giảm giá.
              </p>
            )}
          </div>
        </div>

        {!hasLearnerAccess && isPaid && catalogOpen && (
          <aside className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-amber-100">Một lần mua — truy cập trọn khóa</p>
              <p className="text-2xl font-bold text-white mt-1 tabular-nums">{priceLabel}</p>
            </div>
            <button
              type="button"
              onClick={handleBuyNow}
              className="shrink-0 px-6 py-3 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:opacity-90 transition-colors"
            >
              Mua ngay
            </button>
          </aside>
        )}

        {!catalogOpen && !hasLearnerAccess && (
          <p className="text-sm text-amber-200/90 mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
            Khóa theo kỳ — chọn lớp bên dưới và đăng ký trước ngày khai giảng. Mã lớp gửi qua email sau khi hoàn tất.
          </p>
        )}

        <CourseCohortsJoin
          courseSlug={slug}
          courseId={course.id}
          catalogPrice={course.price}
          catalogCurrency={course.currency}
          catalogEnrolled={hasLearnerAccess}
          catalogOpen={catalogOpen}
          cohortPlacedFlash={cohortPlacedFlash}
        />

        <section className="rounded-2xl border border-ds-border bg-ds-surface p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-1">Chương trình (syllabus)</h2>
          <p className="text-xs text-ds-subtle mb-5">Xem trước cấu trúc bài học trước khi ghi danh.</p>
          <div className="space-y-4">
            {groups.map((g) => (
              <div key={g.key} className="rounded-xl border border-white/5 bg-ds-surface/50 overflow-hidden">
                <div className="px-4 py-2 border-b border-white/5 bg-ds-surface/40">
                  <p className="text-[10px] text-cyan-500/80 font-semibold uppercase tracking-wider">Module {g.index + 1}</p>
                  <p className="text-sm text-white font-medium">{g.label}</p>
                  <ModuleMaterialsList materials={g.materials} />
                </div>
                <ul className="divide-y divide-white/5">
                  {g.lessons.map((lesson) => {
                    const ol = isOutlineEntry(lesson)
                    const meta = ol
                      ? lesson.type === 'quiz'
                        ? `${lesson.quizQuestionCount ?? 0} câu hỏi`
                        : lesson.type === 'assignment'
                          ? 'Bài nộp'
                          : lesson.type === 'live_session'
                            ? 'Buổi live'
                            : `${lesson.sectionCount ?? 0} block`
                      : lesson.type === 'quiz'
                        ? 'Quiz'
                        : lesson.type === 'assignment'
                          ? 'Bài nộp'
                          : lesson.type === 'live_session'
                            ? 'Buổi live'
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
                            className="text-[11px] text-ds-accent hover:text-ds-text shrink-0"
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
