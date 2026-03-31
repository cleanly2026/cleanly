// D-02 (locked): Combined 14-state enum covering both order lifecycles.
// Application layer enforces valid transitions per order type.
export enum OrderStatus {
  // Shared states (both on_site and carpet)
  pending           = 'pending',
  accepted          = 'accepted',
  completed         = 'completed',
  cancelled         = 'cancelled',
  // On-site specific states
  washer_assigned   = 'washer_assigned',
  washer_en_route   = 'washer_en_route',
  in_progress       = 'in_progress',
  // Carpet specific states
  pickup_scheduled  = 'pickup_scheduled',
  picked_up         = 'picked_up',
  in_cleaning       = 'in_cleaning',
  ready_for_return  = 'ready_for_return',
  return_scheduled  = 'return_scheduled',
  out_for_return    = 'out_for_return',
  returned          = 'returned',
}

export type OrderType = 'on_site' | 'carpet'

// State machine: valid transitions per order type.
// Key: current status. Value: allowed next statuses.
export const VALID_TRANSITIONS: Record<OrderType, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  on_site: {
    [OrderStatus.pending]:          [OrderStatus.accepted,       OrderStatus.cancelled],
    [OrderStatus.accepted]:         [OrderStatus.washer_assigned, OrderStatus.cancelled],
    [OrderStatus.washer_assigned]:  [OrderStatus.washer_en_route, OrderStatus.cancelled],
    [OrderStatus.washer_en_route]:  [OrderStatus.in_progress],
    [OrderStatus.in_progress]:      [OrderStatus.completed],
  },
  carpet: {
    [OrderStatus.pending]:          [OrderStatus.accepted,        OrderStatus.cancelled],
    [OrderStatus.accepted]:         [OrderStatus.pickup_scheduled, OrderStatus.cancelled],
    [OrderStatus.pickup_scheduled]: [OrderStatus.picked_up,        OrderStatus.cancelled],
    [OrderStatus.picked_up]:        [OrderStatus.in_cleaning],
    [OrderStatus.in_cleaning]:      [OrderStatus.ready_for_return],
    [OrderStatus.ready_for_return]: [OrderStatus.return_scheduled],
    [OrderStatus.return_scheduled]: [OrderStatus.out_for_return],
    [OrderStatus.out_for_return]:   [OrderStatus.returned],
    [OrderStatus.returned]:         [OrderStatus.completed],
  },
}

export function isValidTransition(
  orderType: OrderType,
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  const allowed = VALID_TRANSITIONS[orderType][from]
  return allowed?.includes(to) ?? false
}
