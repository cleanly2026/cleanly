import type { Config } from 'tailwindcss'

// Per UI-SPEC: brand colors, Cairo font variable, logical property classes
export const sharedTailwindConfig = {
  theme: {
    extend: {
      colors: {
        brand: {
          surface:     '#F8F7F4',  // dominant 60% — page backgrounds
          navy:        '#1A2744',  // secondary 30% — card backgrounds, nav
          gold:        '#C9A84C',  // accent 10% — CTAs, focus rings ONLY
          muted:       '#E8E5DF',  // disabled surfaces, skeleton loaders
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
      fontSize: {
        'label':   ['14px', { lineHeight: '1.4' }],
        'body':    ['16px', { lineHeight: '1.5' }],
        'heading': ['20px', { lineHeight: '1.3' }],
        'display': ['28px', { lineHeight: '1.2' }],
      },
      fontWeight: {
        regular:  '400',
        semibold: '600',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '16px',
        'lg': '24px',
        'xl': '32px',
        '2xl': '48px',
        '3xl': '64px',
      },
    },
  },
} satisfies Omit<Config, 'content'>
