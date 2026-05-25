'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchCoursesForEditor, createCourse, type Course } from '@/features/courses/public'
import { useAuthStore } from '@/features/auth/public'
import { canEnterStudio } from '@/lib/roles'
import { CourseCatalogCard, CourseCatalogCardSkeleton } from '@/components/courses/CourseCatalogCard'

export default function StudioHomePage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [showCreateCourse, setShowCreateCourse] = useState(false)
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio')
    if (checked && user && !canEnterStudio(user)) router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    fetchCoursesForEditor().then(setCourses).finally(() => setLoadingCourses(false))
  }, [user])

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-ds-muted">Checking auth...</div>
  }

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-10">
      <main className="max-w-7xl mx-auto space-y-6">
        <section className="rounded-2xl border border-ds-accent-strong bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-purple-500/20 p-6">
          <p className="text-xs uppercase tracking-wide text-cyan-200">Teacher Studio</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">Cosmo Learn Studio</h1>
          <p className="text-sm text-gray-200 mt-2">
            <strong>Learning Path</strong> – Lộ trình 6 module.{' '}
            <strong>Course</strong> – Chỉnh curriculum, ảnh bìa, giá — thẻ catalog đồng bộ với học viên.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/studio/learning-path"
              className="inline-flex items-center min-h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-500"
            >
              Mở Learning Path Studio
            </Link>
            <Link
              href="/studio/concepts"
              className="inline-flex items-center min-h-10 px-4 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
            >
              Mở Concept Studio
            </Link>
            <Link
              href="/studio/showcase-entities"
              className="inline-flex items-center min-h-10 px-4 rounded-xl bg-slate-600 text-white text-sm font-medium hover:bg-slate-500"
            >
              Mở 3D Studio
            </Link>
            <Link
              href="/courses"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-200/90 hover:underline self-center"
            >
              Xem catalog học viên →
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-ds-border bg-ds-surface p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-white font-semibold">Khóa học của bạn</h2>
              <p className="text-xs text-ds-subtle mt-1">Cùng thẻ như trang /courses — mở Studio để sửa ảnh bìa &amp; mô tả.</p>
            </div>
            <div className="flex items-center gap-2">
              {!showCreateCourse ? (
                <button
                  type="button"
                  onClick={() => setShowCreateCourse(true)}
                  className="text-xs min-h-10 px-3 py-1.5 rounded-lg bg-green-600/80 text-white hover:bg-green-500"
                >
                  + Tạo khóa học
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="Tên khóa học"
                    className="rounded-lg bg-black/50 border border-ds-border-strong px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-ds-accent focus:outline-none w-48"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!newCourseTitle.trim()) return
                      setCreating(true)
                      setCreateError('')
                      const res = await createCourse(newCourseTitle.trim())
                      setCreating(false)
                      if (res.success && res.slug) {
                        setShowCreateCourse(false)
                        setNewCourseTitle('')
                        router.push(`/studio/${res.slug}`)
                      } else {
                        setCreateError(res.error || 'Lỗi tạo khóa học')
                      }
                    }}
                    disabled={creating || !newCourseTitle.trim()}
                    className="text-xs min-h-10 px-3 py-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {creating ? '...' : 'Tạo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCourse(false)
                      setNewCourseTitle('')
                      setCreateError('')
                    }}
                    className="text-xs min-h-10 px-2 text-ds-muted hover:text-white"
                  >
                    Huỷ
                  </button>
                </div>
              )}
            </div>
          </div>
          {createError && <p className="text-sm text-red-400 mb-3">{createError}</p>}
          {loadingCourses ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <CourseCatalogCardSkeleton key={i} />
              ))}
            </div>
          ) : courses.length === 0 && !showCreateCourse ? (
            <p className="text-sm text-ds-muted">Chưa có khóa học. Bấm «Tạo khóa học» để bắt đầu.</p>
          ) : (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {courses.map((c) => (
                <div key={c.id || c.slug} className="relative group">
                  {!c.published && (
                    <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-500/90 text-amber-950">
                      Nháp
                    </span>
                  )}
                  <CourseCatalogCard
                    href={`/studio/${c.slug}`}
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
                  />
                  <div className="mt-2 flex gap-2">
                    <Link
                      href={`/studio/${c.slug}`}
                      className="flex-1 text-center text-xs py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500"
                    >
                      Mở Studio
                    </Link>
                    {c.published && (
                      <Link
                        href={`/courses/${c.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-lg text-xs border border-ds-border text-ds-muted hover:text-ds-accent"
                      >
                        Xem
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
