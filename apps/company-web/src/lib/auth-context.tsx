import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { connectSocket, disconnectSocket } from './socket'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  companyId: string | null
  userId: string | null
  isAuthenticated: boolean
}

interface AuthContextValue extends AuthState {
  login: (tokens: { accessToken: string; refreshToken: string }) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwtPayload(token: string): { sub?: string; companyId?: string; role?: string } | null {
  try {
    const base64 = token.split('.')[1]
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'))
    return JSON.parse(json)
  } catch {
    return null
  }
}

function deriveState(accessToken: string | null, refreshToken: string | null): AuthState {
  if (!accessToken) return { accessToken: null, refreshToken: null, companyId: null, userId: null, isAuthenticated: false }
  const payload = decodeJwtPayload(accessToken)
  return {
    accessToken,
    refreshToken,
    companyId: payload?.companyId ?? null,
    userId: payload?.sub ?? null,
    isAuthenticated: !!payload?.companyId,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const at = localStorage.getItem('accessToken')
    const rt = localStorage.getItem('refreshToken')
    return deriveState(at, rt)
  })

  const login = useCallback((tokens: { accessToken: string; refreshToken: string }) => {
    localStorage.setItem('accessToken', tokens.accessToken)
    localStorage.setItem('refreshToken', tokens.refreshToken)
    const newState = deriveState(tokens.accessToken, tokens.refreshToken)
    setState(newState)
    if (newState.companyId) {
      connectSocket(tokens.accessToken, newState.companyId)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    disconnectSocket()
    setState(deriveState(null, null))
  }, [])

  // On mount, if already authenticated, connect socket
  useEffect(() => {
    if (state.isAuthenticated && state.accessToken && state.companyId) {
      connectSocket(state.accessToken, state.companyId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
