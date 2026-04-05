'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { adminFetch } from '../../../src/lib/api'
import { DataTable } from '../../../src/components/data-table'
import { StatusBadge } from '../../../src/components/status-badge'

interface Company {
  id: string
  name_en: string
  name_ar: string
  city_name?: string
  is_verified: boolean
  rejection_reason?: string | null
  created_at: string
}

interface CompaniesResponse {
  companies: Company[]
  total: number
  page: number
  limit: number
}

type StatusFilter = 'all' | 'pending' | 'verified' | 'rejected'

function getCompanyStatus(company: Company): string {
  if (company.rejection_reason) return 'rejected'
  if (company.is_verified) return 'verified'
  return 'pending'
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

export default function CompaniesPage() {
  const router = useRouter()
  const params = useParams()
  const locale = params?.locale as string ?? 'en'

  const [filter, setFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<CompaniesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const statusParam = filter === 'all' ? 'all' : filter
      const result = await adminFetch<CompaniesResponse>(
        `/api/admin/companies?status=${statusParam}&page=${page}&limit=10`
      )
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load companies')
    } finally {
      setIsLoading(false)
    }
  }, [filter, page])

  useEffect(() => {
    void fetchCompanies()
  }, [fetchCompanies])

  function handleFilterChange(newFilter: StatusFilter) {
    setFilter(newFilter)
    setPage(1)
  }

  const columns = [
    { key: 'name_en', label: 'Company Name' },
    { key: 'city_name', label: 'City', render: (row: Company) => row.city_name ?? '—' },
    {
      key: 'status',
      label: 'Status',
      render: (row: Company) => <StatusBadge status={getCompanyStatus(row)} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (row: Company) => formatDate(row.created_at),
    },
  ]

  const filterOptions: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'verified', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ]

  function getEmptyMessage() {
    if (filter === 'pending') return 'No companies pending review.'
    return 'No companies found.'
  }

  return (
    <div className="space-y-lg">
      <h1 className="text-heading font-semibold text-brand-navy">Companies</h1>

      {/* Error banner */}
      {error && (
        <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded">
          <p className="text-semantic-destructive text-body">{error}</p>
          <button
            onClick={() => void fetchCompanies()}
            className="text-label text-semantic-destructive underline mt-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* Status filter */}
      <div className="flex items-center gap-sm">
        <label className="text-label font-semibold text-brand-navy" htmlFor="status-filter">
          Status
        </label>
        <select
          id="status-filter"
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value as StatusFilter)}
          className="px-sm py-xs border border-brand-muted rounded text-label bg-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns as Parameters<typeof DataTable>[0]['columns']}
        data={(data?.companies ?? []) as unknown as Record<string, unknown>[]}
        onRowClick={(row) => {
          const company = row as unknown as Company
          router.push(`/${locale}/companies/${company.id}`)
        }}
        isLoading={isLoading}
        emptyMessage={getEmptyMessage()}
        totalCount={data?.total}
        page={page}
        pageSize={10}
        onPageChange={setPage}
      />
    </div>
  )
}
