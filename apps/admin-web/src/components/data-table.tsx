'use client'

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  onRowClick?: (row: T) => void
  isLoading?: boolean
  emptyMessage?: string
  totalCount?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr>
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-md py-sm">
          <div className="h-4 bg-brand-muted rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available.',
  totalCount,
  page = 1,
  pageSize = 10,
  onPageChange,
}: DataTableProps<T>) {
  const totalPages = totalCount !== undefined ? Math.ceil(totalCount / pageSize) : undefined
  const showPagination = totalPages !== undefined && totalPages > 1

  return (
    <div className="overflow-x-auto rounded-lg border border-brand-muted">
      <table className="w-full text-label">
        <thead>
          <tr className="bg-brand-navy text-white">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-md py-sm text-start font-semibold whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} colCount={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-md py-2xl text-center">
                <p className="text-heading font-semibold text-gray-400">{emptyMessage}</p>
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className={[
                  'border-t border-brand-muted transition-colors',
                  onRowClick ? 'cursor-pointer hover:bg-brand-muted/50' : '',
                ].join(' ')}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-md py-sm">
                    {col.render ? col.render(row) : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {showPagination && (
        <div className="flex items-center justify-between px-md py-sm border-t border-brand-muted bg-white">
          <span className="text-label text-gray-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-sm">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="px-sm py-xs rounded border border-brand-muted text-label disabled:opacity-40 hover:bg-brand-muted/50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= (totalPages ?? 1)}
              className="px-sm py-xs rounded border border-brand-muted text-label disabled:opacity-40 hover:bg-brand-muted/50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
