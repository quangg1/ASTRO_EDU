'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { fetchCourses, type Course } from '@/lib/coursesApi'

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loadingCourses, setLoadingCourses] = useState(true)

  useEffect(() => {
    fetchCourses()
      .then((data) => setCourses(data))
      .finally(() => setLoadingCourses(false))
  }, [])

  const featured = useMemo(() => courses.slice(0, 4), [courses])
  const continueCourse = useMemo(() => courses[0] ?? null, [courses])

  const learningTracks = [
    { name: 'Lịch sử Trái Đất', subtitle: '4.6 tỷ năm tiến hóa', color: 'from-cyan-500/70 to-blue-600/70', href: '/courses/lich-su-trai-dat' },
    { name: 'Hệ Mặt Trời', subtitle: 'Hành tinh và quỹ đạo', color: 'from-orange-500/70 to-amber-600/70', href: '/courses/he-mat-troi' },
    { name: 'Milky Way', subtitle: 'Khám phá thiên hà', color: 'from-purple-500/70 to-indigo-600/70', href: '/courses/milky-way' },
    { name: 'Mô phỏng 3D', subtitle: 'Tương tác thời gian thực', color: 'from-emerald-500/70 to-teal-600/70', href: '/explore' },
  ]

  return (
    <main className="relative min-h-screen overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/nebula-home.jpg"
          alt="Nebula and stars"
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-[#020712]/85 to-black/90" />
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-24 left-20 w-24 h-24 rounded-full bg-cyan-500/25 blur-2xl animate-pulse" />
          <div className="absolute top-40 right-28 w-28 h-28 rounded-full bg-purple-500/20 blur-2xl animate-pulse" />
          <div className="absolute bottom-24 left-1/3 w-32 h-32 rounded-full bg-blue-500/15 blur-3xl animate-pulse" />
        </div>
      </div>

      <div className="relative z-10 min-h-screen pt-16 px-4 pb-10">
        <div className="max-w-7xl mx-auto space-y-5">
          <section className="glass rounded-2xl border border-cyan-500/20 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              <div className="p-6 md:p-8 bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-purple-500/20">
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">Learning Catalog</p>
                <h1 className="mt-2 text-3xl md:text-4xl font-bold text-white leading-tight">
                  Landing page bản Pro cho student
                </h1>
                <p className="mt-3 text-gray-200 max-w-3xl">
                  Học theo lộ trình rõ ràng, nội dung giàu trực quan, mô phỏng 3D nhúng trong bài và trải nghiệm học tập chuẩn nền tảng quốc tế.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/courses" className="px-5 py-2.5 rounded-xl bg-cyan-500 text-white font-semibold hover:bg-cyan-400 transition-colors">
                    Bắt đầu học ngay
                  </Link>
                  <Link href="/explore" className="px-5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-colors">
                    Trải nghiệm 3D Universe
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-2 px-4 py-4 border-t lg:border-t-0 lg:border-l border-white/10 bg-black/30">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-3">
                    <p className="text-gray-400 text-xs">Khóa học đang mở</p>
                    <p className="text-white font-medium">{courses.length || 0} khóa</p>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-3">
                    <p className="text-gray-400 text-xs">Định dạng</p>
                    <p className="text-white font-medium">Video · Slide · 3D</p>
                  </div>
                  <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-3">
                    <p className="text-gray-400 text-xs">Chủ đề</p>
                    <p className="text-white font-medium">Cosmic Mystery</p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-4">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Tiếp tục học</p>
                  {continueCourse ? (
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-white font-medium">{continueCourse.title}</p>
                        <p className="text-sm text-gray-400 line-clamp-1">{continueCourse.description}</p>
                      </div>
                      <Link
                        href={`/courses/${continueCourse.slug}`}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-cyan-500 text-white text-sm hover:bg-cyan-400 transition-colors"
                      >
                        Học tiếp
                      </Link>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-400">Đang tải danh sách khóa học...</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="glass rounded-2xl p-4 border border-cyan-500/15">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">Lộ trình nổi bật</h2>
              <Link href="/courses" className="text-xs text-cyan-300 hover:text-cyan-200">Xem tất cả</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {learningTracks.map((c) => (
                <Link
                  key={c.name}
                  href={c.href}
                  className={`rounded-xl border border-white/10 bg-gradient-to-r ${c.color} p-4 text-white hover:scale-[1.02] transition-transform`}
                >
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-white/80 mt-1">{c.subtitle}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="glass rounded-2xl p-4 border border-cyan-500/15">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold">Khóa học dành cho bạn</h2>
              <Link href="/courses" className="text-xs text-cyan-300 hover:text-cyan-200">Mở catalog</Link>
            </div>
            {loadingCourses ? (
              <p className="text-sm text-gray-400">Đang tải khóa học...</p>
            ) : featured.length === 0 ? (
              <p className="text-sm text-gray-400">Chưa có khóa học để hiển thị.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {featured.map((c) => (
                  <Link
                    key={c.id}
                    href={`/courses/${c.slug}`}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-cyan-500/10 hover:border-cyan-400/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-semibold text-white">{c.title}</h3>
                      <span className="text-[10px] px-2 py-1 rounded-full bg-cyan-500/20 border border-cyan-400/30 text-cyan-200">
                        {c.level}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 line-clamp-2">{c.description}</p>
                    <p className="text-xs text-gray-500 mt-3">{c.lessonCount ?? 0} bài học</p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-4 border border-white/10">
              <p className="text-cyan-300 text-sm font-semibold">Immersive Learning</p>
              <p className="mt-2 text-sm text-gray-300">Bài học kiểu slide, dễ tiếp thu thay vì tường chữ dài.</p>
            </div>
            <div className="glass rounded-2xl p-4 border border-white/10">
              <p className="text-cyan-300 text-sm font-semibold">3D Integrated</p>
              <p className="mt-2 text-sm text-gray-300">Mô phỏng 3D được nhúng trực tiếp vào bài học chính.</p>
            </div>
            <div className="glass rounded-2xl p-4 border border-white/10">
              <p className="text-cyan-300 text-sm font-semibold">Media-Rich Modules</p>
              <p className="mt-2 text-sm text-gray-300">Video, hình ảnh trích từ PDF và tài nguyên mở rộng theo chủ đề.</p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
