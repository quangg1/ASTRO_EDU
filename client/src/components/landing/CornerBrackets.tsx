type CornerBracketsProps = {
  corners?: Array<'tl' | 'tr' | 'bl' | 'br'>
  className?: string
}

export function CornerBrackets({
  corners = ['tl', 'tr', 'bl', 'br'],
  className = '',
}: CornerBracketsProps) {
  return (
    <>
      {corners.map((c) => (
        <span key={c} className={`hud-corner ${c} ${className}`} aria-hidden />
      ))}
    </>
  )
}
