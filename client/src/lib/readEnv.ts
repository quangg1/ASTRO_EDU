import ENV from '@galaxies/shared/envNames'
import { devError } from '@/lib/devLog'
import { userMessages } from '@/lib/userMessages'

export { ENV }

export function readEnv(name: string): string {
  const v = typeof process !== 'undefined' ? process.env[name] : ''
  return (v ?? '').trim()
}

export function requireEnv(name: string): string {
  const v = readEnv(name)
  if (!v) {
    devError('env', { missing: name })
    throw new Error(userMessages.genericError)
  }
  return v
}
