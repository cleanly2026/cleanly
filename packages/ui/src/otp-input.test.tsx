import { render, fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { OtpInput } from './otp-input'
import React from 'react'

describe('OtpInput', () => {
  it('renders 6 input boxes by default', () => {
    const { container } = render(<OtpInput value="" onChange={vi.fn()} />)
    expect(container.querySelectorAll('input')).toHaveLength(6)
  })

  it('renders 4 input boxes when length=4', () => {
    const { container } = render(<OtpInput value="" onChange={vi.fn()} length={4} />)
    expect(container.querySelectorAll('input')).toHaveLength(4)
  })

  it('calls onChange when a digit is entered', () => {
    const onChange = vi.fn()
    const { container } = render(<OtpInput value="" onChange={onChange} />)
    const firstInput = container.querySelectorAll('input')[0] as HTMLInputElement
    fireEvent.change(firstInput, { target: { value: '5' } })
    expect(onChange).toHaveBeenCalledWith(expect.stringContaining('5'))
  })

  it('renders dir="ltr" container for LTR digit order in RTL mode', () => {
    const { container } = render(<OtpInput value="" onChange={vi.fn()} />)
    expect(container.firstElementChild?.getAttribute('dir')).toBe('ltr')
  })

  it('applies destructive border when invalid=true', () => {
    const { container } = render(<OtpInput value="" onChange={vi.fn()} invalid={true} />)
    const firstInput = container.querySelectorAll('input')[0]
    expect(firstInput.className).toContain('destructive')
  })

  it('renders all boxes as password type when masked=true', () => {
    const { container } = render(<OtpInput value="" onChange={vi.fn()} masked={true} />)
    const inputs = container.querySelectorAll('input')
    inputs.forEach((input) => {
      expect(input.getAttribute('type')).toBe('password')
    })
  })

  it('disables all inputs when disabled=true', () => {
    const { container } = render(<OtpInput value="" onChange={vi.fn()} disabled={true} />)
    const inputs = container.querySelectorAll('input')
    inputs.forEach((input) => {
      expect(input).toBeDisabled()
    })
  })

  it('does not call onChange when a non-digit is entered', () => {
    const onChange = vi.fn()
    const { container } = render(<OtpInput value="" onChange={onChange} />)
    const firstInput = container.querySelectorAll('input')[0] as HTMLInputElement
    fireEvent.change(firstInput, { target: { value: 'a' } })
    expect(onChange).not.toHaveBeenCalled()
  })
})
