'use client'

import { Suspense, type ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

/** Bắt buộc khi dùng `useSearchParams` + `output: 'export'`. */
export function SearchParamsSuspense({ children, fallback = null }: Props) {
  return <Suspense fallback={fallback}>{children}</Suspense>
}
