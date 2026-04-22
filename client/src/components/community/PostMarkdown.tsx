'use client'

import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const linkCls = 'text-cyan-400 underline underline-offset-2 hover:text-cyan-300'

type Props = {
  source: string
  className?: string
}

/**
 * Nội dung bài diễn đàn dạng Markdown (giống Reddit).
 */
export function PostMarkdown({ source, className }: Props) {
  return (
    <div
      className={clsx(
        'text-gray-100 leading-relaxed',
        'space-y-2.5 [&>*:first-child]:mt-0',
        '[&_p]:mb-3 [&_p:last-child]:mb-0 [&_li]:my-0.5',
        '[&_strong]:text-white [&_strong]:font-semibold [&_b]:text-white',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2',
        '[&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-2',
        '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-gray-100 [&_h3]:mt-2',
        '[&_code]:rounded-md [&_code]:bg-black/35 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_code]:text-cyan-100/90',
        '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-white/10 [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre]:text-sm',
        '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-cyan-500/40 [&_blockquote]:pl-4 [&_blockquote]:text-slate-300',
        '[&_hr]:my-4 [&_hr]:border-white/10',
        '[&_table]:my-2 [&_table]:w-full [&_table]:text-left [&_table]:text-sm [&_th]:border [&_th]:border-white/15 [&_th]:bg-white/5 [&_th]:px-2 [&_th]:py-1.5 [&_td]:border [&_td]:border-white/10 [&_td]:px-2 [&_td]:py-1',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ className: aClass, ...props }) => (
            <a {...props} className={clsx(linkCls, aClass)} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  )
}
