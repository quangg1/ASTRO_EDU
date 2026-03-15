'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchAdminUsers, type AdminUser } from '@/lib/authApi'
import { fetchCourses } from '@/lib/coursesApi'

export default function AdminPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [courseCount, setCourseCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin')
    if (checked && user && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') return
    Promise.all([fetchAdminUsers(), fetchCourses()])
      .then(([uRes, courses]) => {
        if (uRes.success && uRes.data) setUsers(uRes.data)
        else setError(uRes.error || '')
        setCourseCount(courses.length)
      })
      .finally(() => setLoading(false))
  }, [user])

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Đang kiểm tra...</div>
  }

  if (user.role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-12">
      <main className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300">← Về trang chủ</Link>
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-white/10 bg-[#0a0f17] p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Người dùng</p>
            <p className="text-2xl font-bold text-white mt-1">{loading ? '...' : users.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a0f17] p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Khóa học</p>
            <p className="text-2xl font-bold text-white mt-1">{courseCount ?? '...'}</p>
          </div>
          <Link href="/studio" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 hover:bg-cyan-500/20 transition-colors">
            <p className="text-xs text-cyan-300 uppercase tracking-wider">Studio</p>
            <p className="text-white font-medium mt-1">Mở Studio →</p>
          </Link>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-white">Danh sách người dùng</h2>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Đang tải...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tên</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Vai trò</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Đăng ký</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 text-sm text-gray-300">{u.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-white">{u.displayName || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : u.role === 'teacher' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-white/10 text-gray-400'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
