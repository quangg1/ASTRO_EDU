'use client'

export type SpaceNavItem = {
  id: string
  index: number
  label: string
  href?: string
}

type Props = {
  items: SpaceNavItem[]
  activeId: string
  onSelect?: (id: string) => void
  className?: string
}

export function SpaceNumberedNav({ items, activeId, onSelect, className = '' }: Props) {
  return (
    <nav className={`flex flex-col gap-5 ${className}`} aria-label="Điều hướng">
      {items.map((item) => {
        const active = item.id === activeId
        const Tag = item.href ? 'a' : 'button'
        const extra = item.href
          ? { href: item.href }
          : { type: 'button' as const, onClick: () => onSelect?.(item.id) }

        return (
          <Tag
            key={item.id}
            {...extra}
            className={`group flex items-baseline gap-3 text-left transition-colors ${
              active ? 'text-white' : 'text-white/35 hover:text-white/60'
            }`}
          >
            <span
              className="font-[family-name:var(--sp-font-mono)] text-xs tabular-nums"
              style={{ color: active ? 'var(--sp-accent)' : undefined }}
            >
              {item.index}
            </span>
            <span
              className={`relative pl-3 text-lg tracking-wide ${
                active ? 'font-medium' : 'font-light'
              }`}
            >
              {active ? (
                <span
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                  style={{ background: 'var(--sp-accent)' }}
                  aria-hidden
                />
              ) : null}
              {item.label}
            </span>
          </Tag>
        )
      })}
    </nav>
  )
}
