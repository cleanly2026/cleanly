// Inline washer assignment per D-14 — dropdown shows available washers,
// select and confirm without navigating away from the table.
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { api } from '../lib/api'

interface Washer {
  id: string
  first_name: string
  last_name: string
  status: string
}

interface WashersResponse {
  washers: Washer[]
}

interface WasherAssignDropdownProps {
  orderId: string
}

export function WasherAssignDropdown({ orderId }: WasherAssignDropdownProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedWasherId, setSelectedWasherId] = useState<string | null>(null)

  const { data: washersData } = useQuery({
    queryKey: ['available-washers'],
    queryFn: () =>
      api.get<WashersResponse>('/company/orders/washers/available').then((r) => r.data),
    enabled: isOpen,
  })

  const assignMutation = useMutation({
    mutationFn: (washerId: string) =>
      api.patch(`/orders/${orderId}/assign-washer`, { washer_id: washerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-orders'] })
      setIsOpen(false)
      setSelectedWasherId(null)
    },
  })

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-amber-500 font-semibold text-xs min-h-[44px] px-2"
        type="button"
      >
        {t('dashboard.assignWasher')}
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedWasherId ?? ''}
        onChange={(e) => setSelectedWasherId(e.target.value || null)}
        className="rounded border border-gray-300 px-2 py-1 text-xs min-h-[44px]"
      >
        <option value="">{t('dashboard.selectWasher')}</option>
        {washersData?.washers?.map((w) => (
          <option key={w.id} value={w.id}>
            {w.first_name} {w.last_name} — {w.status}
          </option>
        ))}
      </select>
      <button
        onClick={() => selectedWasherId && assignMutation.mutate(selectedWasherId)}
        disabled={!selectedWasherId || assignMutation.isPending}
        className="rounded bg-amber-500 text-white px-3 py-1 text-xs min-h-[44px] disabled:opacity-50"
        type="button"
      >
        {t('dashboard.confirm')}
      </button>
    </div>
  )
}
