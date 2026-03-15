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
