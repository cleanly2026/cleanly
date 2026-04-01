'use client'

import React from 'react'
import { OtpInput } from './otp-input'

interface PinInputProps {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  className?: string
}

// 4-digit masked PIN input — uses OtpInput with masked=true and length=4
export function PinInput(props: PinInputProps) {
  return <OtpInput {...props} length={4} masked={true} />
}
