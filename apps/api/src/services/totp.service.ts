// IMPORTANT: Uses otplib v13.4.0 ESM API — no 'authenticator' named export in v13.
import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'

export function generateTotpSecret(): string {
  return generateSecret()
}

export async function generateTotpQrCode(email: string, secret: string): Promise<string> {
  const otpauth = generateURI({ issuer: 'Cleanly Admin', label: email, secret })
  return QRCode.toDataURL(otpauth)
}

export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const { valid } = verifySync({ secret, token })
    return valid
  } catch {
    return false
  }
}
