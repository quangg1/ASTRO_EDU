/**
 * Semantic palette for inline styles & SVG (matches semantic.css).
 * Prefer Tailwind `ds-*` in className when possible.
 */
export const cosmo = {
  bg: 'var(--color-bg-base)',
  surface: 'var(--color-bg-surface)',
  elevated: 'var(--color-bg-elevated)',
  overlay: 'var(--color-bg-overlay)',
  card: 'var(--color-bg-card)',
  cardElevated: 'var(--color-bg-card-elevated)',
  text: 'var(--color-text-primary)',
  muted: 'var(--color-text-muted)',
  subtle: 'var(--color-text-subtle)',
  onCard: 'var(--color-text-on-card)',
  onCardMuted: 'var(--color-text-muted-on-card)',
  accent: 'var(--color-accent)',
  accentSoft: 'var(--color-accent-soft)',
  accentStrong: 'var(--color-accent-strong)',
  amber: 'var(--color-brand-amber)',
  highlight: 'var(--color-brand-highlight)',
} as const

/** HUD bracket components — default accent */
export const cosmoBracketAccent = cosmo.accent
