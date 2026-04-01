'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { OtpInput } from '@cleanly/ui'
import { verifyOtp } from '@/src/lib/auth-client'

const OTP_EXPIRY_SECONDS = 60

export default function VerifyPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const locale = useLocale()
  const params = useSearchParams()
  const phone = params.get('phone') ?? ''

  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [countdown, setCountdown] = useState(OTP_EXPIRY_SECONDS)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown])

  const handleVerify = async (value: string) => {
    if (value.length < 6) return
    setError('')
    setInvalid(false)
    setLoading(true)
    const result = await verifyOtp(phone, value)
    setLoading(false)

    if (result.error === 'invalid_otp') {
      setInvalid(true)
      setError(t('error.invalid_otp', { remaining: 2 }))
      return
    }
    if (result.error === 'network') {
      setError(t('error.network'))
      return
    }

    // Store tokens and redirect to home
    if (typeof window !== 'undefined' && result.accessToken) {
      localStorage.setItem('access_token', result.accessToken)
      localStorage.setItem('refresh_token', result.refreshToken ?? '')
    }
    router.push(`/${locale}`)
  }

  return (
    <div className="flex flex-col gap-xl max-w-sm mx-auto w-full">
      <div>
        <h2 className="text-heading font-semibold text-brand-navy">{t('otp.title')}</h2>
        <p className="text-body text-gray-500 mt-sm">
          {t('otp.subtitle', { phone: `+971 ${phone}` })}
        </p>
      </div>

      <OtpInput
        value={code}
        onChange={setCode}
        onComplete={handleVerify}
        invalid={invalid}
        disabled={loading}
      />

      {error && (
        <p className="text-label text-semantic-destructive">{error}</p>
      )}

      {/* Countdown / Resend */}
      <div className="text-center">
        {countdown > 0 ? (
          <p className={`text-label ${countdown < 30 ? 'text-semantic-warning' : 'text-gray-500'}`}>
            {t('otp.resend_countdown', { seconds: countdown })}
          </p>
        ) : (
          <button
            onClick={() => { setCountdown(OTP_EXPIRY_SECONDS); router.back() }}
            className="text-label text-brand-gold underline"
          >
            {t('otp.resend_link')}
          </button>
        )}
      </div>

      {/* Primary CTA */}
      <button
        onClick={() => handleVerify(code)}
        disabled={code.length < 6 || loading}
        className="w-full bg-brand-gold text-brand-navy font-semibold text-body py-md rounded-lg min-h-[44px] disabled:opacity-50 flex items-center justify-center gap-sm"
      >
        {loading ? (
          <span className="animate-spin inline-block w-5 h-5 border-2 border-brand-navy border-t-transparent rounded-full" />
        ) : (
          t('otp.verify_cta')
        )}
      </button>
    </div>
  )
}
