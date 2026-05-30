'use client'

import { resolveMediaUrl } from '@/lib/apiConfig'

export type ModuleMaterialItem = {
  id: string
  label: string
  kind: string
  url: string
}

const KIND_ICON: Record<string, string> = {
  pdf: '📄',
  link: '🔗',
  slides: '📊',
  video: '🎬',
}

export function ModuleMaterialsList({
  materials,
  timeZone,
}: {
  materials?: ModuleMaterialItem[]
  timeZone?: string
}) {
  if (!materials?.length) return null
  return (
    <ul className="mt-2 space-y-1.5">
      {materials.map((mat) => {
        const href = resolveMediaUrl(mat.url)
        if (!href) return null
        const icon = KIND_ICON[mat.kind] ?? '📎'
        return (
          <li key={mat.id}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-2 rounded-lg border border-ds-border/80 bg-ds-surface/50 px-2.5 py-2 text-[11px] text-ds-text hover:border-ds-accent-strong hover:bg-ds-accent-soft/30 transition-colors"
            >
              <span className="text-base shrink-0" aria-hidden>{icon}</span>
              <span className="font-medium text-ds-accent group-hover:text-cyan-100 truncate">
                {mat.label || 'Tài liệu'}
              </span>
              <span className="ml-auto text-[10px] text-ds-subtle shrink-0">Mở ↗</span>
            </a>
          </li>
        )
      })}
      {timeZone && (
        <li className="text-[10px] text-ds-subtle px-1">Lịch hiển thị theo {timeZone}</li>
      )}
    </ul>
  )
}
