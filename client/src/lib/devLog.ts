/** Ghi log kỹ thuật — chỉ khi development, không hiển thị cho người dùng. */

export function isDev(): boolean {
  return process.env.NODE_ENV === 'development'
}

export function devWarn(context: string, detail?: unknown): void {
  if (!isDev()) return
  if (detail !== undefined) {
    console.warn(`[${context}]`, detail)
  } else {
    console.warn(`[${context}]`)
  }
}

export function devError(context: string, detail?: unknown): void {
  if (!isDev()) return
  if (detail !== undefined) {
    console.error(`[${context}]`, detail)
  } else {
    console.error(`[${context}]`)
  }
}
