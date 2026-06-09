'use client'

import React from 'react'
import { useT } from '@/i18n/public'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

function ErrorBoundaryFallback({
  error,
  onRetry,
}: {
  error?: Error
  onRetry: () => void
}) {
  const { t } = useT()
  return (
    <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-ds-base border border-ds-border rounded-2xl">
      <p className="text-amber-300 font-medium mb-2">{t('errors.boundaryTitle')}</p>
      <p className="text-sm text-ds-subtle mb-4 text-center max-w-md">
        {error?.message || t('errors.boundaryHint')}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 text-sm"
      >
        {t('errors.retry')}
      </button>
    </div>
  )
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <ErrorBoundaryFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false })}
        />
      )
    }
    return this.props.children
  }
}
