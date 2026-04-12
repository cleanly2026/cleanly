import twilio from 'twilio'
import { env } from '../lib/env.js'

const client = twilio(
  env.TWILIO_ACCOUNT_SID,
  env.TWILIO_AUTH_TOKEN
)

export async function sendSms(to: string, body: string): Promise<void> {
  if (!env.TWILIO_PHONE_NUMBER) {
    console.warn('[SMS] TWILIO_PHONE_NUMBER not set -- skipping SMS')
    return
  }
  await client.messages.create({
    body,
    from: env.TWILIO_PHONE_NUMBER,
    to, // E.164 format: +971XXXXXXXX
  })
}
