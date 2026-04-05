'use client'

import { useState } from 'react'

interface DisputePhotoViewerProps {
  beforePhotoUrl: string | null
  afterPhotoUrl: string | null
}

function CameraPlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[320px] bg-brand-muted/50 rounded-md gap-sm">
      <svg
        className="w-10 h-10 text-gray-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
        />
      </svg>
      <p className="text-label text-gray-400">Photo unavailable</p>
    </div>
  )
}

interface PhotoPanelProps {
  url: string | null
  label: string
  onOpen: (url: string) => void
}

function PhotoPanel({ url, label, onOpen }: PhotoPanelProps) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="space-y-xs">
      <p className="text-label font-semibold text-gray-500">{label}</p>
      {!url || failed ? (
        <CameraPlaceholder />
      ) : (
        <button
          type="button"
          onClick={() => onOpen(url)}
          className="w-full block focus:outline-none focus:ring-2 focus:ring-brand-gold rounded-md"
          aria-label={`View ${label} photo full screen`}
        >
          <img
            src={url}
            alt={label}
            onError={() => setFailed(true)}
            className="w-full min-h-[320px] object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
          />
        </button>
      )}
    </div>
  )
}

export function DisputePhotoViewer({ beforePhotoUrl, afterPhotoUrl }: DisputePhotoViewerProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <PhotoPanel url={beforePhotoUrl} label="Before" onOpen={setLightboxUrl} />
        <PhotoPanel url={afterPhotoUrl} label="After" onOpen={setLightboxUrl} />
      </div>

      {/* Lightbox overlay */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-lg"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo lightbox"
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            className="absolute top-lg end-lg text-white hover:text-gray-300 transition-colors"
            aria-label="Close lightbox"
          >
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={lightboxUrl}
            alt="Full screen photo"
            className="max-w-full max-h-full object-contain rounded-md"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
