interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected' | 'open' | 'resolved' | 'verified' | string
  label?: string
}

function getVariant(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
    case 'open':
      return 'bg-semantic-warning/10 text-semantic-warning'
    case 'approved':
    case 'verified':
    case 'resolved':
      return 'bg-semantic-success/10 text-semantic-success'
    case 'rejected':
      return 'bg-semantic-destructive/10 text-semantic-destructive'
    default:
      return 'bg-brand-muted text-gray-600'
  }
}

function getDefaultLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'Pending Review'
    case 'approved':
    case 'verified':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'open':
      return 'Open'
    case 'resolved':
      return 'Resolved'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const variantClass = getVariant(status)
  const displayLabel = label ?? getDefaultLabel(status)

  return (
    <span
      className={`inline-flex items-center px-sm py-xs rounded-full text-label font-semibold ${variantClass}`}
    >
      {displayLabel}
    </span>
  )
}
