'use client'

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-md">
      <p className="text-semantic-destructive text-body">{error.message || 'Something went wrong loading this page.'}</p>
      <button
        onClick={reset}
        className="px-md py-sm bg-brand-gold text-white rounded-lg font-semibold text-body hover:bg-brand-gold/90 transition-colors"
      >
        Refresh
      </button>
    </div>
  )
}
