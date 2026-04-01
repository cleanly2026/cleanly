'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { AuthCard, PhoneInput } from '@cleanly/ui'
import { sendOtp } from '@/src/lib/auth-client'

// I18N-01: Zero hardcoded strings — all via useTranslations
export default function AuthPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const locale = useLocale()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    setError('')
    setLoading(true)
    const result = await sendOtp(phone)
    setLoading(false)

    if (!result.success) {
      if (result.error === 'rate_limited') {
        setError(t('error.rate_limited', { minutes: 15 }))
      } else {
        setError(t('error.network'))
      }
      return
    }

    // Encode phone in URL to pre-fill on verify screen
    router.push(`/${locale}/auth/verify?phone=${encodeURIComponent(phone)}`)
  }

  return (
    <AuthCard title="ROFAN" subtitle={t('otp.title')}>
      <div className="flex flex-col gap-xl">
        <PhoneInput
          label={t('otp.phone_label')}
          value={phone}
          onChange={setPhone}
          placeholder={t('otp.phone_placeholder')}
          invalid={!!error}
          error={error}
        />

        {/* Primary CTA — gold button (UI-SPEC: accent reserved for primary CTA) */}
        <button
          onClick={handleSend}
          disabled={phone.length < 9 || loading}
          className="w-full bg-brand-gold text-brand-navy font-semibold text-body py-md rounded-lg min-h-[44px] disabled:opacity-50 hover:bg-brand-gold/90 transition-colors flex items-center justify-center gap-sm"
        >
          {loading ? (
            <span className="animate-spin inline-block w-5 h-5 border-2 border-brand-navy border-t-transparent rounded-full" />
          ) : (
            t('otp.send_cta')
          )}
        </button>

        <p className="text-label text-white/60 text-center">
          {t('terms_copy')}
        </p>
      </div>
    </AuthCard>
  )
}
