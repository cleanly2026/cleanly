import Stripe from 'stripe'

let _stripe: Stripe | undefined

function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is not set — add it to apps/api/.env')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-03-25.dahlia',
    })
  }
  return _stripe
}

// Lazy proxy: server boots without STRIPE_SECRET_KEY, fails only when Stripe is actually used
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) { return Reflect.get(getStripe(), prop) },
})

// Create PaymentIntent with destination charge (PAY-01, PAY-03)
// Per research: use transfer_data.destination, NOT on_behalf_of (UAE restriction)
export async function createPaymentIntent(params: {
  amountTotal: number    // in fils, computed server-side
  platformFee: number    // in fils, computed from commission_rate
  stripeAccountId: string
  orderId: string
  companyId: string
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amountTotal,
    currency: 'aed',
    automatic_payment_methods: { enabled: true },
    application_fee_amount: params.platformFee,
    transfer_data: {
      destination: params.stripeAccountId,
    },
    metadata: {
      order_id: params.orderId,
      company_id: params.companyId,
    },
  })

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  }
}

// Create refund with reverse transfer (PAY-06)
export async function createRefund(paymentIntentId: string): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    reverse_transfer: true,
    refund_application_fee: true,
  })
}

// Create partial refund for admin dispute resolution (ADM-05, D-12)
export async function createPartialRefund(
  paymentIntentId: string,
  amountFils: number,
  reason?: string
): Promise<Stripe.Refund> {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountFils,
    reason: (reason as Stripe.RefundCreateParams.Reason) ?? 'requested_by_customer',
    reverse_transfer: true,
    refund_application_fee: false,
  })
}

// Create Stripe Connect AccountLink for company onboarding (COMP-07)
export async function createAccountLink(
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  })
  return link.url
}

// Create Stripe Connect Express account for company (COMP-07)
export async function createConnectAccount(companyEmail: string): Promise<string> {
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'AE',
    email: companyEmail,
    capabilities: {
      transfers: { requested: true },
    },
    business_type: 'company',
  })
  return account.id
}
