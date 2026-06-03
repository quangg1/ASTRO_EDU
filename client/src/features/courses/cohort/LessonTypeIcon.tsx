'use client'

import {
  Box,
  ClipboardList,
  FileText,
  HelpCircle,
  Radio,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'

export type LessonTypeKey =
  | 'text'
  | 'visualization'
  | 'quiz'
  | 'assignment'
  | 'live_session'
  | string

const TYPE_META: Record<
  string,
  { Icon: LucideIcon; label: string; className: string }
> = {
  text: { Icon: FileText, label: 'Bài đọc', className: 'text-sky-300 bg-sky-950/40 border-sky-500/30' },
  visualization: {
    Icon: Box,
    label: '3D / Mô phỏng',
    className: 'text-ds-accent bg-violet-950/40 border-violet-500/30',
  },
  quiz: { Icon: HelpCircle, label: 'Quiz', className: 'text-amber-300 bg-amber-950/40 border-amber-500/30' },
  assignment: {
    Icon: ClipboardList,
    label: 'Bài tập',
    className: 'text-fuchsia-300 bg-fuchsia-950/40 border-fuchsia-500/30',
  },
  live_session: {
    Icon: Radio,
    label: 'Live',
    className: 'text-ds-accent bg-cyan-950/40 border-cyan-500/30',
  },
}

/** Video-style icon when lesson has videoUrl (catalog/studio hint). */
export function lessonTypeIconKey(lesson: {
  type?: string
  videoUrl?: string | null
}): LessonTypeKey {
  if (lesson.videoUrl) return 'video'
  return lesson.type || 'text'
}

function metaFor(type: string) {
  if (type === 'video') {
    return { Icon: Video, label: 'Video', className: 'text-rose-300 bg-rose-950/40 border-rose-500/30' }
  }
  return TYPE_META[type] || TYPE_META.text
}

export function LessonTypeIcon({
  type,
  size = 'sm',
  showLabel = false,
  className,
}: {
  type: string
  size?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
  className?: string
}) {
  const meta = metaFor(type)
  const Icon = meta.Icon
  const dim = size === 'xs' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'
  const pad = size === 'xs' ? 'p-0.5' : size === 'md' ? 'p-1.5' : 'p-1'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 shrink-0 rounded border',
        pad,
        meta.className,
        className,
      )}
      title={meta.label}
    >
      <Icon className={dim} aria-hidden />
      {showLabel && <span className="text-[9px] font-medium uppercase tracking-wide">{meta.label}</span>}
    </span>
  )
}
