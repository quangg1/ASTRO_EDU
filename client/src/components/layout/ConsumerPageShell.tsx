import type { ReactNode } from 'react'
import { CosmoPageBackdrop } from '@/components/layout/CosmoPageBackdrop'

/**
 * Wrapper chuẩn cho trang consumer (không dùng DashboardShell).
 * Nền + glow Cosmo v2; bọc nội dung sau header (pt-14+).
 */
export function ConsumerPageShell({
  children,
  className = '',
  padTop = true,
}: {
  children: ReactNode
  className?: string
  /** false nếu trang tự lo padding top (vd. đã pt-20) */
  padTop?: boolean
}) {
  return (
    <div className={`relative z-10 text-ds-text w-full relative ${className}`.trim()}>
      <CosmoPageBackdrop />
      <div className={`relative z-[1] ${padTop ? 'pt-14 md:pt-[3.5rem]' : ''}`}>{children}</div>
    </div>
  )
}
