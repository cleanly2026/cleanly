'use client'

import React from 'react'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  error?: string
  label?: string
}

// +971 (UAE) is the default and only supported country code for private beta
export function PhoneInput({
  value,
  onChange,
  placeholder = '50 XXX XXXX',
  disabled = false,
  invalid = false,
  error,
  label,
}: PhoneInputProps) {
  const handleChange = (raw: string) => {
    // Strip non-digits, strip leading 0 (UAE numbers: 0501234567 → 501234567)
    const digits = raw.replace(/\D/g, '').replace(/^0/, '')
    // Store without country code — API prepends 971
    onChange(digits)
  }

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <label className="text-sm font-semibold text-brand-navy">
          {label}
        </label>
      )}
      <div className={[
        'flex items-center rounded-lg border-2 overflow-hidden',
        'bg-white transition-colors',
        invalid ? 'border-semantic-destructive' : 'border-gray-300',
        'focus-within:border-brand-gold focus-within:ring-2 focus-within:ring-brand-gold/30',
      ].join(' ')}>
        {/* Country code prefix — not editable, uses ps-/pe- logical properties (RTL-safe) */}
        <span className="flex items-center ps-4 pe-3 text-base font-normal text-gray-500 bg-brand-muted h-full border-e-2 border-gray-300 min-h-[44px]">
          +971
        </span>
        <input
          type="tel"
          inputMode="numeric"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 ps-3 pe-4 py-3 text-base bg-transparent outline-none min-h-[44px]"
          aria-invalid={invalid}
        />
      </div>
      {error && (
        <p className="text-xs text-semantic-destructive">{error}</p>
      )}
    </div>
  )
}
