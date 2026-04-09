import { useState } from 'react'
import { useAuth } from '../lib/auth-context'
import { AppRoutes } from '../router'
import { LoginPage } from '../pages/auth/LoginPage'
import { MfaPage } from '../pages/auth/MfaPage'

export function AuthGate() {
  const { isAuthenticated, login } = useAuth()
  const [mfaState, setMfaState] = useState<{ sessionToken: string; email: string } | null>(null)

  if (isAuthenticated) {
    return <AppRoutes />
  }

  if (mfaState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <MfaPage
          email={mfaState.email}
          sessionToken={mfaState.sessionToken}
          onSuccess={login}
          onBack={() => setMfaState(null)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <LoginPage
        onMfaRequired={(sessionToken, email) => setMfaState({ sessionToken, email })}
        onSuccess={login}
      />
    </div>
  )
}
