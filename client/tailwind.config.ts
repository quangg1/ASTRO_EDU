import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/design-system/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ── Cosmic landing palette (HSL-based; consumed only by the marketing
        //    surface). Do not extend or reuse from product surfaces — use the
        //    `ds-*` tokens below instead. ───────────────────────────────────
        background: 'hsl(var(--cosmic-background))',
        foreground: 'hsl(var(--cosmic-foreground))',
        card: 'hsl(var(--cosmic-card))',
        primary: 'hsl(var(--cosmic-primary))',
        'primary-foreground': 'hsl(var(--cosmic-primary-foreground))',
        secondary: 'hsl(var(--cosmic-secondary))',
        muted: 'hsl(var(--cosmic-muted))',
        'muted-foreground': 'hsl(var(--cosmic-muted-foreground))',
        border: 'hsl(var(--cosmic-border))',
        accent: 'hsl(var(--cosmic-accent))',
        destructive: 'hsl(var(--cosmic-destructive))',

        // ── Design system tokens (Edu / Course / Studio / Scene). All are
        //    backed by CSS variables in `design-system/tokens/semantic.css`,
        //    and overridden per surface in `design-system/tokens/surfaces/*`.
        //    Use `ds-*` utilities everywhere outside the marketing surface. ─
        'ds-base': 'var(--color-bg-base)',
        'ds-surface': 'var(--color-bg-surface)',
        'ds-elevated': 'var(--color-bg-elevated)',
        'ds-overlay': 'var(--color-bg-overlay)',

        'ds-border': 'var(--color-border)',
        'ds-border-strong': 'var(--color-border-strong)',

        'ds-text': 'var(--color-text-primary)',
        'ds-muted': 'var(--color-text-muted)',
        'ds-subtle': 'var(--color-text-subtle)',

        'ds-accent': 'var(--color-accent)',
        'ds-accent-soft': 'var(--color-accent-soft)',
        'ds-accent-strong': 'var(--color-accent-strong)',
        'ds-accent-fg': 'var(--color-accent-fg)',

        'ds-success': 'var(--color-success)',
        'ds-success-soft': 'var(--color-success-soft)',
        'ds-success-strong': 'var(--color-success-strong)',

        'ds-warning': 'var(--color-warning)',
        'ds-warning-soft': 'var(--color-warning-soft)',
        'ds-warning-strong': 'var(--color-warning-strong)',

        'ds-danger': 'var(--color-danger)',
        'ds-danger-soft': 'var(--color-danger-soft)',
        'ds-danger-strong': 'var(--color-danger-strong)',

        'ds-info': 'var(--color-info)',
        'ds-info-soft': 'var(--color-info-soft)',
        'ds-info-strong': 'var(--color-info-strong)',

        // ── Domain palettes (referenced by 3D content; not theme tokens) ──
        'earth': {
          'hadean': '#8B4513',
          'archean': '#2F4F4F',
          'proterozoic': '#4682B4',
          'paleozoic': '#228B22',
          'mesozoic': '#32CD32',
          'cenozoic': '#1E90FF',
        },
        'fossil': {
          'arthropoda': '#ff6b6b',
          'mollusca': '#4ecdc4',
          'chordata': '#45b7d1',
          'brachiopoda': '#f9ca24',
          'cnidaria': '#ff9ff3',
          'echinodermata': '#a55eea',
        },
      },
      borderRadius: {
        'ds-card': 'var(--radius-card)',
        'ds-control': 'var(--radius-control)',
        'ds-chip': 'var(--radius-chip)',
      },
      transitionDuration: {
        'ds-fast': '120ms',
        'ds-base': '200ms',
      },
      transitionTimingFunction: {
        'ds': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      // ── Density utilities. Map to per-surface CSS variables defined in
      //    `design-system/tokens/surfaces/*.css`. A primitive can opt into
      //    `px-ds-x py-ds-y gap-ds` and automatically compact when wrapped in
      //    `surface-studio` / `surface-scene`, or breathe in `surface-edu`.
      //    Per-instance overrides (e.g. `px-6` on a CTA) still win.
      padding: {
        'ds-x': 'var(--density-pad-x)',
        'ds-y': 'var(--density-pad-y)',
        'ds-content': 'var(--density-content)',
      },
      gap: {
        'ds': 'var(--density-gap)',
        'ds-content': 'var(--density-content)',
      },
      spacing: {
        'ds-content': 'var(--density-content)',
        'ds-gap': 'var(--density-gap)',
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
