import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

type AuthContextType = {
  token: string | null
  userId: string | null
  isLoading: boolean
  setAuth: (accessToken: string, refreshToken: string, userId: string) => Promise<void>
  clearAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load stored credentials on mount
  useEffect(() => {
    const loadAuth = async () => {
      try {
        const [accessToken, storedUserId] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('userId'),
        ])
        setToken(accessToken)
        setUserId(storedUserId)
      } catch {
        // AsyncStorage failure is non-fatal — app continues as unauthenticated
      } finally {
        setIsLoading(false)
      }
    }
    void loadAuth()
  }, [])

  const setAuth = async (accessToken: string, refreshToken: string, uid: string) => {
    await AsyncStorage.multiSet([
      ['accessToken', accessToken],
      ['refreshToken', refreshToken],
      ['userId', uid],
    ])
    setToken(accessToken)
    setUserId(uid)
  }

  const clearAuth = async () => {
    await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'userId'])
    setToken(null)
    setUserId(null)
  }

  return (
    <AuthContext.Provider value={{ token, userId, isLoading, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  )
}
