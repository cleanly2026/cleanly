// Company dashboard order feed page — Screen 9 per UI-SPEC.
// Filter tabs: All / Pending / Active / Completed.
// Real-time updates via Socket.io (useOrderSocket).
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { OrderTable } from '../components/OrderTable'
import { useCompanyOrders } from '../hooks/useCompanyOrders'
import { useOrderSocket } from '../hooks/useOrderSocket'

const TABS = [
  { key: 'all', label: 'dashboard.filterAll' },
  { key: 'pending', label: 'dashboard.filterPending' },
  { key: 'accepted', label: 'dashboard.filterActive' },
  { key: 'completed', label: 'dashboard.filterCompleted' },
] as const

interface OrderFeedProps {
  companyId: string
}

export function OrderFeed({ companyId }: OrderFeedProps) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<string>('all')
  const [page, setPage] = useState(1)

  // Real-time Socket.io subscription — invalidates TanStack Query cache on events
  useOrderSocket(companyId)

  const { data, isLoading } = useCompanyOrders(activeTab, page)

  const pagination = (data as any)?.pagination
  const orders = (data as any)?.orders ?? []

  return (
    <div className="p-6">
      {/* Status filter tabs — 40px height per UI-SPEC, brand-gold active underline */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => {
              setActiveTab(tab.key)
              setPage(1)
            }}
            type="button"
            className={`h-[40px] px-4 text-xs transition-colors ${
              activeTab === tab.key
                ? 'font-semibold text-blue-900 border-b-2 border-amber-500'
                : 'text-blue-900/60 border-b-2 border-transparent hover:text-blue-900'
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      <OrderTable orders={orders} isLoading={isLoading} />

      {/* Pagination controls */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            type="button"
            className="px-4 py-1 rounded border border-gray-300 text-xs disabled:opacity-50"
          >
            {t('common.previous')}
          </button>
          <span className="text-xs py-1">
            {page} / {pagination.pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
            type="button"
            className="px-4 py-1 rounded border border-gray-300 text-xs disabled:opacity-50"
          >
            {t('common.next')}
          </button>
        </div>
      )}
    </div>
  )
}
