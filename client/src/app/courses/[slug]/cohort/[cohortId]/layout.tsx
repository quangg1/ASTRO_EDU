'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useAuthStore } from '@/features/auth/public'
import { fetchCohortSyllabus } from '@/features/courses/public'
import { Button } from '@/design-system'

export default function CohortLayout({ children }: { children: React.ReactNode }) {
  const { slug, cohortId } = useParams() as { slug: string; cohortId: string }
  const router = useRouter()
  const { user, checked } = useAuthStore()
  const [gate, setGate] = useState<'loading' | 'ok' | 'denied'>('loading')
  const [denyMsg, setDenyMsg] = useState<string | null>(null)
  const accessKeyRef = useRef('')
  const hadAccessRef = useRef(false)

  useEffect(() => {
    if (!checked) return
    if (!user) {
      router.replace(`/login?redirect=/courses/${slug}/cohort/${cohortId}`)
      return
    }
    const key = `${slug}:${cohortId}:${user.id}`
    if (accessKeyRef.current === key && hadAccessRef.current) {
      setGate('ok')
      return
    }
    accessKeyRef.current = key
    if (!hadAccessRef.current) setGate('loading')

    void fetchCohortSyllabus(slug, cohortId).then((res) => {
      if (res.success) {
        hadAccessRef.current = true
        setGate('ok')
        return
      }
      if (hadAccessRef.current) return
      setGate('denied')
      setDenyMsg(res.error || 'Chưa tham gia lớp học này')
    })
  }, [checked, user?.id, slug, cohortId, router])

  if (!checked || !user) return null

  if (gate === 'loading' && !hadAccessRef.current) {
    return <p className="p-8 text-ds-muted text-center">Đang xác minh quyền lớp…</p>
  }

  if (gate === 'denied' && !hadAccessRef.current) {
    const isStaff = user?.role === 'teacher' || user?.role === 'admin'
    return (
      <div className="p-8 max-w-md mx-auto space-y-4 text-center">
        <p className="text-red-400">{denyMsg}</p>
        {isStaff ? (
          <p className="text-sm text-ds-muted">
            Giáo viên chỉnh lịch và chấm bài trong Studio → Lớp học theo kỳ, không qua trang học viên.
          </p>
        ) : (
          <p className="text-sm text-ds-muted">Đăng ký lớp trên trang khóa học — mã lớp gửi qua email.</p>
        )}
        {isStaff ? (
          <Button type="button" onClick={() => router.push(`/studio/${slug}/cohorts`)}>
            Quản lý lớp (Studio)
          </Button>
        ) : (
          <Button type="button" onClick={() => router.push(`/courses/${slug}`)}>
            Về trang khóa học
          </Button>
        )}
        <Link
          href={isStaff ? `/studio/${slug}/cohorts` : `/courses/${slug}`}
          className="block text-xs text-ds-accent"
        >
          ← Quay lại
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
