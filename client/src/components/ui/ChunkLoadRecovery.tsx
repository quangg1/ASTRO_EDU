'use client'

import { useEffect } from 'react'

const SESSION_KEY = '__chunk_reload_once'

/**
 * Khi dynamic import thất bại (ChunkLoadError, "Loading chunk ... failed") — thường gặp sau deploy,
 * HMR đổi chunk id, hoặc mạng mobile ngắt — tự reload trang một lần để tải lại bundle.
 */
export function ChunkLoadRecovery() {
  useEffect(() => {
    const looksLikeChunkFailure = (msg: string) => {
      const m = msg.toLowerCase()
      return (
        m.includes('chunkloaderror') ||
        m.includes('loading chunk') ||
        m.includes('failed to fetch dynamically imported module') ||
        m.includes('importing a module script failed')
      )
    }

    const maybeRecover = (raw: string) => {
      if (typeof window === 'undefined') return
      if (!looksLikeChunkFailure(raw)) return
      if (sessionStorage.getItem(SESSION_KEY) === '1') return
      sessionStorage.setItem(SESSION_KEY, '1')
      window.location.reload()
    }

    const onWindowError = (e: ErrorEvent) => {
      maybeRecover(`${e.message} ${e.error?.message ?? ''}`)
    }

    const onRejection = (e: PromiseRejectionEvent) => {
      const r = e.reason
      const msg = r instanceof Error ? r.message : String(r)
      maybeRecover(msg)
    }

    window.addEventListener('error', onWindowError)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      window.removeEventListener('error', onWindowError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
