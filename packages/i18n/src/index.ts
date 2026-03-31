import en from '../locales/en.json'
import ar from '../locales/ar.json'

export type Locale = 'en' | 'ar'
export type Messages = typeof en

export const locales = { en, ar } as const satisfies Record<Locale, Messages>

export function getMessages(locale: Locale): Messages {
  return locales[locale]
}
