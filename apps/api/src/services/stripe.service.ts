import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export { stripe }

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
