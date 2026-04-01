import type { Config } from 'tailwindcss'

// Brand colors from UI-SPEC (package/config not available at build time in lib context)
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          surface: '#F8F7F4',
          navy:    '#1A2744',
          gold:    '#C9A84C',
          muted:   '#E8E5DF',
        },
        semantic: {
          success:     '#16A34A',
          warning:     '#D97706',
          destructive: '#DC2626',
        },
      },
      fontFamily: {
        cairo: ['var(--font-cairo)', 'system-ui', 'sans-serif'],
      },
    },
  },
}
export default config
