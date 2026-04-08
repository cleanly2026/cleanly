import type { Socket } from 'socket.io'
import { prisma } from './prisma.js'
import { orderQueue } from './queue.js'
import { transitionOrderStatus } from '../services/order.service.js'
import { getIO } from './socket.js'
import { OrderStatus } from '@cleanly/types'

export function registerJobDispatchHandlers(socket: Socket) {
  // INT-04 fix: Handle job:accept from washer — transition order to washer_en_route
  socket.on('job:accept', async ({ orderId }: { orderId: string }) => {
    const washerId = (socket as any).userId as string | undefined

    if (!washerId) {
      socket.emit('job:error', { orderId, message: 'Not authenticated' })
      return
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      socket.emit('job:error', { orderId, message: 'Order not found' })
      return
    }

    if (order.washer_id !== washerId) {
      socket.emit('job:error', { orderId, message: 'Not assigned to this order' })
      return
    }

    try {
      await transitionOrderStatus(orderId, OrderStatus.washer_en_route)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transition failed'
      socket.emit('job:error', { orderId, message })
      return
    }

    // Cancel 30s BullMQ timer (ORD-04)
    const timerJob = await orderQueue.getJob(`washer-timeout-${orderId}`)
    if (timerJob) await timerJob.remove()

    // Notify company and customer rooms of status change
    const io = getIO()
    io.to(`company:${order.company_id}`).emit('order:status-changed', {
      orderId,
      status: 'washer_en_route',
    })
    io.to(`order:${orderId}`).emit('order:status-changed', {
      orderId,
      status: 'washer_en_route',
    })

    socket.emit('job:accepted', { orderId })
  })

  // INT-04 fix: Handle job:decline from washer — revert order to accepted with washer cleared
  socket.on('job:decline', async ({ orderId }: { orderId: string }) => {
    const washerId = (socket as any).userId as string | undefined

    if (!washerId) {
      socket.emit('job:error', { orderId, message: 'Not authenticated' })
      return
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) {
      socket.emit('job:error', { orderId, message: 'Order not found' })
      return
    }

    if (order.washer_id !== washerId) {
      socket.emit('job:error', { orderId, message: 'Not assigned to this order' })
      return
    }

    // D-03: Revert order to accepted state with washer_id cleared (direct update — not via transitionOrderStatus)
    await prisma.order.update({
      where: { id: orderId },
      data: { washer_id: null, status: 'accepted' },
    })

    // Cancel 30s BullMQ timer (ORD-04)
    const timerJob = await orderQueue.getJob(`washer-timeout-${orderId}`)
    if (timerJob) await timerJob.remove()

    // Notify company room of revert
    const io = getIO()
    io.to(`company:${order.company_id}`).emit('order:status-changed', {
      orderId,
      status: 'accepted',
    })

    socket.emit('job:declined', { orderId })
  })
}
