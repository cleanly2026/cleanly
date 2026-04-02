import type { Config } from 'tailwindcss'
import { sharedTailwindConfig } from '@cleanly/config/tailwind.config'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    '../../packages/i18n/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: sharedTailwindConfig.theme?.extend ?? {},
  },
}
export default config
