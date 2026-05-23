'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
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
        <div className="min-h-[200px] flex flex-col items-center justify-center p-8 bg-[#0a0f17] border border-white/10 rounded-2xl">
          <p className="text-amber-300 font-medium mb-2">Đã xảy ra lỗi</p>
          <p className="text-sm text-gray-500 mb-4 text-center max-w-md">
            {this.state.error?.message || 'Vui lòng tải lại trang hoặc thử lại sau.'}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 rounded-xl bg-white/10 text-gray-300 hover:bg-white/20 text-sm"
          >
            Thử lại
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
