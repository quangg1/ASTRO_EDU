'use client'

import clsx from 'clsx'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { normalizeAssistantMarkdown } from '@/features/agent/public'

const linkCls = 'text-cyan-400 underline underline-offset-2 hover:text-ds-accent'

export function AssistantMarkdown({ source }: { source: string }) {
  const normalized = normalizeAssistantMarkdown(source)

  return (
    <div
      className={clsx(
        'tutor-md text-[14px] leading-[1.65] text-gray-200/95',
        'space-y-2.5 [&>*:first-child]:mt-0',
        '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_li]:my-0.5',
        '[&_div:has(>table)]:my-3 [&_div:has(>table)]:overflow-x-auto [&_div:has(>table)]:rounded-lg [&_div:has(>table)]:border [&_div:has(>table)]:border-white/10',
        '[&_table]:w-full [&_table]:min-w-[280px] [&_table]:border-collapse [&_table]:text-left [&_table]:text-[13px]',
        '[&_th]:whitespace-nowrap [&_th]:bg-white/5 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold [&_th]:text-white [&_th]:border [&_th]:border-white/10',
        '[&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:text-gray-200/90 [&_td]:border [&_td]:border-white/8',
        '[&_strong]:text-white [&_strong]:font-semibold [&_b]:text-white',
        '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_h1]:text-base [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-3 [&_h1]:mb-2',
        '[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-3 [&_h2]:mb-1.5',
        '[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-gray-100 [&_h3]:mt-2',
        '[&_code]:rounded-md [&_code]:bg-black/35 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[12.5px] [&_code]:text-ds-text/90',
        '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-ds-border [&_pre]:bg-ds-elevated/80 [&_pre]:p-3 [&_pre]:text-[12px]',
        '[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-l-cyan-500/40 [&_blockquote]:pl-3 [&_blockquote]:text-ds-muted',
        '[&_a]:text-cyan-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-ds-accent',
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ className, ...props }) => (
            <a {...props} className={clsx(linkCls, className)} target="_blank" rel="noopener noreferrer" />
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props}>{children}</table>
            </div>
          ),
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  )
}
