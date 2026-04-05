'use client'
import { useState } from 'react'
import { DisputeReasonSheet } from './dispute-reason-sheet'

interface ReportIssueButtonProps {
  orderId: string
  orderStatus: string
}

export function ReportIssueButton({ orderId, orderStatus }: ReportIssueButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Only show on completed/returned orders
  if (orderStatus !== 'completed' && orderStatus !== 'returned') return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-sm px-md border border-semantic-destructive text-semantic-destructive rounded-lg font-semibold text-sm hover:bg-semantic-destructive/5 transition-colors"
      >
        Report an Issue
      </button>
      <DisputeReasonSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        orderId={orderId}
      />
    </>
  )
}
