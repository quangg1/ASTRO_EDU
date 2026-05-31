'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath, hasAdminScope, isFullAdmin } from '@/lib/roles'
import {
  deleteUserPermanently,
  fetchAdminUsers,
  updateUserAdminScopes,
  updateUserRole,
  updateUserStatus,
  type AdminUser,
  type UserRole,
} from '@/features/admin/public'
import { AdminGate } from '@/components/admin/AdminShell'
import { PageHeader } from '@/components/ui/PageHeader'
import { Select, Button } from '@/design-system'
import { viText } from '@/messages/vi'
import {
  ADMIN_SCOPE_OPTIONS,
  formatAdminScopesSummary,
  labelAccountStatusVi,
  labelUserRoleVi,
} from '@/features/admin/lib/adminLabelsVi'

export default function AdminUsersPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all')
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [scopeEditorId, setScopeEditorId] = useState<string | null>(null)
  const [draftScopes, setDraftScopes] = useState<string[]>([])
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin/users')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  useEffect(() => {
    if (!user || !canAccessAdminPath(user, '/admin/users')) return
    setLoading(true)
    void fetchAdminUsers({ q, accountStatus: statusFilter, page, limit: 30 })
      .then((res) => {
        if (res.success && res.data) setUsers(res.data)
        else setUsers([])
        setTotal(res.total ?? 0)
      })
      .catch(() => setUsers([]))
      .finally(() => setLoading(false))
  }, [user, q, statusFilter, page])

  const handleRole = async (u: AdminUser, role: UserRole) => {
    setUpdatingId(u.id)
    const res = await updateUserRole(u.id, role)
    if (res.success && res.user) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, ...res.user! } : x)))
    }
    setUpdatingId(null)
  }

  const openScopeEditor = (u: AdminUser) => {
    setScopeEditorId(u.id)
    setDraftScopes(u.adminScopes || [])
  }

  const toggleDraftScope = (scopeId: string) => {
    setDraftScopes((prev) => (prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]))
  }

  const saveScopes = async (target: AdminUser) => {
    setUpdatingId(target.id)
    const res = await updateUserAdminScopes(target.id, draftScopes)
    if (res.success && res.user) {
      setUsers((prev) => prev.map((x) => (x.id === target.id ? { ...x, ...res.user! } : x)))
      setScopeEditorId(null)
    }
    setUpdatingId(null)
  }

  const handleStatusChange = async (u: AdminUser, nextStatus: 'active' | 'deactivated') => {
    if (u.accountStatus === nextStatus || u.id === user?.id) return
    const reason =
      nextStatus === 'deactivated'
        ? window.prompt('Lý do ngừng hoạt động tài khoản này:', u.deactivationReason || 'Ngừng hoạt động từ admin') || ''
        : ''
    setUpdatingId(u.id)
    setFeedback(null)
    const res = await updateUserStatus(u.id, nextStatus, reason)
    setUpdatingId(null)
    if (res.success && res.user) {
      setUsers((prev) => prev.map((x) => (x.id === u.id ? res.user! : x)))
      setFeedback({ kind: 'success', text: nextStatus === 'deactivated' ? 'Đã ngừng hoạt động tài khoản.' : 'Đã khôi phục tài khoản.' })
    } else {
      setFeedback({ kind: 'error', text: res.error || 'Cập nhật trạng thái thất bại.' })
    }
  }

  const handleDeleteUser = async (u: AdminUser) => {
    if (u.id === user?.id) return
    if (!u.email) {
      setFeedback({ kind: 'error', text: 'Tài khoản không có email — không thể xóa (cần gửi thông báo trước).' })
      return
    }
    const reason =
      window.prompt(
        'Lý do xóa vĩnh viễn (gửi cho người dùng qua email, tối thiểu 10 ký tự):',
        u.deactivationReason || '',
      ) || ''
    if (!reason.trim() || reason.trim().length < 10) {
      setFeedback({ kind: 'error', text: 'Cần nhập lý do ít nhất 10 ký tự.' })
      return
    }
    const ok = window.confirm(
      `XÓA VĨNH VIỄN «${u.email}»?\n\nEmail thông báo (kèm lý do) sẽ gửi trước. Không thể hoàn tác.`,
    )
    if (!ok) return
    const confirmEmail = window.prompt(`Nhập lại email để xác nhận:\n${u.email}`, '')
    if (!confirmEmail?.trim()) return
    setUpdatingId(u.id)
    setFeedback(null)
    const res = await deleteUserPermanently(u.id, confirmEmail.trim(), reason.trim())
    setUpdatingId(null)
    if (res.success) {
      setUsers((prev) => prev.filter((x) => x.id !== u.id))
      setTotal((prev) => Math.max(0, prev - 1))
      setFeedback({ kind: 'success', text: res.message || 'Đã xóa tài khoản vĩnh viễn.' })
    } else {
      setFeedback({ kind: 'error', text: res.error || 'Xóa tài khoản thất bại.' })
    }
  }

  return (
    <AdminGate checked={checked} allowed={Boolean(user && canAccessAdminPath(user, '/admin/users'))}>
      <PageHeader
        title="Người dùng"
        description="Tra cứu, đổi vai trò, ngừng hoạt động / xóa tài khoản. Thu hồi ghi danh & gem: mở chi tiết từng user."
      />
      {feedback ? (
        <p className={`text-sm mb-4 ${feedback.kind === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>{feedback.text}</p>
      ) : null}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => {
            setPage(1)
            setQ(e.target.value)
          }}
          placeholder="Tìm email hoặc tên…"
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white min-w-[200px]"
        />
        <Select value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value as typeof statusFilter) }} className="text-sm w-auto">
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="deactivated">Ngừng hoạt động</option>
        </Select>
      </div>

      {loading ? (
        <p className="text-gray-500">{viText.common.loading}</p>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[960px]">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-500 uppercase">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Phạm vi admin</th>
                  <th className="px-4 py-3">Thao tác</th>
                  <th className="px-4 py-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 align-top">
                    <td className="px-4 py-3 text-gray-300">{u.email || '—'}</td>
                    <td className="px-4 py-3 text-white">{u.displayName || '—'}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={(e) => void handleRole(u, e.target.value as UserRole)}
                        className="text-xs w-auto"
                      >
                        <option value="student">{labelUserRoleVi('student')}</option>
                        <option value="teacher">{labelUserRoleVi('teacher')}</option>
                        <option value="moderator">{labelUserRoleVi('moderator')}</option>
                        <option value="admin">{labelUserRoleVi('admin')}</option>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-300">{labelAccountStatusVi(u.accountStatus)}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 max-w-xs">
                      {u.role === 'admin' ? (
                        scopeEditorId === u.id && user && isFullAdmin(user) ? (
                          <div className="space-y-2">
                            <p className="text-[10px] text-gray-500">Bỏ trống = toàn quyền</p>
                            <div className="flex flex-wrap gap-1">
                              {ADMIN_SCOPE_OPTIONS.map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => toggleDraftScope(opt.id)}
                                  className={`rounded px-2 py-0.5 text-[10px] border ${
                                    draftScopes.includes(opt.id)
                                      ? 'border-cyan-400/50 bg-cyan-500/15 text-cyan-200'
                                      : 'border-white/10 text-gray-500'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button type="button" className="text-xs py-1 px-2" onClick={() => void saveScopes(u)}>
                                Lưu
                              </Button>
                              <Button type="button" variant="ghost" className="text-xs py-1 px-2" onClick={() => setScopeEditorId(null)}>
                                Huỷ
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <p>{formatAdminScopesSummary(u.adminScopes)}</p>
                            {user && isFullAdmin(user) && u.id !== user.id ? (
                              <button type="button" className="text-cyan-400 hover:underline" onClick={() => openScopeEditor(u)}>
                                Chỉnh phạm vi
                              </button>
                            ) : null}
                          </div>
                        )
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleStatusChange(u, u.accountStatus === 'active' ? 'deactivated' : 'active')}
                          disabled={updatingId === u.id || u.id === user?.id}
                          className={`text-xs rounded-lg px-2 py-1.5 border disabled:opacity-50 w-fit ${
                            u.accountStatus === 'active'
                              ? 'border-red-500/30 bg-red-500/10 text-red-200'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                          }`}
                        >
                          {u.accountStatus === 'active' ? 'Ngừng hoạt động' : 'Khôi phục'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteUser(u)}
                          disabled={updatingId === u.id || u.id === user?.id}
                          className="text-xs rounded-lg px-2 py-1.5 border border-red-600/50 bg-red-950/40 text-red-300 hover:bg-red-900/50 disabled:opacity-50 w-fit"
                        >
                          Xóa vĩnh viễn
                        </button>
                        {u.deactivationReason ? (
                          <p className="text-[11px] text-gray-500 max-w-[220px]">{u.deactivationReason}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {hasAdminScope(user, 'users') ? (
                        <Link href={`/admin/users/${u.id}`} className="text-cyan-400 hover:underline text-xs">
                          Ghi danh / gem →
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
            <span>{total} người dùng</span>
            <div className="flex gap-2">
              <Button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Trước</Button>
              <span className="px-2 py-1">Trang {page}</span>
              <Button type="button" disabled={page * 30 >= total} onClick={() => setPage((p) => p + 1)}>Sau</Button>
            </div>
          </div>
        </>
      )}
    </AdminGate>
  )
}
