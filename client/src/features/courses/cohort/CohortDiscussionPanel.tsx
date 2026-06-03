'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { fetchCohortDiscussion } from '@/features/courses/api/cohortApi'
import { Button } from '@/design-system'

export function CohortDiscussionPanel({
  courseSlug,
  cohortId,
}: {
  courseSlug: string
  cohortId: string
}) {
  const [forumSlug, setForumSlug] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchCohortDiscussion(courseSlug, cohortId).then((res) => {
      if (res.success && res.data?.slug) {
        setForumSlug(res.data.slug)
        setTitle(res.data.title)
        setError(null)
      } else {
        setError(res.error || 'Không tải được thảo luận')
      }
    })
  }, [courseSlug, cohortId])

  if (error) {
    return <p className="text-sm text-red-400 p-4">{error}</p>
  }

  if (!forumSlug) {
    return <p className="text-sm text-ds-muted p-4">Đang mở diễn đàn lớp…</p>
  }

  return (
    <div className="rounded-2xl border border-ds-border/80 bg-gradient-to-b from-cyan-950/20 to-ds-overlay p-8 text-center space-y-4">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30">
        <MessageCircle className="w-7 h-7 text-ds-accent" aria-hidden />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">{title || 'Thảo luận lớp'}</h2>
        <p className="text-sm text-ds-muted mt-2 max-w-md mx-auto">
          Diễn đàn riêng cho học viên và giáo viên trong lớp — đặt câu hỏi, chia sẻ ghi chú theo từng buổi học.
        </p>
      </div>
      <Link href={`/community/${forumSlug}`}>
        <Button type="button" className="bg-cyan-600 text-white hover:opacity-90">
          Vào thảo luận
        </Button>
      </Link>
    </div>
  )
}
