// i18next configuration for company-web (bilingual AR/EN + RTL switching)
// Created as prerequisite for plan 02-09 (plan 02-02 dependency)
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import enJson from '@cleanly/i18n/locales/en.json'
import arJson from '@cleanly/i18n/locales/ar.json'

const savedLang = localStorage.getItem('lang') ?? 'en'

i18n.use(initReactI18next).init({
  lng: savedLang,
  fallbackLng: 'en',
  resources: {
    en: { translation: enJson },
    ar: { translation: arJson },
  },
  interpolation: { escapeValue: false },
})

// Apply RTL direction on init
document.documentElement.dir = savedLang === 'ar' ? 'rtl' : 'ltr'
document.documentElement.lang = savedLang

// Export language switcher
export function switchLanguage(lang: 'en' | 'ar') {
  i18n.changeLanguage(lang)
  localStorage.setItem('lang', lang)
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = lang
}

export default i18n
