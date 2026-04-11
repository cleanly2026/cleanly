import { prisma } from '../lib/prisma.js'
import { isValidTransition, OrderStatus, type OrderType } from '@cleanly/types'
import { addDays } from 'date-fns'

// Compute order total server-side — NEVER accept amounts from client (Pitfall 3)
export async function computeOrderTotal(params: {
  packageId: string
  quantity: number
  addOnIds: string[]
}): Promise<{
  amountSubtotal: number
  platformFee: number
  amountTotal: number
  companyId: string
  stripeAccountId: string | null
  commissionRate: number
  packagePrice: number
  addOnsTotal: number
}> {
  const pkg = await prisma.package.findUniqueOrThrow({
    where: { id: params.packageId },
    include: {
      company: { select: { id: true, commission_rate: true, stripe_account_id: true } },
      add_ons: {
        where: { id: { in: params.addOnIds }, is_active: true },
      },
    },
  })

  const packagePrice = pkg.base_price * params.quantity
  const addOnsTotal = pkg.add_ons.reduce((sum, a) => sum + a.price, 0)
  const amountSubtotal = packagePrice + addOnsTotal
  const platformFee = Math.round((amountSubtotal * pkg.company.commission_rate) / 100)
  const amountTotal = amountSubtotal + platformFee

  return {
    amountSubtotal,
    platformFee,
    amountTotal,
    companyId: pkg.company.id,
    stripeAccountId: pkg.company.stripe_account_id,
    commissionRate: pkg.company.commission_rate,
    packagePrice: pkg.base_price,
    addOnsTotal,
  }
}

// Compute carpet return date from pickup_time + company carpet_lead_time_days (CARP-03)
export async function computeCarpetReturnDate(companyId: string, pickupTime: Date): Promise<Date> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { carpet_lead_time_days: true },
  })
  return addDays(pickupTime, company.carpet_lead_time_days)
}

// State transition with row-level locking (ORD-05, D-19, Pitfall 6)
export async function transitionOrderStatus(
  orderId: string,
  targetStatus: OrderStatus,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Acquire row-level lock — prevents concurrent transitions
    await tx.$executeRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`

    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } })

    const orderType = order.type as OrderType
    if (!isValidTransition(orderType, order.status as OrderStatus, targetStatus)) {
      throw new Error(`Invalid transition: ${order.status} -> ${targetStatus}`)
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: targetStatus,
        ...(targetStatus === OrderStatus.completed ? { completed_at: new Date() } : {}),
      },
    })
  })
}
