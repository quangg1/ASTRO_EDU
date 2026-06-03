import type { CSSProperties, ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  /** Nhấn amber (tier, streak) */
  amber?: boolean
}

/**
 * Panel tối chuẩn Cosmo v2 — dùng trên dashboard, community, form nội dung.
 * Không dùng cosmo-light-panel (chỉ cho Space mission cards / LP hub).
 */
export function CosmoDarkPanel({ children, className = '', style, amber }: Props) {
  return (
    <div
      className={`cosmo-dark-panel rounded-2xl ${amber ? 'cosmo-dark-panel-amber' : ''} ${className}`.trim()}
      style={style}
    >
      {children}
    </div>
  )
}
