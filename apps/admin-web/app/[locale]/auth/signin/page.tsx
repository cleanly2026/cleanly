'use client'

import { signIn } from 'next-auth/react'
import { useTranslations } from 'next-intl'

// UI-SPEC Screen 5: Platform Admin Google SSO — minimal screen, single CTA
export default function AdminSignInPage() {
  const t = useTranslations('auth')

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-xl max-w-sm w-full px-md">
        <div className="text-center">
          <h1 className="text-display font-semibold text-brand-gold">ROFAN</h1>
          <p className="text-heading font-semibold text-brand-navy mt-sm">{t('admin.title')}</p>
          <p className="text-body text-gray-500 mt-sm">{t('admin.subtitle')}</p>
        </div>

        {/* Primary CTA — gold button (UI-SPEC: accent for primary CTA) */}
        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full bg-brand-gold text-brand-navy font-semibold text-body py-md rounded-lg min-h-[44px] hover:bg-brand-gold/90 transition-colors flex items-center justify-center gap-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {t('admin.google_cta')}
        </button>
      </div>
    </div>
  )
}
