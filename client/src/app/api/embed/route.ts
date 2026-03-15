import { NextRequest, NextResponse } from 'next/server'

const EMBEDDING_URL = process.env.EMBEDDING_URL || 'http://localhost:5004'

/**
 * Proxy tới Embedding service (Flag Embedding BGE-M3).
 * POST body: { texts: string[] } hoặc { text: string }
 * Trả về: { embeddings: number[][] } hoặc { embedding: number[] }
 */
export async function POST(req: NextRequest) {
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
        return NextResponse.json(
          { error: 'Embedding service error', details: err },
          { status: res.status }
        )
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
        return NextResponse.json(
          { error: 'Embedding service error', details: err },
          { status: res.status }
        )
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
    console.error('Embed API error:', err)
    return NextResponse.json(
      { error: 'Cannot reach embedding service. Is it running on EMBEDDING_URL?' },
      { status: 503 }
    )
  }
}
