// Pill-shaped status badge per UI-SPEC Screen 9

const STATUS_COLORS: Record<string, string> = {
  // On-site lifecycle
  pending: 'bg-amber-500 text-white',
  accepted: 'bg-blue-900 text-white',
  washer_assigned: 'bg-blue-900 text-white',
  washer_en_route: 'bg-blue-900 text-white',
  in_progress: 'bg-blue-900 text-white',
  completed: 'bg-green-600 text-white',
  cancelled: 'bg-red-600 text-white',
  // Carpet-specific lifecycle
  pickup_scheduled: 'bg-blue-900 text-white',
  picked_up: 'bg-blue-900 text-white',
  in_cleaning: 'bg-amber-500 text-white',
  ready_for_return: 'bg-amber-500 text-white',
  return_scheduled: 'bg-blue-900 text-white',
  out_for_return: 'bg-blue-900 text-white',
  returned: 'bg-green-600 text-white',
}

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const colorClass = STATUS_COLORS[status] ?? 'bg-gray-400 text-white'
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${colorClass}`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  )
}
