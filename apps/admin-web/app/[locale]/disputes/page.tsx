'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { adminFetch } from '../../../src/lib/api'
import { DataTable } from '../../../src/components/data-table'
import { StatusBadge } from '../../../src/components/status-badge'

type DisputeStatus = 'open' | 'resolved'

interface Dispute {
  id: string
  reason: string
  status: DisputeStatus
  note?: string | null
  created_at: string
  order: {
    id: string
    customer: {
      phone: string
    }
  }
}

// Flatten Dispute for DataTable compatibility
interface DisputeRow extends Record<string, unknown> {
  id: string
  order_id: string
  customer_phone: string
  reason: string
  status: DisputeStatus
  created_at: string
}

interface DisputesResponse {
  disputes: Dispute[]
  total: number
  page: number
  limit: number
}

type FilterStatus = 'all' | 'open' | 'resolved'

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'resolved', label: 'Resolved' },
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

function toDisputeRow(d: Dispute): DisputeRow {
  return {
    id: d.id,
    order_id: d.order.id,
    customer_phone: d.order.customer.phone,
    reason: d.reason,
    status: d.status,
    created_at: d.created_at,
  }
}

export default function DisputesPage() {
  const router = useRouter()
  const params = useParams()
  const locale = (params?.locale as string) ?? 'en'

  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<DisputesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDisputes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const statusParam = filterStatus !== 'all' ? `&status=${filterStatus}` : ''
      const result = await adminFetch<DisputesResponse>(
        `/api/admin/disputes?page=${page}&limit=10${statusParam}`
      )
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load disputes')
    } finally {
      setIsLoading(false)
    }
  }, [filterStatus, page])

  useEffect(() => {
    void fetchDisputes()
  }, [fetchDisputes])

  function handleFilterChange(status: FilterStatus) {
    setFilterStatus(status)
    setPage(1)
  }

  const columns = [
    {
      key: 'order_id',
      label: 'Order ID',
      render: (row: DisputeRow) => (
        <span className="font-mono text-brand-navy">{formatOrderId(String(row.order_id))}</span>
      ),
    },
    {
      key: 'customer_phone',
      label: 'Customer Phone',
      render: (row: DisputeRow) => (
        <span dir="ltr" className="font-mono">{String(row.customer_phone)}</span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (row: DisputeRow) => (
        <span className="capitalize">{String(row.reason).replace(/_/g, ' ')}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: DisputeRow) => <StatusBadge status={String(row.status)} />,
    },
    {
      key: 'created_at',
      label: 'Date',
      render: (row: DisputeRow) => <span>{formatDate(String(row.created_at))}</span>,
    },
  ]

  const rows = (data?.disputes ?? []).map(toDisputeRow)

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <h1 className="text-heading font-semibold text-brand-navy">Disputes</h1>
      </div>

      {/* Error banner */}
      {error && (
        <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded flex items-center justify-between">
          <p className="text-semantic-destructive text-body">{error}</p>
          <button
            type="button"
            onClick={() => void fetchDisputes()}
            className="text-label text-semantic-destructive underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-sm flex-wrap">
        <span className="text-label font-semibold text-gray-500">Status:</span>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleFilterChange(opt.value)}
            className={[
              'px-md py-xs rounded-full text-label font-semibold transition-colors',
              filterStatus === opt.value
                ? 'bg-brand-navy text-white'
                : 'bg-brand-muted text-gray-600 hover:bg-brand-muted/80',
            ].join(' ')}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows}
        onRowClick={(row) => router.push(`/${locale}/disputes/${String(row.id)}`)}
        isLoading={isLoading}
        emptyMessage="No disputes reported. Resolved disputes appear in Orders history."
        totalCount={data?.total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
      />
    </div>
  )
}
