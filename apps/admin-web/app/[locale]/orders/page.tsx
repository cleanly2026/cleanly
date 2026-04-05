'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { adminFetch } from '../../../src/lib/api'
import { DataTable } from '../../../src/components/data-table'
import { StatusBadge } from '../../../src/components/status-badge'

type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'washer_assigned'
  | 'washer_en_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'carpet_picked_up'
  | 'carpet_cleaning'
  | 'carpet_out_for_return'
  | 'carpet_returned'

interface Order {
  id: string
  type: string
  status: OrderStatus
  amount_total: number
  created_at: string
  customer: {
    phone: string
  }
  company: {
    name_en: string
  }
}

interface OrderRow extends Record<string, unknown> {
  id: string
  order_number: string
  type: string
  status: string
  customer_phone: string
  company_name: string
  amount_total: number
  created_at: string
}

interface OrdersResponse {
  orders: Order[]
  total: number
  page: number
  limit: number
}

type StatusFilter = 'all' | OrderStatus

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'washer_assigned', label: 'Washer Assigned' },
  { value: 'washer_en_route', label: 'Washer En Route' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'carpet_picked_up', label: 'Carpet Picked Up' },
  { value: 'carpet_cleaning', label: 'Carpet Cleaning' },
  { value: 'carpet_out_for_return', label: 'Carpet Out for Return' },
  { value: 'carpet_returned', label: 'Carpet Returned' },
]

function formatOrderId(id: string): string {
  return `CLN-${id.slice(0, 8).toUpperCase()}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatAed(fils: number): string {
  return `AED ${(fils / 100).toFixed(2)}`
}

function toOrderRow(o: Order): OrderRow {
  return {
    id: o.id,
    order_number: formatOrderId(o.id),
    type: o.type,
    status: o.status,
    customer_phone: o.customer.phone,
    company_name: o.company.name_en,
    amount_total: o.amount_total,
    created_at: o.created_at,
  }
}

export default function OrdersPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<OrdersResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOrders = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : ''
      const result = await adminFetch<OrdersResponse>(
        `/api/admin/orders?page=${page}&limit=10${statusParam}`
      )
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    void fetchOrders()
  }, [fetchOrders])

  function handleStatusChange(status: StatusFilter) {
    setStatusFilter(status)
    setPage(1)
  }

  const columns = [
    {
      key: 'order_number',
      label: 'Order #',
      render: (row: OrderRow) => (
        <span className="font-mono text-brand-navy">{String(row.order_number)}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (row: OrderRow) => (
        <span className="capitalize">{String(row.type).replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: OrderRow) => <StatusBadge status={String(row.status)} />,
    },
    {
      key: 'customer_phone',
      label: 'Customer Phone',
      render: (row: OrderRow) => (
        <span dir="ltr" className="font-mono">{String(row.customer_phone)}</span>
      ),
    },
    {
      key: 'company_name',
      label: 'Company',
      render: (row: OrderRow) => <span>{String(row.company_name)}</span>,
    },
    {
      key: 'amount_total',
      label: 'Amount',
      render: (row: OrderRow) => (
        <span dir="ltr">{formatAed(Number(row.amount_total))}</span>
      ),
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (row: OrderRow) => <span>{formatDate(String(row.created_at))}</span>,
    },
  ]

  const rows = (data?.orders ?? []).map(toOrderRow)

  return (
    <div className="space-y-lg">
      {/* Header */}
      <h1 className="text-heading font-semibold text-brand-navy">Orders</h1>

      {/* Error banner */}
      {error && (
        <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded flex items-center justify-between">
          <p className="text-semantic-destructive text-body">{error}</p>
          <button
            type="button"
            onClick={() => void fetchOrders()}
            className="text-label text-semantic-destructive underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-sm flex-wrap">
        <label htmlFor="status-filter" className="text-label font-semibold text-gray-500">
          Status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => handleStatusChange(e.target.value as StatusFilter)}
          className="px-sm py-xs border border-brand-muted rounded text-label bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows}
        onRowClick={(row) => router.push(`/${locale}/orders/${String(row.id)}`)}
        isLoading={isLoading}
        emptyMessage="No orders found."
        totalCount={data?.total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
      />
    </div>
  )
}
