/**
 * Nền Cosmo v2 (Space) — glow ấm, không grid/scanline HUD.
 */
export function CosmoPageBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div className="cosmo-glow-highlight absolute inset-0 opacity-90" />
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 55% 45% at 8% 92%, color-mix(in srgb, var(--color-accent) 6%, transparent) 0%, transparent 58%),
            radial-gradient(ellipse 45% 35% at 92% 8%, color-mix(in srgb, var(--color-brand-highlight) 8%, transparent) 0%, transparent 55%),
            radial-gradient(ellipse 40% 30% at 50% 0%, color-mix(in srgb, var(--color-brand-amber) 5%, transparent) 0%, transparent 50%)
          `,
        }}
      />
    </div>
  )
}
