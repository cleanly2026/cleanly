import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// Mock useAuth to control authentication state
const mockUseAuth = vi.fn()
vi.mock('../lib/auth-context', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock AppRoutes to detect when authenticated routes are shown
vi.mock('../router', () => ({
  AppRoutes: () => <div data-testid="app-routes">AppRoutes</div>,
}))

// Mock LoginPage to detect when login is shown
vi.mock('../pages/auth/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">LoginPage</div>,
}))

// Mock MfaPage — not exercised in these smoke tests
vi.mock('../pages/auth/MfaPage', () => ({
  MfaPage: () => <div data-testid="mfa-page">MfaPage</div>,
}))

// Dynamic import after mocks are hoisted
const { AuthGate } = await import('../components/AuthGate')

describe('AuthGate', () => {
  it('renders LoginPage when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      login: vi.fn(),
      logout: vi.fn(),
      accessToken: null,
      refreshToken: null,
      companyId: null,
      userId: null,
    })

    render(<AuthGate />)

    // Should show login page, not app routes
    expect(screen.getByTestId('login-page')).toBeDefined()
    expect(screen.queryByTestId('app-routes')).toBeNull()
  })

  it('renders AppRoutes when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      companyId: 'test-company-id',
      userId: 'test-user-id',
    })

    render(<AuthGate />)

    // Should show app routes, not login page
    expect(screen.getByTestId('app-routes')).toBeDefined()
    expect(screen.queryByTestId('login-page')).toBeNull()
  })
})
