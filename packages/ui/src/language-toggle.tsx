'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'

// UI-SPEC Language Switching Contract:
// - In EN mode: shows "العربية"
// - In AR mode: shows "English"
// - Updates <html dir> immediately without page reload (via Next.js router)
// - Preference persisted to localStorage pre-auth, profile post-auth (I18N-04)
// - Minimum 44px touch target (WCAG 2.5.5 AA)

export function LanguageToggle() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const isArabic = locale === 'ar'

  const switchLocale = () => {
    const targetLocale = isArabic ? 'en' : 'ar'

    // Persist pre-auth preference to localStorage (I18N-04)
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred_language', targetLocale)
    }

    // Replace current locale segment in path
    // e.g., /en/auth/login → /ar/auth/login
    const newPath = pathname.replace(`/${locale}`, `/${targetLocale}`)
    router.replace(newPath)
  }

  return (
    <button
      onClick={switchLocale}
      className={[
        'min-h-[44px] px-4',  // WCAG 2.5.5 AA: 44px minimum touch target
        'rounded-md text-sm font-semibold',
        'text-brand-gold border border-brand-gold',
        'hover:bg-brand-gold/10 transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold',
      ].join(' ')}
      aria-label={isArabic ? 'Switch to English' : 'Switch to Arabic'}
    >
      {/* UI-SPEC: EN mode shows Arabic label, AR mode shows English label */}
      {isArabic ? 'English' : 'العربية'}
    </button>
  )
}
