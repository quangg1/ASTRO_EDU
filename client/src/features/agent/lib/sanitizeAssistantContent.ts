const ASSISTANT_LEAK_RE = /<\/?\s*assistant\s*>|<\|[^|>]{1,40}\|>/gi

export function sanitizeAssistantContent(text: string): string {
  return String(text || '').replace(ASSISTANT_LEAK_RE, '').trim()
}
