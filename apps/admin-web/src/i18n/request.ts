import { getRequestConfig } from 'next-intl/server'
import en from '@cleanly/i18n/locales/en.json'
import ar from '@cleanly/i18n/locales/ar.json'
import { routing } from './routing'

const messagesByLocale: Record<string, Record<string, unknown>> = { en, ar }

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale =
    requested && requested in messagesByLocale ? requested : routing.defaultLocale

  return {
    locale,
    messages: messagesByLocale[locale],
  }
})
