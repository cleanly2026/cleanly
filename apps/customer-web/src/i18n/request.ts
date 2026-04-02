import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import en from '@cleanly/i18n/locales/en.json'
import ar from '@cleanly/i18n/locales/ar.json'

const messages: Record<string, typeof en> = { en, ar }

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = (await requestLocale) ?? routing.defaultLocale

  return {
    locale,
    messages: messages[locale] ?? messages[routing.defaultLocale],
  }
})
