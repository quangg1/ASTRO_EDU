'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchTutorialsForEditor, type Tutorial } from '@/lib/tutorialsApi'
import { useAuthStore } from '@/store/useAuthStore'

export default function StudioTutorialListPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [tutorials, setTutorials] = useState<Tutorial[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/studio/tutorial')
    if (checked && user && user.role !== 'teacher' && user.role !== 'admin') router.replace('/studio')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    fetchTutorialsForEditor().then((d) => {
      setTutorials(d.tutorials)
      setLoading(false)
    })
  }, [user])

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Đang kiểm tra...</div>
  }

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-10">
      <main className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link href="/studio" className="text-sm text-cyan-400 hover:text-cyan-300">← Studio</Link>
          <h1 className="text-xl font-bold text-white">Tutorial Studio</h1>
          <Link
            href="/studio/tutorial/new"
            className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-500"
          >
            + Bài mới
          </Link>
        </div>
        {loading ? (
          <p className="text-gray-500">Đang tải...</p>
        ) : tutorials.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0a0f17] p-8 text-center">
            <p className="text-gray-400 mb-4">Chưa có tutorial nào.</p>
            <Link href="/studio/tutorial/new" className="text-cyan-400 hover:text-cyan-300">
              Tạo bài đầu tiên
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tutorials.map((t) => (
              <div
                key={t._id}
                className="rounded-xl border border-white/10 bg-[#0a0f17] p-4 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-white truncate">{t.title}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{t.slug} · {t.readTime} phút · {t.published ? 'Đã xuất bản' : 'Bản nháp'}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/tutorial/${t.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-gray-400 hover:bg-white/10"
                  >
                    Xem
                  </Link>
                  <Link
                    href={`/studio/tutorial/${t.slug}`}
                    className="px-3 py-1.5 rounded-lg text-xs bg-cyan-600 text-white hover:bg-cyan-500"
                  >
                    Sửa
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
