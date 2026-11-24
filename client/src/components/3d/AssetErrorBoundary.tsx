'use client'

import { Component, type ReactNode } from 'react'

/**
 * Chặn lỗi tải asset (texture/model) ở đúng vật thể đó.
 * `useLoader` ném lỗi khi một file 404/403; không có boundary này thì cả cảnh 3D sập
 * chỉ vì một texture thiếu trên CDN. Vật thể lỗi được vẽ bằng `fallback` (thường là quả cầu màu).
 */
export class AssetErrorBoundary extends Component<
  { fallback: ReactNode; label?: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    if (typeof console !== 'undefined') {
      console.warn(`[asset] ${this.props.label ?? 'asset'} không tải được, dùng hình thay thế:`, error)
    }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
