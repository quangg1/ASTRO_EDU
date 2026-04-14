import { NextRequest, NextResponse } from 'next/server'

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || ''

/**
 * Proxy chat to AI service (Python: RAG, security, multimodal).
 * Set AI_SERVICE_URL (e.g. http://localhost:5005) and run services/ai.
 */
export async function POST(req: NextRequest) {
  if (!AI_SERVICE_URL) {
    return NextResponse.json(
      {
        error:
          'AI is not configured. Set AI_SERVICE_URL (e.g. http://localhost:5005) and run the Python AI service (services/ai).',
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
      agent_state: agentState = null,
    } = body as {
      messages?: Array<{ role: string; content: string }>
      context?: 'general' | 'course'
      course?: unknown
      image_base64?: string | null
      image_media_type?: string
      agent_state?: {
        pathname?: string | null
        search?: string | null
        route_label?: string | null
      } | null
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
        agent_state: agentState || undefined,
      }),
      signal: AbortSignal.timeout(70000),
    })

    const data = await res.json()

    if (!res.ok) {
      return NextResponse.json(
        { error: typeof data.detail === 'string' ? data.detail : 'AI service error' },
        { status: res.status >= 500 ? 502 : res.status }
      )
    }

    return NextResponse.json(data)
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    if (err.name === 'AbortError') {
      return NextResponse.json({ error: 'Request timed out.' }, { status: 504 })
    }
    console.error('Chat API error:', err)
    return NextResponse.json(
      {
        error:
          'Could not connect to the AI service. Check AI_SERVICE_URL and ensure the Python service (services/ai) is running.',
      },
      { status: 503 }
    )
  }
}
