import { useState } from 'react'
import { verifyMfa } from '../../lib/auth-client'

interface MfaPageProps {
  email: string
  sessionToken: string
  onSuccess: (tokens: { accessToken: string; refreshToken: string }) => void
  onBack: () => void
}

export function MfaPage({ email, sessionToken, onSuccess, onBack }: MfaPageProps) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await verifyMfa(email, code, sessionToken)
    setLoading(false)

    if (result.error === 'invalid_totp') {
      setError('Incorrect code. Try again.')
      return
    }
    if (result.error) {
      setError('Connection error. Try again.')
      return
    }
    if (result.accessToken) {
      onSuccess({ accessToken: result.accessToken, refreshToken: result.refreshToken! })
    }
  }

  return (
    <form onSubmit={handleVerify} className="flex flex-col gap-xl max-w-sm mx-auto w-full p-2xl bg-brand-navy rounded-2xl">
      <h2 className="text-heading font-semibold text-white text-center">Two-Factor Authentication</h2>
      <p className="text-body text-white/60 text-center">Enter the 6-digit code from your authenticator app</p>

      <input
        type="text"
        inputMode="numeric"
        pattern="\d{6}"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        placeholder="000000"
        className="rounded-lg border-2 border-gray-300 px-md py-sm text-body bg-white focus:border-brand-gold focus:outline-none min-h-[44px] text-center tracking-widest text-heading"
      />

      {error && <p className="text-label text-semantic-destructive text-center">{error}</p>}

      <button
        type="submit"
        disabled={code.length < 6 || loading}
        className="w-full bg-brand-gold text-brand-navy font-semibold text-body py-md rounded-lg min-h-[44px] disabled:opacity-50"
      >
        {loading ? 'Verifying...' : 'Verify'}
      </button>

      <button type="button" onClick={onBack} className="text-label text-white/60 text-center underline">
        Back to login
      </button>
    </form>
  )
}
