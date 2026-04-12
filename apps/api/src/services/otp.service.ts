import Twilio from 'twilio'
import { env } from '../lib/env.js'

const client = Twilio(
  env.TWILIO_ACCOUNT_SID,
  env.TWILIO_AUTH_TOKEN
)
const VERIFY_SID = env.TWILIO_VERIFY_SERVICE_SID

export async function sendOtp(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    await client.verify.v2.services(VERIFY_SID).verifications.create({
      to: `+${phone}`,  // phone stored without + prefix (e.g., 971501234567)
      channel: 'sms',
    })
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Twilio error'
    console.error('[OTP] Twilio send error:', message)
    return { success: false, error: message }
  }
}

export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const check = await client.verify.v2.services(VERIFY_SID).verificationChecks.create({
      to: `+${phone}`,
      code,
    })
    return { valid: check.status === 'approved' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Twilio error'
    console.error('[OTP] Twilio verify error:', message)
    return { valid: false, error: message }
  }
}
