'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { canAccessAdmin, canAccessAdminPath } from '@/lib/roles'
import { sendAdminBroadcast, type BroadcastRole } from '@/features/admin/public'
import { Button, Card, Input, Textarea } from '@/design-system'
import { PageHeader } from '@/components/ui/PageHeader'

const ROLE_OPTIONS: { id: BroadcastRole; label: string }[] = [
  { id: 'student', label: 'Học viên' },
  { id: 'teacher', label: 'Giảng viên' },
  { id: 'moderator', label: 'Điều hành viên' },
  { id: 'admin', label: 'Quản trị' },
]

export default function AdminBroadcastPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [titleVi, setTitleVi] = useState('')
  const [bodyVi, setBodyVi] = useState('')
  const [href, setHref] = useState('')
  const [targetAll, setTargetAll] = useState(true)
  const [roles, setRoles] = useState<BroadcastRole[]>([])
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    if (checked && !user) router.replace('/login?redirect=/admin/broadcast')
    if (checked && user && !canAccessAdmin(user)) router.replace('/')
  }, [checked, user, router])

  const toggleRole = (role: BroadcastRole) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!titleVi.trim()) {
      setMessage({ type: 'err', text: 'Nhập tiêu đề thông báo.' })
      return
    }
    if (!targetAll && roles.length === 0) {
      setMessage({ type: 'err', text: 'Chọn ít nhất một nhóm vai trò hoặc gửi tất cả.' })
      return
    }
    setSending(true)
    setMessage(null)
    const res = await sendAdminBroadcast({
      titleVi: titleVi.trim(),
      bodyVi: bodyVi.trim(),
      href: href.trim() || undefined,
      roles: targetAll ? null : roles,
    })
    setSending(false)
    if (res.success) {
      setMessage({
        type: 'ok',
        text: `Đã gửi tới ${res.recipientCount ?? 0} người dùng.`,
      })
      setTitleVi('')
      setBodyVi('')
      setHref('')
    } else {
      setMessage({ type: 'err', text: res.error || 'Lỗi gửi' })
    }
  }

  if (!checked || !user || !canAccessAdminPath(user, '/admin/broadcast')) {
    return (
      <div className="min-h-screen bg-ds-base flex items-center justify-center text-ds-muted">
        Đang kiểm tra quyền…
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ds-base text-ds-text">
      <main className="pt-20 px-4 sm:px-6 pb-12 max-w-2xl mx-auto">
        <Link href="/admin" className="text-sm text-cyan-400 hover:underline">
          ← Quản trị
        </Link>
        <PageHeader
          className="mt-4"
          title="Gửi thông báo hệ thống"
          description="Broadcast tới mọi người hoặc theo vai trò. Người nhận thấy trong chuông thông báo."
        />

        <Card className="p-6 mt-6 border border-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-ds-muted uppercase tracking-wide">Tiêu đề *</label>
              <Input
                value={titleVi}
                onChange={(e) => setTitleVi(e.target.value)}
                placeholder="VD: Bảo trì hệ thống tối nay"
                className="mt-1"
                maxLength={200}
              />
            </div>
            <div>
              <label className="text-xs text-ds-muted uppercase tracking-wide">Nội dung</label>
              <Textarea
                value={bodyVi}
                onChange={(e) => setBodyVi(e.target.value)}
                placeholder="Chi tiết (tuỳ chọn)"
                className="mt-1 min-h-[100px]"
                maxLength={2000}
              />
            </div>
            <div>
              <label className="text-xs text-ds-muted uppercase tracking-wide">Liên kết (tuỳ chọn)</label>
              <Input
                value={href}
                onChange={(e) => setHref(e.target.value)}
                placeholder="/courses hoặc https://…"
                className="mt-1"
              />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs text-ds-muted uppercase tracking-wide">Đối tượng</legend>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="target"
                  checked={targetAll}
                  onChange={() => setTargetAll(true)}
                  className="accent-cyan-500"
                />
                Tất cả người dùng đang hoạt động
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="radio"
                  name="target"
                  checked={!targetAll}
                  onChange={() => setTargetAll(false)}
                  className="accent-cyan-500"
                />
                Theo vai trò
              </label>
              {!targetAll && (
                <div className="flex flex-wrap gap-2 pl-6 pt-1">
                  {ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleRole(opt.id)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        roles.includes(opt.id)
                          ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-100'
                          : 'border-white/15 text-ds-muted hover:border-white/30'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </fieldset>

            {message && (
              <p
                className={`text-sm rounded-lg px-3 py-2 ${
                  message.type === 'ok'
                    ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30'
                    : 'bg-red-500/15 text-red-200 border border-red-500/30'
                }`}
              >
                {message.text}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <Button type="submit" disabled={sending}>
                {sending ? 'Đang gửi…' : 'Gửi thông báo'}
              </Button>
              <Link href="/admin" className="text-sm text-ds-muted hover:text-ds-text self-center">
                Huỷ
              </Link>
            </div>
          </form>
        </Card>
      </main>
    </div>
  )
}
