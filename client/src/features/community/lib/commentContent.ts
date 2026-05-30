import { looksLikeHtml } from '@/features/community/lib/postContent'

const commentHtmlClassName =
  'text-gray-200 text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_a]:text-cyan-400 [&_a]:underline [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:text-white [&_code]:rounded bg-black/35 px-1 py-0.5 text-cyan-100/90'

export function getCommentHtmlClassName(): string {
  return commentHtmlClassName
}

export function commentContentIsHtml(content: string): boolean {
  return looksLikeHtml(content)
}
