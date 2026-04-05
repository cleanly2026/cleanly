'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminFetch } from '../../../../src/lib/api'
import { StatusBadge } from '../../../../src/components/status-badge'
import { RejectReasonModal } from '../../../../src/components/reject-reason-modal'

interface CompanyService {
  id: string
  name_en: string
  name_ar: string
}

interface CompanyMember {
  id: string
  name: string
  role: string
}

interface Company {
  id: string
  name_en: string
  name_ar: string
  is_verified: boolean
  rejection_reason?: string | null
  stripe_connect_id?: string | null
  stripe_connect_status?: string | null
  carpet_lead_time_days?: number
  city?: { id: string; name_en: string; name_ar: string }
  services?: CompanyService[]
  members?: CompanyMember[]
  created_at: string
}

function getCompanyStatus(company: Company): string {
  if (company.rejection_reason) return 'rejected'
  if (company.is_verified) return 'verified'
  return 'pending'
}

function BackArrow({ locale }: { locale: string }) {
  const isRtl = locale === 'ar'
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      style={{ transform: isRtl ? 'scaleX(-1)' : undefined }}
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

export default function CompanyDetailPage() {
  const params = useParams()
  const locale = params?.locale as string ?? 'en'
  const id = params?.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [actionStatus, setActionStatus] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCompany() {
      setIsLoading(true)
      setError(null)
      try {
        const result = await adminFetch<Company>(`/api/admin/companies/${id}`)
        setCompany(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load company')
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      void fetchCompany()
    }
  }, [id])

  async function handleApprove() {
    if (!company) return
    const previousStatus = company.is_verified
    // Optimistic update
    setCompany((prev) => prev ? { ...prev, is_verified: true, rejection_reason: null } : prev)
    setActionStatus(null)

    try {
      const updated = await adminFetch<Company>(`/api/admin/companies/${id}/verify`, {
        method: 'PATCH',
      })
      setCompany(updated)
      setActionStatus('success:approved')
    } catch (err) {
      // Revert optimistic update
      setCompany((prev) => prev ? { ...prev, is_verified: previousStatus } : prev)
      setActionStatus('error:approve')
      setError(err instanceof Error ? err.message : 'Could not approve this company. Refresh and try again.')
    }
  }

  async function handleReject(reason: string) {
    const updated = await adminFetch<Company>(`/api/admin/companies/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    })
    setCompany(updated)
    setActionStatus('success:rejected')
  }

  if (isLoading) {
    return (
      <div className="space-y-lg animate-pulse">
        <div className="h-6 bg-brand-muted rounded w-32" />
        <div className="h-8 bg-brand-muted rounded w-64" />
        <div className="h-40 bg-brand-muted rounded" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="text-center py-2xl">
        <p className="text-heading font-semibold text-gray-400">Company not found.</p>
        <Link href={`/${locale}/companies`} className="text-brand-gold underline mt-md inline-block">
          Back to Companies
        </Link>
      </div>
    )
  }

  const status = getCompanyStatus(company)

  return (
    <div className="space-y-lg max-w-2xl">
      {/* Back link */}
      <Link
        href={`/${locale}/companies`}
        className="inline-flex items-center gap-xs text-label text-brand-navy hover:text-brand-gold transition-colors"
      >
        <BackArrow locale={locale} />
        <span>Back to Companies</span>
      </Link>

      {/* Header */}
      <div className="space-y-sm">
        <div className="flex items-start gap-md flex-wrap">
          <h1 className="text-display font-semibold text-brand-navy">{company.name_en}</h1>
          <StatusBadge status={status} />
        </div>
        {company.name_ar && (
          <p className="text-body text-gray-500" dir="rtl">{company.name_ar}</p>
        )}
      </div>

      {/* Error banner */}
      {error && actionStatus === 'error:approve' && (
        <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded">
          <p className="text-semantic-destructive text-body">{error}</p>
        </div>
      )}

      {/* Success banner */}
      {actionStatus === 'success:approved' && (
        <div className="border-s-4 border-semantic-success bg-semantic-success/5 px-md py-sm rounded">
          <p className="text-semantic-success text-body">Company approved successfully.</p>
        </div>
      )}
      {actionStatus === 'success:rejected' && (
        <div className="border-s-4 border-semantic-warning bg-semantic-warning/5 px-md py-sm rounded">
          <p className="text-semantic-warning text-body">Company application rejected.</p>
        </div>
      )}

      {/* Profile section */}
      <div className="bg-white rounded-lg shadow-sm p-lg space-y-md">
        <h2 className="text-heading font-semibold text-brand-navy border-b border-brand-muted pb-sm">
          Company Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
          <div>
            <p className="text-label font-semibold text-gray-500">English Name</p>
            <p className="text-body text-brand-navy">{company.name_en}</p>
          </div>
          <div>
            <p className="text-label font-semibold text-gray-500">Arabic Name</p>
            <p className="text-body text-brand-navy" dir="rtl">{company.name_ar || '—'}</p>
          </div>
          <div>
            <p className="text-label font-semibold text-gray-500">City</p>
            <p className="text-body text-brand-navy">
              {company.city?.name_en ?? '—'}
            </p>
          </div>
          {company.carpet_lead_time_days != null && (
            <div>
              <p className="text-label font-semibold text-gray-500">Carpet Lead Time</p>
              <p className="text-body text-brand-navy">{company.carpet_lead_time_days} days</p>
            </div>
          )}
        </div>

        {company.services && company.services.length > 0 && (
          <div>
            <p className="text-label font-semibold text-gray-500 mb-xs">Service Categories</p>
            <div className="flex flex-wrap gap-xs">
              {company.services.map((s) => (
                <span key={s.id} className="px-sm py-xs bg-brand-muted rounded-full text-label text-brand-navy">
                  {s.name_en}
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-label font-semibold text-gray-500">Stripe Connect</p>
          <p className="text-body text-brand-navy">
            {company.stripe_connect_id
              ? `${company.stripe_connect_id} — ${company.stripe_connect_status ?? 'unknown'}`
              : 'Not connected'}
          </p>
        </div>

        {company.rejection_reason && (
          <div className="border-s-4 border-semantic-destructive bg-semantic-destructive/5 px-md py-sm rounded">
            <p className="text-label font-semibold text-semantic-destructive">Rejection Reason</p>
            <p className="text-body text-semantic-destructive">{company.rejection_reason}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-md flex-wrap">
        <button
          type="button"
          onClick={() => void handleApprove()}
          disabled={status === 'verified' || !!actionStatus?.startsWith('success')}
          className="px-lg py-sm bg-brand-gold text-white font-semibold rounded-lg hover:bg-brand-gold/90 transition-colors disabled:opacity-40"
        >
          Approve Company
        </button>
        <button
          type="button"
          onClick={() => setRejectModalOpen(true)}
          disabled={status === 'rejected' || actionStatus === 'success:approved'}
          className="px-lg py-sm border border-semantic-destructive text-semantic-destructive font-semibold rounded-lg hover:bg-semantic-destructive/5 transition-colors disabled:opacity-40"
        >
          Reject with Reason
        </button>
      </div>

      {/* Reject modal */}
      <RejectReasonModal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onConfirm={handleReject}
        companyName={company.name_en}
      />
    </div>
  )
}
