import './lib/i18n'  // MUST be first import after React
import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { queryClient } from './lib/query-client'
import { AuthProvider, useAuth } from './lib/auth-context'
import { AppRoutes } from './router'
import { LoginPage } from './pages/auth/LoginPage'
import { MfaPage } from './pages/auth/MfaPage'

function AuthGate() {
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

function App() {
  const { i18n } = useTranslation()

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = i18n.language
  }, [i18n.language])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AuthGate />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
