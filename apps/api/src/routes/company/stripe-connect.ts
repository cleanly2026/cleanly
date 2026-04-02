import type { FastifyInstance } from 'fastify'
import { prisma } from '../../lib/prisma.js'
import { createConnectAccount, createAccountLink } from '../../services/stripe.service.js'

export async function stripeConnectRoutes(fastify: FastifyInstance) {
  // POST /company/stripe-connect/onboard — initiate Stripe Connect onboarding (COMP-07)
  // Per research Pitfall 1 — UAE Express is not self-serve. Build the UI to show
  // "pending activation" state. Do not block all company features on Connect status.
  fastify.post('/onboard', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } })

    let stripeAccountId = company.stripe_account_id

    // Create Connect account if not yet created
    if (!stripeAccountId) {
      // Use the company admin's email for the Connect account
      const admin = await prisma.user.findFirst({
        where: { company_id: companyId, role: 'company_member' },
        select: { email: true },
      })
      stripeAccountId = await createConnectAccount(admin?.email ?? '')
      await prisma.company.update({
        where: { id: companyId },
        data: { stripe_account_id: stripeAccountId },
      })
    }

    // Create AccountLink for hosted onboarding
    const refreshUrl = `${process.env.COMPANY_WEB_URL || 'http://localhost:3002'}/onboarding/stripe-connect?refresh=true`
    const returnUrl = `${process.env.COMPANY_WEB_URL || 'http://localhost:3002'}/onboarding/stripe-connect?success=true`

    const url = await createAccountLink(stripeAccountId, refreshUrl, returnUrl)
    return { url }
  })

  // GET /company/stripe-connect/status — check Connect account status
  fastify.get('/status', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const companyId = (request.user as any).companyId
    if (!companyId) return reply.status(403).send({ error: 'Not a company member' })

    const company = await prisma.company.findUniqueOrThrow({
      where: { id: companyId },
      select: { stripe_account_id: true },
    })

    if (!company.stripe_account_id) {
      return { connected: false, status: 'not_started' }
    }

    // Note: Full status check via Stripe API would be done here
    // For now, having an account_id means onboarding was initiated
    return { connected: true, status: 'pending_activation', account_id: company.stripe_account_id }
  })
}
