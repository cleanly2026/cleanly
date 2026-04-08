const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000') + '/api'

export async function companyLogin(
  email: string,
  password: string
): Promise<{ requiresMfa?: boolean; sessionToken?: string; accessToken?: string; refreshToken?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/company/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.status === 401) return { error: 'wrong_credentials' }
    if (res.status === 429) return { error: 'rate_limited' }
    if (!res.ok)            return { error: 'network' }
    return res.json()
  } catch {
    return { error: 'network' }
  }
}

export async function verifyMfa(
  email: string,
  token: string,
  sessionToken: string
): Promise<{ accessToken?: string; refreshToken?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/company/mfa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, token, sessionToken }),
    })
    if (res.status === 401) return { error: 'invalid_totp' }
    if (!res.ok)            return { error: 'network' }
    return res.json()
  } catch {
    return { error: 'network' }
  }
}
