import { env } from '../lib/env.js'

export async function sendWhatsAppTemplate(params: {
  to: string // E.164 format
  templateName: string // pre-approved Meta template name
  language: 'en' | 'ar'
  components?: unknown[]
}): Promise<void> {
  // WHATSAPP_ENABLED gate: skip entirely when disabled
  if (!env.WHATSAPP_ENABLED) {
    console.warn('WhatsApp disabled — WHATSAPP_ENABLED is false, skipping send')
    return
  }

  const apiKey = env.DIALOG360_API_KEY
  if (!apiKey) {
    console.warn('[WhatsApp] DIALOG360_API_KEY not set -- skipping WhatsApp')
    return
  }
  const res = await fetch('https://waba-v2.360dialog.io/messages', {
    method: 'POST',
    headers: {
      'D360-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: { code: params.language === 'ar' ? 'ar' : 'en_US' },
        components: params.components ?? [],
      },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`[360dialog] ${res.status}: ${err}`)
  }
}
