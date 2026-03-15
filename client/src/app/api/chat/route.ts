import { NextRequest, NextResponse } from 'next/server'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || ''

/**
 * Proxy chat tới AI service (Python: RAG, security, multimodal).
 * Cần set AI_SERVICE_URL (vd. http://localhost:5005) và chạy services/ai.
 */
export async function POST(req: NextRequest) {
  if (!AI_SERVICE_URL) {
    return NextResponse.json(
      {
        error:
          'Chưa cấu hình AI. Đặt AI_SERVICE_URL (vd. http://localhost:5005) và chạy service AI Python (services/ai).',
      },
      { status: 503 }
    )
  }

  try {
    const body = await req.json()
    const {
      messages = [],
      context = 'general',
      course = null,
      image_base64: imageBase64 = null,
      image_media_type: imageMediaType = 'image/jpeg',
    } = body as {
      messages?: Array<{ role: string; content: string }>
      context?: 'general' | 'course'
      course?: unknown
      image_base64?: string | null
      image_media_type?: string
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const res = await fetch(`${AI_SERVICE_URL.replace(/\/$/, '')}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        context,
        course,
        image_base64: imageBase64 || undefined,
        image_media_type: imageMediaType || 'image/jpeg',
      }),
      signal: AbortSignal.timeout(70000),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: typeof data.detail === 'string' ? data.detail : 'AI service lỗi' },
        { status: res.status >= 500 ? 502 : res.status }
      )
    }

    return NextResponse.json(data)
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'Yêu cầu quá thời gian chờ.' }, { status: 504 })
    }
    console.error('Chat API error:', err)
    return NextResponse.json(
      {
        error:
          'Không kết nối được AI service. Kiểm tra AI_SERVICE_URL và service Python (services/ai) đã chạy chưa.',
      },
      { status: 503 }
    )
  }
}
