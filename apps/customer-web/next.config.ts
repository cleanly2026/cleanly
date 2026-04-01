import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const config: NextConfig = {
  // Allow cross-package imports from @cleanly/* packages
  transpilePackages: ['@cleanly/ui', '@cleanly/i18n', '@cleanly/types'],
}

export default withNextIntl(config)
