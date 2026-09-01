'use client'

import Link from 'next/link'
import type { Post } from '@/features/community/api/communityApi'
import { newsPostHref, newsPostOpensNewTab } from '@/features/community/lib/postContent'
import { recordPostSourceOpen } from '@/features/community/lib/postEngagement'

type Props = {
  post: Post
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}

/** Tin link-out: mở sourceUrl trong tab mới; còn lại: trang chi tiết trong app. */
export function NewsCardLink({ post, className, style, children }: Props) {
  const href = newsPostHref(post)
  if (newsPostOpensNewTab(post)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
        onClick={() => {
          void recordPostSourceOpen(post._id)
        }}
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  )
}
