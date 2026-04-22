'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Gavel, MessageCircle, Newspaper, Pin, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { canModerate } from '@/lib/roles'

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
          Điều hành viên cộng đồng
        </div>
        <h1 className="text-2xl font-semibold text-white">Kiểm duyệt diễn đàn</h1>
        <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
          Bạn có thể ghim hoặc gỡ bài viết không phù hợp trên các diễn đàn công khai. Mở một bài viết để thấy các nút <strong className="text-slate-300 font-medium">Ghim</strong> và{' '}
          <strong className="text-slate-300 font-medium">Xóa bài</strong> khi cần.
        </p>
      </header>

      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          <Link
            href="/community/tin-thien-van"
            className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-violet-500/35 hover:bg-white/[0.05]"
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/25">
              <Newspaper className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-medium text-white group-hover:text-violet-100">Tin thiên văn</span>
            <span className="mt-1 text-sm text-slate-500">Diễn đàn tin và cập nhật — kiểm duyệt bài đăng tại đây.</span>
          </Link>
        </li>
        <li>
          <Link
            href="/community"
            className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-cyan-500/35 hover:bg-white/[0.05]"
          >
            <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/25">
              <MessageCircle className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-medium text-white group-hover:text-cyan-100">Tất cả diễn đàn</span>
            <span className="mt-1 text-sm text-slate-500">Chọn khu vực khác nếu cần duyệt bài ngoài mục tin.</span>
          </Link>
        </li>
      </ul>

      <section className="rounded-2xl border border-white/8 bg-black/20 p-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gợi ý thao tác</p>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex gap-2">
            <Pin className="w-4 h-4 shrink-0 text-amber-400/90 mt-0.5" aria-hidden />
            <span>
              <strong className="text-slate-300">Ghim</strong> — đưa bài quan trọng lên đầu danh sách trong diễn đàn đó.
            </span>
          </li>
          <li className="flex gap-2">
            <Trash2 className="w-4 h-4 shrink-0 text-red-400/90 mt-0.5" aria-hidden />
            <span>
              <strong className="text-slate-300">Xóa bài</strong> — chỉ khi vi phạm nội quy; hành động không thể hoàn tác qua giao diện này.
            </span>
          </li>
        </ul>
      </section>
    </div>
  )
}
