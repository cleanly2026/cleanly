'use client'

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

export function RecentOrdersTable({ data }: { data: Order[] }) {
  const columns = [
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
    <DataTable
      columns={columns as Parameters<typeof DataTable>[0]['columns']}
      data={data as unknown as Record<string, unknown>[]}
      emptyMessage="No orders yet today. New bookings will appear here."
    />
  )
}
