const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000') + '/api'

export async function sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `971${phone}` }), // prepend country code
    })
    if (res.status === 429) {
      return { success: false, error: 'rate_limited' }
    }
    if (!res.ok) {
      return { success: false, error: 'network' }
    }
    return { success: true }
  } catch {
    return { success: false, error: 'network' }
  }
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ accessToken?: string; refreshToken?: string; error?: string }> {
  try {
    const res = await fetch(`${API_URL}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `971${phone}`, code }),
    })
    if (res.status === 401) {
      const body = await res.json()
      return { error: body.message === 'Invalid or expired OTP code' ? 'invalid_otp' : 'network' }
    }
    if (!res.ok) return { error: 'network' }
    return res.json()
  } catch {
    return { error: 'network' }
  }
}
