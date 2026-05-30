import { NextRequest, NextResponse } from 'next/server'

import { readEnv } from '@/lib/readEnv'
import { devError } from '@/lib/devLog'
import { userMessages } from '@/lib/userMessages'
import ENV from '@galaxies/shared/envNames'

const EMBEDDING_URL = readEnv(ENV.EMBEDDING_URL)

/**
 * Proxy to embedding service (Flag Embedding BGE-M3).
 * POST body: { texts: string[] } or { text: string }
 * Returns: { embeddings: number[][] } or { embedding: number[] }
 */
export async function POST(req: NextRequest) {
  if (!EMBEDDING_URL) {
    devError('embed', { missing: ENV.EMBEDDING_URL })
    return NextResponse.json({ error: userMessages.aiUnavailable }, { status: 503 })
  }
  try {
    const body = await req.json()
    const url = `${EMBEDDING_URL.replace(/\/$/, '')}`

    if (body.text != null) {
      const res = await fetch(`${url}/embed_one`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body.text }),
        signal: AbortSignal.timeout(30000),
      })
      if (!res.ok) {
        const err = await res.text()
        devError('embed', err)
        return NextResponse.json({ error: userMessages.aiUnavailable }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json(data)
    }

    if (Array.isArray(body.texts) && body.texts.length > 0) {
      const res = await fetch(`${url}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts: body.texts }),
        signal: AbortSignal.timeout(60000),
      })
      if (!res.ok) {
        const err = await res.text()
        devError('embed', err)
        return NextResponse.json({ error: userMessages.aiUnavailable }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json(data)
    }

    return NextResponse.json(
      { error: 'Body must contain "text" (string) or "texts" (non-empty string array)' },
      { status: 400 }
    )
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'Embedding request timeout' }, { status: 504 })
    }
    devError('embed', err)
    return NextResponse.json({ error: userMessages.aiUnavailable }, { status: 503 })
  }
}
