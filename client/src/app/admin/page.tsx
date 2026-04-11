'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { fetchAdminUsers, updateUserRole, type AdminUser, type UserRole } from '@/lib/authApi'
import { fetchCourses } from '@/lib/coursesApi'
import { fetchAdminOrderStats, type AdminOrderStats, type Order } from '@/lib/paymentsApi'

export default function AdminPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [courseCount, setCourseCount] = useState<number | null>(null)
  const [orderStats, setOrderStats] = useState<AdminOrderStats | null>(null)
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [message, setMessage] = useState<'success' | 'error' | null>(null)

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin')
    if (checked && user && user.role !== 'admin') router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user) return
    if (user.role !== 'admin') return
    Promise.all([fetchAdminUsers(), fetchCourses(), fetchAdminOrderStats()])
      .then(([uRes, courses, orderOverview]) => {
        if (uRes.success && uRes.data) setUsers(uRes.data)
        else setError(uRes.error || '')
        setMessage(null)
        setCourseCount(courses.length)
        setOrderStats(orderOverview.stats)
        setRecentOrders(orderOverview.orders)
      })
      .finally(() => setLoading(false))
  }, [user])

  if (!checked || !user) {
    return <div className="min-h-screen bg-black pt-20 px-4 text-gray-400">Checking...</div>
  }

  if (user.role !== 'admin') {
    return null
  }

  const handleRoleChange = async (u: AdminUser, newRole: UserRole) => {
    if (u.role === newRole) return
    setUpdatingId(u.id)
    setMessage(null)
    setError('')
    const res = await updateUserRole(u.id, newRole)
    setUpdatingId(null)
    if (res.success && res.user) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: res.user!.role } : x)))
      setMessage('success')
    } else {
      setError(res.error || '')
      setMessage('error')
    }
  }

  return (
    <div className="min-h-screen bg-black pt-16 px-4 pb-12">
      <main className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300">← Home</Link>
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-white/10 bg-[#0a0f17] p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Users</p>
            <p className="text-2xl font-bold text-white mt-1">{loading ? '...' : users.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a0f17] p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Courses</p>
            <p className="text-2xl font-bold text-white mt-1">{courseCount ?? '...'}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a0f17] p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Orders</p>
            <p className="text-2xl font-bold text-white mt-1">
              {orderStats ? orderStats.totalOrders : '...'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-[#0a0f17] p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Revenue (VND)</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">
              {orderStats ? orderStats.totalRevenue.toLocaleString('en-US') : '...'}
            </p>
          </div>
          <Link href="/studio" className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4 hover:bg-cyan-500/20 transition-colors">
            <p className="text-xs text-cyan-300 uppercase tracking-wider">Studio</p>
            <p className="text-white font-medium mt-1">Open Studio →</p>
          </Link>
        </div>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden mb-8">
          <div className="px-4 py-3 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h2 className="font-semibold text-white">Users</h2>
            <div className="flex flex-wrap items-center gap-2">
              {message === 'success' && <span className="text-sm text-green-400">Role updated. The user must sign in again for changes to take effect.</span>}
              {message === 'error' && error && <span className="text-sm text-red-400">{error}</span>}
            </div>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Change role</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Joined</th>
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
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                          disabled={updatingId === u.id || u.id === user?.id}
                          className="text-xs rounded-lg bg-black/50 border border-white/15 text-white px-2 py-1.5 focus:border-cyan-500/50 focus:outline-none disabled:opacity-50"
                        >
                          <option value="student">student</option>
                          <option value="teacher">teacher</option>
                          <option value="moderator">moderator</option>
                          <option value="admin">admin</option>
                        </select>
                        {u.id === user?.id && <span className="ml-1 text-xs text-gray-500">(you)</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-US') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#0a0f17] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-semibold text-white">Recent orders</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : recentOrders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No orders yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                    <th className="px-4 py-3">Course</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o._id} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 text-cyan-300">{o.courseSlug}</td>
                      <td className="px-4 py-3 text-gray-200">
                        {o.currency === 'USD'
                          ? `$${o.amount.toFixed(2)}`
                          : `${o.amount.toLocaleString('en-US')} ₫`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            o.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : o.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(o.createdAt).toLocaleString('en-US')}
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
