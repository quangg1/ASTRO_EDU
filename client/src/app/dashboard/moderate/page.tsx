'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gavel } from 'lucide-react'
import { useAuthStore } from '@/features/auth/public'
import { canModerate } from '@/lib/roles'
import { ModerationQueuePanel } from '@/components/community/moderation/ModerationQueuePanel'

export default function ModerateHubPage() {
  const router = useRouter()
  const { user, checked } = useAuthStore()

  useEffect(() => {
    if (!checked) return
    if (!user) {
      router.replace('/login?redirect=/dashboard/moderate')
      return
    }
    if (!canModerate(user)) {
      router.replace('/dashboard')
    }
  }, [checked, user, router])

  if (!checked || !user || !canModerate(user)) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500 text-sm">Đang tải…</div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-violet-200">
          <Gavel className="w-3.5 h-3.5" aria-hidden />
          Moderator · chỉ diễn đàn
        </div>
        <h1 className="text-2xl font-semibold text-white">Hàng đợi kiểm duyệt</h1>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Xử lý báo cáo từ cộng đồng: cảnh báo tác giả, ẩn hoặc xóa nội dung. Bạn không có quyền billing, analytics hay
          Studio — các mục đó thuộc admin / giáo viên.
        </p>
        <Link href="/community" className="text-sm text-cyan-400 hover:underline">
          ← Duyệt thủ công trên diễn đàn
        </Link>
      </header>

      <ModerationQueuePanel />
    </div>
  )
}
