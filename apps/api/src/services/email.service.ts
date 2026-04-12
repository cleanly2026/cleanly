import { Resend } from 'resend'
import { OrderReceiptEmail } from '../emails/order-receipt.js'
import { CompanyRejectionEmail } from '../emails/company-rejection.js'
import { env } from '../lib/env.js'

const resend = new Resend(env.RESEND_API_KEY)

export async function sendOrderReceipt(params: {
  to: string
  orderId: string
  orderNumber: string
  language: 'en' | 'ar'
  serviceName: string
  amountTotal: number // in fils
  platformFee: number // in fils
  companyName: string
  completedAt: string // ISO date string
}): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set -- skipping email')
    return
  }
  await resend.emails.send({
    from: 'Cleanly <receipts@cleanly.ae>',
    to: params.to,
    subject: params.language === 'ar'
      ? `ايصال طلبك #${params.orderNumber}`
      : `Your Order Receipt #${params.orderNumber}`,
    react: OrderReceiptEmail(params),
  })
}

export async function sendCompanyRejectionEmail(params: {
  to: string
  companyName: string
  reason: string
  language: 'en' | 'ar'
}): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set -- skipping email')
    return
  }
  await resend.emails.send({
    from: 'Cleanly <noreply@cleanly.ae>',
    to: params.to,
    subject: params.language === 'ar'
      ? '\u062A\u0645 \u0631\u0641\u0636 \u0637\u0644\u0628 \u0634\u0631\u0643\u062A\u0643\u0645 - Cleanly'
      : 'Company Application Rejected - Cleanly',
    react: CompanyRejectionEmail({
      companyName: params.companyName,
      reason: params.reason,
      language: params.language,
    }),
  })
}
