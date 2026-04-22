'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import {
  fetchMyTeacherApplicationStatus,
  submitTeacherApplication,
  type TeacherApplication,
} from '@/lib/authApi'

const BIO_MIN = 30

export default function ApplyTeacherPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<TeacherApplication | null>(null)
  const [last, setLast] = useState<TeacherApplication | null>(null)
  const [bio, setBio] = useState('')
  const [organization, setOrganization] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<'ok' | 'err' | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!checked) return
    if (!user) {
      router.replace('/login?redirect=/apply-teacher')
      return
    }
    if (user.role === 'teacher' || user.role === 'admin') {
      router.replace('/studio')
      return
    }
    if (user.role !== 'student') {
      router.replace('/dashboard')
      return
    }
    let cancelled = false
    setLoading(true)
    fetchMyTeacherApplicationStatus().then((res) => {
      if (cancelled) return
      setLoading(false)
      if (res.success) {
        setPending(res.pending ?? null)
        setLast(res.last ?? null)
      }
    })
    return () => {
      cancelled = true
    }
  }, [checked, user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError('')
    if (bio.trim().length < BIO_MIN) {
      setMessage('err')
      setError(`Nội dung giới thiệu cần ít nhất ${BIO_MIN} ký tự.`)
      return
    }
    setSubmitting(true)
    const res = await submitTeacherApplication({ bio: bio.trim(), organization: organization.trim() })
    setSubmitting(false)
    if (res.success && res.application) {
      setMessage('ok')
      setPending(res.application)
      setBio('')
      setOrganization('')
    } else {
      setMessage('err')
      setError(res.error || 'Không gửi được đơn')
    }
  }

  if (!checked || !user || loading) {
    return (
      <div className="min-h-screen bg-[#070a10] pt-24 px-4 flex items-center justify-center text-slate-500 text-sm">
        Đang tải…
      </div>
    )
  }

  if (user.role !== 'student') {
    return null
  }

  return (
    <div className="min-h-screen bg-[#070a10] pt-20 px-4 pb-16">
      <main className="max-w-lg mx-auto">
        <Link href="/dashboard" className="text-sm text-cyan-400 hover:text-cyan-300 mb-6 inline-block">
          ← Bảng điều khiển
        </Link>
        <h1 className="text-2xl font-semibold text-white mt-2 mb-2">Xin quyền giảng viên</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Sau khi được duyệt, bạn có thể tạo và quản lý nội dung trong Studio. Quản trị viên xem đơn và có thể gán quyền trực tiếp trong bảng quản trị nếu cần.
        </p>

        {pending ? (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 text-amber-100/95 text-sm">
            <p className="font-medium text-white mb-1">Đơn của bạn đang chờ duyệt</p>
            <p className="text-amber-200/80">
              Gửi lúc {new Date(pending.createdAt).toLocaleString('vi-VN')}. Sau khi được duyệt, mở lại tab hoặc tải trang — hệ thống sẽ cập nhật vai trò giảng viên tự động.
            </p>
          </div>
        ) : last?.status === 'rejected' ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 mb-6 text-sm text-red-200/90">
            <p className="font-medium text-white mb-1">Đơn trước đã bị từ chối</p>
            {last.reviewNote ? <p className="text-red-200/70">{last.reviewNote}</p> : null}
            <p className="text-slate-400 mt-2">Bạn có thể gửi đơn mới bên dưới.</p>
          </div>
        ) : null}

        {!pending && (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">
                Giới thiệu và lý do muốn giảng dạy <span className="text-red-400">*</span>
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={8}
                required
                className="w-full rounded-xl bg-black/40 border border-white/15 text-white placeholder-slate-600 px-4 py-3 text-sm focus:border-cyan-500/50 focus:outline-none resize-y min-h-[160px]"
                placeholder={`Tối thiểu ${BIO_MIN} ký tự: kinh nghiệm, chủ đề bạn muốn dạy, liên kết công khai (nếu có)...`}
              />
              <p className="text-[11px] text-slate-500 mt-1">{bio.trim().length} / tối thiểu {BIO_MIN} ký tự</p>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Cơ quan / trường (tuỳ chọn)</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="w-full rounded-xl bg-black/40 border border-white/15 text-white px-4 py-2.5 text-sm focus:border-cyan-500/50 focus:outline-none"
                placeholder="Ví dụ: Trường THPT…"
              />
            </div>
            {message === 'ok' && <p className="text-sm text-emerald-400">Đã gửi đơn. Cảm ơn bạn!</p>}
            {message === 'err' && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !!pending}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 text-white font-medium hover:from-cyan-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Đang gửi…' : 'Gửi đơn'}
            </button>
          </form>
        )}
      </main>
    </div>
  )
}
