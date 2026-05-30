'use client'

import { PostMarkdown } from '@/components/community/PostMarkdown'
import {
  commentContentIsHtml,
  getCommentHtmlClassName,
} from '@/features/community/lib/commentContent'

type Props = {
  content: string
  className?: string
}

export function CommentBody({ content, className = '' }: Props) {
  if (!content?.trim()) return null

  if (commentContentIsHtml(content)) {
    return (
      <div
        className={`${getCommentHtmlClassName()} ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    )
  }

  return (
    <div className={className}>
      <PostMarkdown source={content} className="text-gray-200 text-sm" />
    </div>
  )
}
