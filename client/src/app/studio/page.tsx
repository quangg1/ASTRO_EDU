'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchCoursesForEditor, createCourse, type Course } from '@/lib/coursesApi'
import { useAuthStore } from '@/store/useAuthStore'

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
    if (checked && user && user.role !== 'teacher' && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    fetchCoursesForEditor().then(setCourses).finally(() => setLoadingCourses(false))
  }, [user])

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Checking auth...</div>
  }

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-10">
      <main className="max-w-6xl mx-auto space-y-6">
        <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-purple-500/20 p-6">
          <p className="text-xs uppercase tracking-wide text-cyan-200">Teacher Studio</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">Cosmo Learn Studio</h1>
          <p className="text-sm text-gray-200 mt-2">
            <strong>Learning Path</strong> – Lộ trình 6 module, bài học theo block (cùng kit với khóa học).{' '}
            <strong>Course</strong> – Khóa học có curriculum &amp; thanh toán tùy chọn.
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
              Showcase entity (CMS)
            </Link>
            <Link
              href="/tutorial"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-cyan-200/90 hover:underline self-center"
            >
              Xem lộ trình (học viên) →
            </Link>
          </div>
        </section>

        {/* Courses */}
        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] p-4">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h2 className="text-white font-semibold">Courses (curriculum & payments)</h2>
            <div className="flex items-center gap-2">
              {!showCreateCourse ? (
                <button
                  type="button"
                  onClick={() => setShowCreateCourse(true)}
                  className="text-xs min-h-10 px-3 py-1.5 rounded-lg bg-green-600/80 text-white hover:bg-green-500"
                >
                  + Create course
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newCourseTitle}
                    onChange={(e) => setNewCourseTitle(e.target.value)}
                    placeholder="Course title"
                    className="rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-cyan-500/50 focus:outline-none w-48"
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
                        setCourses((prev) => [...prev, { id: '', title: newCourseTitle.trim(), slug: res.slug!, description: '', thumbnail: null, level: 'beginner' }])
                        router.push(`/studio/${res.slug}`)
                      } else {
                        setCreateError(res.error || 'Error')
                      }
                    }}
                    disabled={creating || !newCourseTitle.trim()}
                    className="text-xs min-h-10 px-3 py-1.5 rounded-lg bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-50"
                  >
                    {creating ? '...' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateCourse(false)
                      setNewCourseTitle('')
                      setCreateError('')
                    }}
                    className="text-xs min-h-10 px-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <Link href="/courses" className="text-xs text-cyan-300 hover:text-cyan-200">
                Student view
              </Link>
            </div>
          </div>
          {createError && <p className="text-sm text-red-400 mb-2">{createError}</p>}
          {loadingCourses ? (
            <p className="text-sm text-gray-400">Loading courses...</p>
          ) : courses.length === 0 && !showCreateCourse ? (
            <p className="text-sm text-gray-400">No courses yet. Click “Create course” to get started.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {courses.map((c) => (
                <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-white font-semibold">{c.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {c.lessonCount ?? 0} lessons &middot; {c.level}
                        {c.isPaid && (c.price ?? 0) > 0 && (
                          <>
                            {' '}
                            &middot; {c.currency === 'USD' ? `$${c.price}` : `${(c.price ?? 0).toLocaleString('en-US')} ₫`}
                          </>
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/studio/${c.slug}`}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-sm hover:bg-cyan-400"
                    >
                      Open Studio
                    </Link>
                  </div>
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
