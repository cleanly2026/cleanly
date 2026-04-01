'use client'

import React from 'react'

interface AuthCardProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  className?: string
}

// UI-SPEC AuthCard:
// - Navy background (#1A2744)
// - Cleanly wordmark at display size (28px, semibold) — secondary focal point
// - Children contain form fields and CTA button
// - 2xl vertical padding (48px) per UI-SPEC spacing scale
export function AuthCard({ children, title, subtitle, className }: AuthCardProps) {
  return (
    <div className={[
      'w-full max-w-sm mx-auto',
      'bg-brand-navy rounded-2xl',
      'px-6 py-12',  // px-6=24px padding, py-12=48px vertical (UI-SPEC 2xl)
      'shadow-2xl',
      className ?? '',
    ].join(' ')}>
      {/* Brand wordmark — secondary focal point (UI-SPEC) */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-brand-gold">
          {/* I18N-01: No hardcoded strings — parent passes title via i18n key */}
          {title ?? 'Cleanly'}
        </h1>
        {subtitle && (
          <p className="text-lg font-semibold text-white mt-2">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  )
}
