import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { I18nManager } from 'react-native'
import * as Localization from 'expo-localization'

// Import locale files directly (Metro doesn't resolve package exports wildcards)
import en from '../../../../packages/i18n/locales/en.json'
import ar from '../../../../packages/i18n/locales/ar.json'

const LANG_KEY = 'preferred_language'

// Detect device locale or fall back to English
const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en'
const supportedLocale = ['en', 'ar'].includes(deviceLocale) ? deviceLocale : 'en'

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  fallbackLng: 'en',
  lng: supportedLocale,
  interpolation: { escapeValue: false }, // React Native handles XSS
})

// Read persisted language preference on startup
AsyncStorage.getItem(LANG_KEY).then((savedLang) => {
  if (savedLang && savedLang !== i18n.language) {
    switchLanguage(savedLang as 'en' | 'ar')
  }
})

// Language switch — I18N-04: persists to AsyncStorage
// IMPORTANT: I18nManager.forceRTL requires app restart on React Native.
// The calling component must handle the restart dialog.
export async function switchLanguage(lang: 'en' | 'ar'): Promise<void> {
  const needsRtlChange = (lang === 'ar') !== I18nManager.isRTL
  await AsyncStorage.setItem(LANG_KEY, lang)
  await i18n.changeLanguage(lang)
  if (needsRtlChange) {
    I18nManager.forceRTL(lang === 'ar')
    // Caller must trigger app restart (use expo-updates or react-native-restart)
    // Example: Updates.reloadAsync() or RNRestart.Restart()
  }
}

export default i18n
