import { useState } from 'react'
import { companyLogin } from '../../lib/auth-client'

// Company web is a Vite React SPA — does not use next-intl.
// Uses i18next from packages/i18n (Phase 3 when company web is fully built).
// For Phase 1 scaffold, English copy is directly in component.
// TODO Phase 2: replace with t('auth.company.*') calls when i18next is wired.

interface LoginPageProps {
  onMfaRequired: (sessionToken: string, email: string) => void
  onSuccess: (tokens: { accessToken: string; refreshToken: string }) => void
}

export function LoginPage({ onMfaRequired, onSuccess }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await companyLogin(email, password)
    setLoading(false)

    if (result.error === 'wrong_credentials') {
      // UI-SPEC: "Incorrect email or password." — never specify which field
      setError('Incorrect email or password.')
      return
    }
    if (result.error) {
      setError('Connection error. Check your internet and try again.')
      return
    }
    if (result.requiresMfa && result.sessionToken) {
      onMfaRequired(result.sessionToken, email)
      return
    }
    if (result.accessToken) {
      onSuccess({ accessToken: result.accessToken, refreshToken: result.refreshToken! })
    }
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-xl max-w-sm mx-auto w-full p-2xl bg-brand-navy rounded-2xl">
      <h1 className="text-display font-semibold text-brand-gold text-center">Cleanly</h1>
      <h2 className="text-heading font-semibold text-white text-center -mt-lg">Company Dashboard</h2>

      <div className="flex flex-col gap-sm">
        <label className="text-label font-semibold text-white">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border-2 border-gray-300 px-md py-sm text-body bg-white focus:border-brand-gold focus:outline-none min-h-[44px]"
          required
        />
      </div>

      <div className="flex flex-col gap-sm">
        <label className="text-label font-semibold text-white">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-lg border-2 border-gray-300 px-md py-sm text-body bg-white focus:border-brand-gold focus:outline-none min-h-[44px]"
          required
        />
      </div>

      {error && <p className="text-label text-semantic-destructive">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-gold text-brand-navy font-semibold text-body py-md rounded-lg min-h-[44px] disabled:opacity-50"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
