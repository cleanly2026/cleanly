// IMPORTANT: Uses otplib v13.4.0, NOT speakeasy (unmaintained since 2019).
import { authenticator } from 'otplib'
import QRCode from 'qrcode'

// Defaults: 30-second window, SHA1 HMAC, 6-digit token — matches Google Authenticator.
// otplib handles clock skew tolerance automatically.

export function generateTotpSecret(): string {
  return authenticator.generateSecret()
}

export async function generateTotpQrCode(email: string, secret: string): Promise<string> {
  const otpauth = authenticator.keyuri(email, 'Cleanly Admin', secret)
  return QRCode.toDataURL(otpauth)
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    return authenticator.verify({ token, secret })
  } catch {
    return false
  }
}
