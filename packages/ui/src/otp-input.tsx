'use client'

import React, { useRef, useCallback, KeyboardEvent, ClipboardEvent } from 'react'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  masked?: boolean  // PinInput uses masked=true
  className?: string
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  masked = false,
  className,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const digits = value.split('').slice(0, length)
  while (digits.length < length) digits.push('')

  const focusBox = (index: number) => {
    inputsRef.current[index]?.focus()
  }

  const handleChange = useCallback(
    (index: number, newChar: string) => {
      // Accept only digits
      if (!/^\d$/.test(newChar)) return

      const newDigits = [...digits]
      newDigits[index] = newChar
      const newValue = newDigits.join('')
      onChange(newValue)

      if (index < length - 1) {
        focusBox(index + 1)
      }

      if (newValue.replace(/\s/g, '').length === length) {
        onComplete?.(newValue)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [digits, length, onChange, onComplete]
  )

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace') {
        if (digits[index]) {
          // Clear current box
          const newDigits = [...digits]
          newDigits[index] = ''
          onChange(newDigits.join(''))
        } else if (index > 0) {
          // Move to previous box
          focusBox(index - 1)
        }
      } else if (e.key === 'ArrowLeft' && index > 0) {
        focusBox(index - 1)
      } else if (e.key === 'ArrowRight' && index < length - 1) {
        focusBox(index + 1)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [digits, length, onChange]
  )

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
      if (!pasted) return

      onChange(pasted)

      const nextFocus = Math.min(pasted.length, length - 1)
      focusBox(nextFocus)

      if (pasted.length === length) {
        onComplete?.(pasted)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [length, onChange, onComplete]
  )

  return (
    // dir="ltr" is intentional: digit boxes must always be LTR even in RTL mode
    // per UI-SPEC: "RTL Arabic mode: digit boxes remain LTR order"
    <div
      className={`flex gap-2 ${className ?? ''}`}
      dir="ltr"
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          type={masked ? 'password' : 'text'}
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={digits[i] ?? ''}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          onChange={(e) => handleChange(i, e.target.value.slice(-1))}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={[
            // 48×56px touch target — WCAG 2.5.5 enhanced (UI-SPEC)
            'w-12 h-14',
            'rounded-lg border-2',
            'text-center text-base font-semibold',
            'bg-white outline-none',
            'transition-colors duration-150',
            // Focus: gold ring (UI-SPEC: accent reserved for focus ring)
            'focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30',
            // Invalid state: red border
            invalid
              ? 'border-semantic-destructive'
              : 'border-gray-300',
            disabled ? 'bg-brand-muted cursor-not-allowed opacity-60' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      ))}
    </div>
  )
}
