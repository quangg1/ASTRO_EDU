'use client'

import { useEffect, useState } from 'react'
import {
  entityHasDeepHistorySync,
  probeEntityHasDeepHistory,
} from '@/app/explore/lib/exploreDeepHistoryAvailability'

/** Entity đang chọn có beats Deep History (preset hoặc CMS) — dùng hiện nút trên top bar. */
export function useActiveEntityDeepHistoryAvailable(entityId: string) {
  const [available, setAvailable] = useState(() => entityHasDeepHistorySync(entityId))

  useEffect(() => {
    const id = String(entityId || '').trim()
    if (!id) {
      setAvailable(false)
      return
    }
    if (entityHasDeepHistorySync(id)) {
      setAvailable(true)
      return
    }
    let cancelled = false
    void probeEntityHasDeepHistory(id).then((has) => {
      if (!cancelled) setAvailable(has)
    })
    return () => {
      cancelled = true
    }
  }, [entityId])

  return available
}
