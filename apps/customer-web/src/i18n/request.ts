import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale

  // Import locale messages from shared @cleanly/i18n package
  const messages = (await import(`@cleanly/i18n/locales/${locale}.json`)).default

  return {
    locale,
    messages,
  }
})
