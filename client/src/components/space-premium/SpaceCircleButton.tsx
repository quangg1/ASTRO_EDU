import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

type Props = {
  href?: string
  onClick?: () => void
  label?: string
  dark?: boolean
  disabled?: boolean
}

export function SpaceCircleButton({ href, onClick, label = 'Tiếp', dark = true, disabled }: Props) {
  const cls =
    'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 disabled:opacity-40 disabled:pointer-events-none'
  const style = dark
    ? { background: '#0a0a0a', color: '#fff' }
    : { background: '#fff', color: '#0a0a0a' }

  const inner = <ArrowRight className="h-4 w-4" aria-hidden />

  if (href && !disabled) {
    return (
      <Link href={href} className={cls} style={style} aria-label={label}>
        {inner}
      </Link>
    )
  }

  return (
    <button type="button" className={cls} style={style} onClick={onClick} disabled={disabled} aria-label={label}>
      {inner}
    </button>
  )
}
