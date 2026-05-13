type SectionEyebrowProps = {
  text: string
  withDot?: boolean
  align?: 'left' | 'center'
  className?: string
}

export function SectionEyebrow({ text, withDot, align = 'left', className = '' }: SectionEyebrowProps) {
  return (
    <div
      className={`hud-mono hud-mono-md inline-flex items-center gap-2 text-[color:var(--hud-plasma)] ${align === 'center' ? 'justify-center' : ''} ${className}`}
    >
      {withDot && <span className="hud-pulse-dot" aria-hidden />}
      <span>{text}</span>
    </div>
  )
}
