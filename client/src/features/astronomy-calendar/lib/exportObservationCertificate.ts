import { toPng } from 'html-to-image'

export async function exportObservationCertificatePng(
  node: HTMLElement,
  filename: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const dataUrl = await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: false,
    })
    const link = document.createElement('a')
    link.download = filename
    link.href = dataUrl
    link.click()
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Không xuất được ảnh'
    return { success: false, error: message }
  }
}

export function observationCertificateFilename(eventTitle: string, checkedInAt?: string): string {
  const slug = eventTitle
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const date = checkedInAt ? new Date(checkedInAt).toISOString().slice(0, 10) : 'checkin'
  return `cosmolearn-quan-sat-${slug || 'su-kien'}-${date}.png`
}
