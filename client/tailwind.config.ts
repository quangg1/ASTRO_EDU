import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Cosmic landing (use in landing page only)
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
        // Earth History theme colors
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
        }
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
export default config
