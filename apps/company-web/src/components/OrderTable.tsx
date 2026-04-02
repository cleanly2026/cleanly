// Full-width data table per UI-SPEC Screen 9.
// Uses text-start (not text-left) for RTL compliance.
// No ml-/mr-/pl-/pr-/text-left/text-right classes — all logical properties.
import { useTranslation } from 'react-i18next'
import { StatusBadge } from './StatusBadge'
import { WasherAssignDropdown } from './WasherAssignDropdown'

interface Washer {
  id: string
  name: string
}

interface Order {
  id: string
  order_number: string
  customer_name: string
  service_category: string
  status: string
  total_amount: number
  created_at: string
  washer: Washer | null
}

interface OrderTableProps {
  orders: Order[]
  isLoading: boolean
}

export function OrderTable({ orders, isLoading }: OrderTableProps) {
  const { t } = useTranslation()

  if (isLoading) {
    // 5 skeleton rows per UI-SPEC Loading States
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-semibold text-blue-900">
          {t('dashboard.noOrdersHeading')}
        </p>
        <p className="text-sm text-blue-900/60 mt-2">
          {t('dashboard.noOrdersBody')}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-start text-xs font-semibold py-2 px-4 text-gray-600">
              {t('dashboard.orderNumber')}
            </th>
            <th className="text-start text-xs font-semibold py-2 px-4 text-gray-600">
              {t('dashboard.customer')}
            </th>
            <th className="text-start text-xs font-semibold py-2 px-4 text-gray-600">
              {t('dashboard.service')}
            </th>
            <th className="text-start text-xs font-semibold py-2 px-4 text-gray-600">
              {t('dashboard.status')}
            </th>
            <th className="text-start text-xs font-semibold py-2 px-4 text-gray-600">
              {t('dashboard.time')}
            </th>
            <th className="text-start text-xs font-semibold py-2 px-4 text-gray-600">
              {t('dashboard.amount')}
            </th>
            <th className="text-start text-xs font-semibold py-2 px-4 text-gray-600">
              {t('dashboard.actions')}
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150"
            >
              <td className="py-3 px-4 font-mono text-xs text-gray-900">
                {order.order_number}
              </td>
              <td className="py-3 px-4 text-sm text-gray-900">
                {order.customer_name}
              </td>
              <td className="py-3 px-4 text-xs text-gray-700">
                {order.service_category}
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={order.status} />
              </td>
              <td className="py-3 px-4 text-xs text-gray-700">
                {new Date(order.created_at).toLocaleString()}
              </td>
              <td className="py-3 px-4 font-mono text-xs text-gray-900">
                {/* amount stored in fils — divide by 100 for AED */}
                AED {(order.total_amount / 100).toFixed(2)}
              </td>
              <td className="py-3 px-4">
                {order.status === 'accepted' && !order.washer ? (
                  <WasherAssignDropdown orderId={order.id} />
                ) : order.washer ? (
                  <span className="text-xs text-gray-700">{order.washer.name}</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
