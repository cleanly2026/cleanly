'use client'
import { useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/src/lib/api'
import { ReportIssueButton } from '@/src/components/report-issue-button'

interface OrderItem {
  id: string
  quantity: number
  unit_price: number
  package: {
    name_en: string
    name_ar: string
  }
}

interface Order {
  id: string
  type: 'car_wash' | 'sofa' | 'carpet'
  status: string
  amount_total: number
  created_at: string
  before_photo_url?: string | null
  after_photo_url?: string | null
  items: OrderItem[]
  company: {
    name_en: string
    name_ar: string
    logo_url?: string | null
  }
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  washer_assigned: 'Washer Assigned',
  washer_en_route: 'Washer En Route',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  awaiting_pickup: 'Awaiting Pickup',
  picked_up: 'Picked Up',
  cleaning: 'Cleaning',
  out_for_return: 'Out for Return',
  returned: 'Returned',
}

export default function OrderDetailPage() {
  const params = useParams()
  const locale = useLocale()
  const orderId = params.id as string

  const { data: order, isLoading, isError } = useQuery<Order>({
    queryKey: ['order', orderId],
    queryFn: () => apiFetch(`/customer/orders/${orderId}`),
    enabled: !!orderId,
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-brand-surface flex items-center justify-center">
        <p className="text-brand-navy/60">Loading order...</p>
      </div>
    )
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen bg-brand-surface flex items-center justify-center px-md">
        <p className="text-semantic-destructive">Order not found.</p>
      </div>
    )
  }

  const companyName = locale === 'ar' ? order.company.name_ar : order.company.name_en
  const orderNumber = `CLN-${order.id.slice(0, 8).toUpperCase()}`
  const statusLabel = STATUS_LABELS[order.status] ?? order.status

  return (
    <main className="min-h-screen bg-brand-surface px-md py-xl max-w-md mx-auto">
      {/* Order header */}
      <div className="bg-white rounded-2xl p-lg mb-md shadow-sm">
        <div className="flex items-start justify-between mb-sm">
          <div>
            <p className="text-label text-brand-navy/60 font-mono">{orderNumber}</p>
            <p className="text-body font-semibold text-brand-navy mt-xs">{companyName}</p>
          </div>
          <span className="text-xs font-medium px-sm py-xs bg-brand-navy/10 text-brand-navy rounded-full">
            {statusLabel}
          </span>
        </div>

        <p className="text-body font-semibold text-brand-gold mt-sm">
          AED {(order.amount_total / 100).toFixed(2)}
        </p>
      </div>

      {/* Order items */}
      {order.items.length > 0 && (
        <div className="bg-white rounded-2xl p-lg mb-md shadow-sm">
          <h2 className="text-sm font-semibold text-brand-navy mb-sm">Services</h2>
          <ul className="space-y-xs">
            {order.items.map((item) => {
              const pkgName = locale === 'ar' ? item.package.name_ar : item.package.name_en
              return (
                <li key={item.id} className="flex justify-between text-sm">
                  <span className="text-brand-navy/80">
                    {pkgName} × {item.quantity}
                  </span>
                  <span className="text-brand-navy font-medium">
                    AED {(item.unit_price / 100).toFixed(2)}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Before/After photos if available */}
      {(order.before_photo_url || order.after_photo_url) && (
        <div className="bg-white rounded-2xl p-lg mb-md shadow-sm">
          <h2 className="text-sm font-semibold text-brand-navy mb-sm">Photos</h2>
          <div className="flex gap-sm">
            {order.before_photo_url && (
              <div className="flex-1">
                <p className="text-xs text-brand-navy/60 mb-xs">Before</p>
                <img
                  src={order.before_photo_url}
                  alt="Before service"
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
            {order.after_photo_url && (
              <div className="flex-1">
                <p className="text-xs text-brand-navy/60 mb-xs">After</p>
                <img
                  src={order.after_photo_url}
                  alt="After service"
                  className="w-full h-32 object-cover rounded-lg"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Report Issue button — only shown for completed/returned orders */}
      <div className="mt-lg">
        <ReportIssueButton orderId={order.id} orderStatus={order.status} />
      </div>
    </main>
  )
}
