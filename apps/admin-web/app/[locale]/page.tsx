import { adminFetch } from '../../src/lib/api'
import { StatCard } from '../../src/components/stat-card'
import { DataTable } from '../../src/components/data-table'
import { StatusBadge } from '../../src/components/status-badge'

interface Order {
  id: string
  service_type: string
  status: string
  company_name?: string
  amount_total: number
  created_at: string
}

interface OrdersResponse {
  orders: Order[]
  total: number
}

interface CompaniesResponse {
  total: number
}

interface DisputesResponse {
  total: number
}

// Stat icons as inline SVG
function OrdersIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  )
}

function WasherIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function PendingIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" />
    </svg>
  )
}

function DisputesIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  )
}

async function getStats() {
  const [ordersData, pendingData, disputesData] = await Promise.allSettled([
    adminFetch<OrdersResponse>('/api/admin/orders?page=1&limit=10'),
    adminFetch<CompaniesResponse>('/api/admin/companies?status=pending&limit=1'),
    adminFetch<DisputesResponse>('/api/admin/disputes?status=open&limit=1'),
  ])

  const ordersResult = ordersData.status === 'fulfilled' ? ordersData.value : null
  const pendingResult = pendingData.status === 'fulfilled' ? pendingData.value : null
  const disputesResult = disputesData.status === 'fulfilled' ? disputesData.value : null

  return {
    ordersToday: ordersResult?.total ?? 0,
    pendingReviews: pendingResult?.total ?? 0,
    recentOrders: ordersResult?.orders ?? [],
    totalOrders: ordersResult?.total ?? 0,
    openDisputes: disputesResult?.total ?? 0,
  }
}

function formatOrderId(id: string): string {
  return `CLN-${id.slice(0, 8).toUpperCase()}`
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-AE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default async function DashboardPage() {
  const stats = await getStats().catch(() => ({
    ordersToday: 0,
    pendingReviews: 0,
    recentOrders: [] as Order[],
    totalOrders: 0,
    openDisputes: 0,
  }))

  const orderColumns = [
    {
      key: 'id',
      label: 'Order ID',
      render: (row: Order) => (
        <span className="font-mono text-label text-brand-navy">{formatOrderId(row.id)}</span>
      ),
    },
    { key: 'service_type', label: 'Type' },
    {
      key: 'status',
      label: 'Status',
      render: (row: Order) => <StatusBadge status={row.status} />,
    },
    { key: 'company_name', label: 'Company', render: (row: Order) => row.company_name ?? '—' },
    {
      key: 'amount_total',
      label: 'Amount',
      render: (row: Order) => `AED ${Number(row.amount_total).toFixed(2)}`,
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (row: Order) => formatDate(row.created_at),
    },
  ]

  return (
    <div className="space-y-lg">
      <h1 className="text-heading font-semibold text-brand-navy">Dashboard</h1>

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard label="Orders Today" value={stats.ordersToday} icon={<OrdersIcon />} />
        <StatCard label="Active Washers" value={0} icon={<WasherIcon />} />
        <StatCard label="Pending Reviews" value={stats.pendingReviews} icon={<PendingIcon />} />
        <StatCard label="Open Disputes" value={stats.openDisputes} icon={<DisputesIcon />} />
      </div>

      {/* Recent orders table */}
      <section>
        <h2 className="text-heading font-semibold text-brand-navy mb-md">Recent Orders</h2>
        <DataTable
          columns={orderColumns as Parameters<typeof DataTable>[0]['columns']}
          data={stats.recentOrders as unknown as Record<string, unknown>[]}
          emptyMessage="No orders yet today. New bookings will appear here."
        />
      </section>
    </div>
  )
}
