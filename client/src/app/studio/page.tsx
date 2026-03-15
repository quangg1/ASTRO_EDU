'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchCourses, type Course } from '@/lib/coursesApi'
import { fetchTutorialsForEditor, type Tutorial } from '@/lib/tutorialsApi'
import { useAuthStore } from '@/store/useAuthStore'

export default function StudioHomePage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [courses, setCourses] = useState<Course[]>([])
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingTutorials, setLoadingTutorials] = useState(true)

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio')
    if (checked && user && user.role !== 'teacher' && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    fetchCourses().then(setCourses).finally(() => setLoadingCourses(false))
  }, [user])

  useEffect(() => {
    if (!user) return
    fetchTutorialsForEditor().then((d) => setTutorials(d.tutorials)).finally(() => setLoadingTutorials(false))
  }, [user])

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Checking auth...</div>
  }

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-10">
      <main className="max-w-6xl mx-auto space-y-6">
        <section className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-purple-500/20 p-6">
          <p className="text-xs uppercase tracking-wide text-cyan-200">Teacher Studio</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-2">Galaxies Edu Studio</h1>
          <p className="text-sm text-gray-200 mt-2">
            <strong>Tutorial</strong> – Thuật ngữ, khái niệm cơ bản (GeeksforGeeks style). <strong>Course</strong> – Khóa học chuyên sâu có lộ trình, có thể thiết lập giá (payment).
          </p>
        </section>

        {/* Tutorials */}
        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Tutorial (miễn phí)</h2>
            <div className="flex items-center gap-2">
              <Link href="/studio/tutorial" className="text-xs text-cyan-300 hover:text-cyan-200">
                Mở Tutorial Studio
              </Link>
              <Link href="/tutorial" className="text-xs text-gray-500 hover:text-gray-400">
                Student view
              </Link>
            </div>
          </div>
          {loadingTutorials ? (
            <p className="text-sm text-gray-400">Loading tutorials...</p>
          ) : tutorials.length === 0 ? (
            <p className="text-sm text-gray-400">Chưa có tutorial. Chạy <code className="text-cyan-400">npm run seed:tutorials</code> trong services/courses.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tutorials.map((t) => (
                <div key={t._id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-white font-semibold">{t.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {t.readTime} phút đọc &middot; {t.published ? 'Published' : 'Draft'}
                      </p>
                    </div>
                    <Link href={`/studio/tutorial/${t.slug}`} className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-600 text-white text-sm hover:bg-cyan-500">
                      Sửa
                    </Link>
                    <Link href={`/tutorial/${t.slug}`} target="_blank" rel="noopener noreferrer" className="shrink-0 px-3 py-1.5 rounded-lg bg-white/10 text-cyan-300 text-sm hover:bg-white/20">
                      Xem
                    </Link>
                  </div>
                  <p className="text-sm text-gray-400 mt-2 line-clamp-2">{t.summary}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Courses */}
        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold">Courses (có lộ trình, có thanh toán)</h2>
            <Link href="/courses" className="text-xs text-cyan-300 hover:text-cyan-200">
              Student view
            </Link>
          </div>
          {loadingCourses ? (
            <p className="text-sm text-gray-400">Loading courses...</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-gray-400">No courses yet.</p>
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
                          <> &middot; {c.currency === 'USD' ? `$${c.price}` : `${(c.price ?? 0).toLocaleString('vi-VN')} ₫`}</>
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
