'use client'

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-md px-lg">
      <h2 className="text-xl font-semibold text-brand-navy">Something went wrong</h2>
      <p className="text-brand-navy/60 text-sm text-center">
        {error.message || 'We encountered an unexpected error. Please try again.'}
      </p>
      <button
        onClick={reset}
        className="px-lg py-sm bg-brand-gold text-white rounded-lg font-semibold text-sm hover:bg-brand-gold/90 transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}
