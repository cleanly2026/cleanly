import { Resend } from 'resend'
import { OrderReceiptEmail } from '../emails/order-receipt.js'

const resend = new Resend(process.env.RESEND_API_KEY)

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
  if (!process.env.RESEND_API_KEY) {
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
