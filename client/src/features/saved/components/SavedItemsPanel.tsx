'use client'

import Link from 'next/link'
import { Heart, Trash2 } from 'lucide-react'
import { useSavedItems } from '@/features/saved/hooks/useSavedItems'
import { isLessonComplete, loadLessonCompletion } from '@/features/learning-path/public'
import { useAuthStore } from '@/features/auth/public'
import { useEffect, useMemo, useState } from 'react'
import type { SavedItem } from '@/features/saved/api/savedApi'

function sourceLabel(source: SavedItem['source']) {
  return source === 'learning-path' ? 'Lộ trình' : 'Khóa học'
}

export function SavedItemsPanel() {
  const { user } = useAuthStore()
  const { items, loading, remove } = useSavedItems()
  const [filter, setFilter] = useState<'all' | 'learning-path' | 'course'>('all')
  const [completion, setCompletion] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setCompletion(loadLessonCompletion(user?.id ?? null))
  }, [user?.id, items.length])

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((i) => i.source === filter)
  }, [items, filter])

  if (!user) {
    return (
      <div className="rounded-2xl border border-ds-border bg-ds-overlay p-8 text-center text-ds-muted text-sm">
        <Link href="/login?redirect=/dashboard/saved" className="text-ds-accent hover:underline">
          Đăng nhập
        </Link>{' '}
        để xem danh sách đã lưu.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Đã lưu</h1>
        <p className="text-sm text-ds-muted mt-1">
          Wishlist cá nhân — bài yêu thích từ lộ trình và khóa học để đọc lại sau.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'Tất cả'],
          ['learning-path', 'Lộ trình'],
          ['course', 'Khóa học'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className="rounded-full px-3 py-1.5 text-xs border transition-colors"
            style={{
              borderColor: filter === key ? 'rgba(126,231,255,0.45)' : 'rgba(255,255,255,0.1)',
              background: filter === key ? 'rgba(126,231,255,0.1)' : 'transparent',
              color: filter === key ? '#7ee7ff' : '#9aa8c4',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && filtered.length === 0 ? (
        <p className="text-sm text-ds-subtle">Đang tải…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-ds-border bg-ds-overlay p-8 text-center">
          <Heart className="mx-auto mb-3 text-ds-subtle" size={28} />
          <p className="text-sm text-ds-muted">Chưa có bài nào được lưu.</p>
          <p className="text-xs text-ds-subtle mt-2">
            Bấm <strong className="text-gray-300">Yêu thích</strong> trên bài lộ trình hoặc khóa học.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => {
            const lpDone =
              item.source === 'learning-path' && item.lessonId
                ? isLessonComplete(completion, item.lessonId)
                : false
            return (
              <li
                key={item.itemKey}
                className="rounded-xl border border-ds-border bg-ds-overlay p-4 flex flex-wrap items-start justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider text-ds-subtle px-2 py-0.5 rounded-full border border-ds-border">
                      {sourceLabel(item.source)}
                    </span>
                    {lpDone && (
                      <span className="text-[10px] text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
                        Đã hoàn thành
                      </span>
                    )}
                  </div>
                  <Link href={item.href} className="text-base font-medium text-white hover:text-ds-accent transition-colors">
                    {item.title || 'Bài học'}
                  </Link>
                  {item.subtitle ? (
                    <p className="text-xs text-ds-subtle mt-0.5 truncate">{item.subtitle}</p>
                  ) : null}
                  <p className="text-[10px] text-ds-subtle mt-2">
                    Lưu {new Date(item.savedAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(item.itemKey)}
                  className="inline-flex items-center gap-1 text-xs text-ds-subtle hover:text-red-300 transition-colors px-2 py-1"
                  title="Bỏ lưu"
                >
                  <Trash2 size={14} />
                  Bỏ lưu
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
