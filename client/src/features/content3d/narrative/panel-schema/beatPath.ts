import type { NarrativeBeat } from '@/features/content3d/narrative/types'

type BeatRoot = NarrativeBeat

function splitPath(path: string): string[] {
  return path.split('.').filter(Boolean)
}

export function getBeatFieldValue(beat: BeatRoot, path: string): unknown {
  const parts = splitPath(path)
  let cur: unknown = beat
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[p]
  }
  return cur
}

export function setBeatFieldValue(beat: BeatRoot, path: string, value: unknown): NarrativeBeat {
  const parts = splitPath(path)
  if (parts.length === 0) return beat
  if (parts.length === 1) {
    return { ...beat, [parts[0]]: value }
  }
  const [head, ...rest] = parts
  const child = beat[head as keyof BeatRoot]
  const nextChild =
    child && typeof child === 'object'
      ? setNested(child as Record<string, unknown>, rest, value)
      : setNested({}, rest, value)
  return { ...beat, [head]: nextChild }
}

function setNested(obj: Record<string, unknown>, parts: string[], value: unknown): Record<string, unknown> {
  if (parts.length === 1) {
    return { ...obj, [parts[0]]: value }
  }
  const [head, ...rest] = parts
  const child = obj[head]
  const next =
    child && typeof child === 'object'
      ? setNested(child as Record<string, unknown>, rest, value)
      : setNested({}, rest, value)
  return { ...obj, [head]: next }
}

export function beatFieldDisplayString(beat: BeatRoot, path: string): string {
  const v = getBeatFieldValue(beat, path)
  if (v == null || v === '') return ''
  if (typeof v === 'number') return String(v)
  return String(v)
}
