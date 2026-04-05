'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { adminFetch } from '../../../src/lib/api'
import { DataTable } from '../../../src/components/data-table'

interface AuditEntry {
  id: string
  action: string
  entity: string
  entity_id: string
  admin_id: string
  created_at: string
}

interface AuditEntryRow extends Record<string, unknown> {
  id: string
  action: string
  entity: string
  entity_id: string
  admin_id: string
  created_at: string
  formatted_time: string
}

interface AuditLogResponse {
  entries: AuditEntry[]
  total: number
  page: number
  limit: number
}

const ACTION_OPTIONS = [
  { value: '', label: 'All Actions' },
  { value: 'company.verify', label: 'company.verify' },
  { value: 'company.reject', label: 'company.reject' },
  { value: 'dispute.resolve', label: 'dispute.resolve' },
  { value: 'dispute.refund', label: 'dispute.refund' },
  { value: 'city.create', label: 'city.create' },
  { value: 'city.update', label: 'city.update' },
  { value: 'city.delete', label: 'city.delete' },
]

function formatTimestamp(dateStr: string): string {
  return new Intl.DateTimeFormat('en-AE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateStr))
}

function toAuditRow(e: AuditEntry): AuditEntryRow {
  return {
    id: e.id,
    action: e.action,
    entity: e.entity,
    entity_id: e.entity_id,
    admin_id: e.admin_id,
    created_at: e.created_at,
    formatted_time: formatTimestamp(e.created_at),
  }
}

export default function AuditLogPage() {
  const params = useParams()
  const _locale = (params?.locale as string) ?? 'en'

  const [actionFilter, setActionFilter] = useState('')
  const [adminFilter, setAdminFilter] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<AuditLogResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAuditLog = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams({ page: String(page), limit: '20' })
      if (actionFilter) queryParams.set('action', actionFilter)
      if (adminFilter.trim()) queryParams.set('admin_id', adminFilter.trim())

      const result = await adminFetch<AuditLogResponse>(
        `/api/admin/audit-log?${queryParams.toString()}`
      )
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log')
    } finally {
      setIsLoading(false)
    }
  }, [actionFilter, adminFilter, page])

  useEffect(() => {
    void fetchAuditLog()
  }, [fetchAuditLog])

  function handleActionChange(action: string) {
    setActionFilter(action)
    setPage(1)
  }

  function handleAdminSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPage(1)
    void fetchAuditLog()
  }

  const columns = [
    {
      key: 'action',
      label: 'Action',
      render: (row: AuditEntryRow) => (
        <code className="text-label bg-brand-muted px-xs py-xs rounded font-mono">
          {String(row.action)}
        </code>
      ),
    },
    {
      key: 'entity',
      label: 'Entity',
      render: (row: AuditEntryRow) => (
        <span className="capitalize">{String(row.entity)}</span>
      ),
    },
    {
      key: 'entity_id',
      label: 'Entity ID',
      render: (row: AuditEntryRow) => (
        <span className="font-mono text-label text-gray-500">{String(row.entity_id).slice(0, 8)}…</span>
      ),
    },
    {
      key: 'admin_id',
      label: 'Admin ID',
      render: (row: AuditEntryRow) => (
        <span className="font-mono text-label text-gray-500">{String(row.admin_id).slice(0, 8)}…</span>
      ),
    },
    {
      key: 'formatted_time',
      label: 'Timestamp',
      render: (row: AuditEntryRow) => (
        <span className="text-label text-gray-600">{String(row.formatted_time)}</span>
      ),
    },
  ]

  const rows = (data?.entries ?? []).map(toAuditRow)

  return (
    <div className="space-y-lg">
      {/* Header */}
      <h1 className="text-heading font-semibold text-brand-navy">Audit Log</h1>

      {/* Error banner */}
      {error && (
        <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded flex items-center justify-between">
          <p className="text-semantic-destructive text-body">{error}</p>
          <button
            type="button"
            onClick={() => void fetchAuditLog()}
            className="text-label text-semantic-destructive underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-end gap-md flex-wrap">
        {/* Action filter */}
        <div className="space-y-xs">
          <label htmlFor="action-filter" className="block text-label font-semibold text-gray-500">
            Action
          </label>
          <select
            id="action-filter"
            value={actionFilter}
            onChange={(e) => handleActionChange(e.target.value)}
            className="px-sm py-xs border border-brand-muted rounded text-label bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Admin filter */}
        <form onSubmit={handleAdminSearch} className="space-y-xs">
          <label htmlFor="admin-filter" className="block text-label font-semibold text-gray-500">
            Admin
          </label>
          <div className="flex gap-xs">
            <input
              id="admin-filter"
              type="text"
              value={adminFilter}
              onChange={(e) => setAdminFilter(e.target.value)}
              placeholder="Admin user ID"
              className="border border-brand-muted rounded px-sm py-xs text-label focus:outline-none focus:ring-2 focus:ring-brand-gold w-48"
            />
            <button
              type="submit"
              className="px-sm py-xs bg-brand-navy text-white text-label rounded hover:bg-brand-navy/90 transition-colors"
            >
              Search
            </button>
            {adminFilter && (
              <button
                type="button"
                onClick={() => { setAdminFilter(''); setPage(1) }}
                className="px-sm py-xs border border-brand-muted text-brand-navy text-label rounded hover:bg-brand-muted/50 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        emptyMessage="No admin actions recorded yet."
        totalCount={data?.total}
        page={page}
        pageSize={20}
        onPageChange={setPage}
      />
    </div>
  )
}
