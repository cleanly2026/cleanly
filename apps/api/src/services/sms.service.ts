import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function sendSms(to: string, body: string): Promise<void> {
  if (!process.env.TWILIO_PHONE_NUMBER) {
    console.warn('[SMS] TWILIO_PHONE_NUMBER not set -- skipping SMS')
    return
  }
  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to, // E.164 format: +971XXXXXXXX
  })
}
