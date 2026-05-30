'use client'

import { ErrorBoundary } from './ErrorBoundary'

export function ErrorBoundaryWrap({ children }: { children: React.ReactNode }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
