interface StatCardProps {
  label: string
  value: number | string
  icon: React.ReactNode
}

export function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-md min-h-[96px] flex flex-col justify-between">
      <div className="flex items-start justify-between gap-sm">
        <span className="text-label text-gray-500">{label}</span>
        <span className="text-brand-gold shrink-0">{icon}</span>
      </div>
      <span className="text-display font-semibold text-brand-navy">{value}</span>
    </div>
  )
}
