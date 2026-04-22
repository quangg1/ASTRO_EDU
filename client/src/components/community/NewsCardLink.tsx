'use client'

import Link from 'next/link'
import type { Post } from '@/lib/communityApi'
import { newsPostHref, newsPostOpensNewTab } from '@/lib/postContent'
import { recordPostSourceOpen } from '@/lib/postEngagement'

type Props = {
  post: Post
  className?: string
  children: React.ReactNode
}

/** Tin link-out: mở sourceUrl trong tab mới; còn lại: trang chi tiết trong app. */
export function NewsCardLink({ post, className, children }: Props) {
  const href = newsPostHref(post)
  if (newsPostOpensNewTab(post)) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => {
          void recordPostSourceOpen(post._id)
        }}
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  )
}
