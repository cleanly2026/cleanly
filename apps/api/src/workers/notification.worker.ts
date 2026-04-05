import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { sendPushNotification } from '../services/push.service.js'
import { sendSms } from '../services/sms.service.js'
import { sendWhatsAppTemplate } from '../services/whatsapp.service.js'
import { sendOrderReceipt, sendCompanyRejectionEmail } from '../services/email.service.js'
import { getNotificationCopy, WHATSAPP_TEMPLATE_MAP, SMS_COPY } from '../services/notification-copy.js'

// Idempotency key TTL — 7 days prevents double-sends on BullMQ retry
const SENT_KEY_TTL = 7 * 24 * 60 * 60

const worker = new Worker(
  'notifications',
  async (job) => {
    // Idempotency: check if this job was already processed
    const alreadySent = await redis.get(`job:sent:${job.id}`)
    if (alreadySent) {
      console.log(`[Notification] Job ${job.id} already processed -- skipping`)
      return { skipped: true }
    }

    const { language = 'en' } = job.data as { language?: 'en' | 'ar' }

    switch (job.name) {
      case 'send-push': {
        const { pushToken, event, orderId, data } = job.data as {
          pushToken: string
          event: string
          orderId: string
          data?: Record<string, unknown>
        }
        const copy = getNotificationCopy(event, language)

        // Replace {placeholder} markers with job data values
        let body = copy.body
        let title = copy.title
        if (data) {
          for (const [key, val] of Object.entries(data)) {
            body = body.replace(`{${key}}`, String(val))
            title = title.replace(`{${key}}`, String(val))
          }
        }

        await sendPushNotification({ pushToken, title, body, data: { orderId, event } })
        break
      }

      case 'send-sms': {
        const { phone, event, data } = job.data as {
          phone: string
          event: string
          data?: Record<string, string>
        }
        const smsCopy = SMS_COPY[language]?.[event]
        if (smsCopy) {
          let text = smsCopy
          if (data) {
            for (const [key, val] of Object.entries(data)) {
              text = text.replace(`{${key}}`, val)
            }
          }
          await sendSms(phone, text)
        } else {
          console.warn(`[Notification] No SMS copy for event: ${event} language: ${language}`)
        }
        break
      }

      case 'send-whatsapp': {
        const { phone, event } = job.data as { phone: string; event: string }
        const templateName = WHATSAPP_TEMPLATE_MAP[event]
        if (templateName) {
          await sendWhatsAppTemplate({ to: phone, templateName, language })
        } else {
          console.warn(`[Notification] No WhatsApp template for event: ${event}`)
        }
        break
      }

      case 'send-email-receipt': {
        const {
          email,
          orderId,
          orderNumber,
          serviceName,
          amountTotal,
          platformFee,
          companyName,
          completedAt,
        } = job.data as {
          email: string
          orderId: string
          orderNumber: string
          serviceName: string
          amountTotal: number
          platformFee: number
          companyName: string
          completedAt: string
        }
        await sendOrderReceipt({
          to: email,
          orderId,
          orderNumber,
          language,
          serviceName,
          amountTotal,
          platformFee,
          companyName,
          completedAt,
        })
        break
      }

      case 'send-company-rejection-email': {
        const { email, companyName, reason, language: lang } = job.data as {
          email: string; companyName: string; reason: string; language: 'en' | 'ar'
        }
        await sendCompanyRejectionEmail({ to: email, companyName, reason, language: lang ?? 'en' })
        break
      }

      default:
        console.warn(`[Notification] Unknown job name: ${job.name}`)
    }

    await redis.set(`job:sent:${job.id}`, '1', 'EX', SENT_KEY_TTL)
    return { sent: true, jobId: job.id, channel: job.name }
  },
  {
    connection: redis,
    concurrency: 5,
  }
)

worker.on('completed', (job) => {
  console.log(`[Notification] ${job.name} ${job.id} completed`)
})

worker.on('failed', (job, err) => {
  console.error(`[Notification] ${job?.name} ${job?.id} failed:`, err.message)
})

// Graceful shutdown — CRITICAL to avoid stalled jobs on Railway/Fly.io deploy
async function shutdown(signal: string) {
  console.log(`[Notification] Received ${signal} -- shutting down gracefully`)
  await worker.close()
  await redis.quit()
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

console.log('[Notification] Worker started -- listening for send-push, send-sms, send-whatsapp, send-email-receipt, send-company-rejection-email')
