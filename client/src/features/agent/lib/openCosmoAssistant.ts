export type OpenCosmoAssistantDetail = {
  prompt?: string
}

/** Mở widget trợ lý góc phải; tuỳ chọn điền sẵn prompt. */
export function openCosmoAssistant(detail?: OpenCosmoAssistantDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('galaxies:agent-open', { detail }))
}
