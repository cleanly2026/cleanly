import { describe, it, expect, vi, beforeEach } from 'vitest'

// Shared mock objects — accessible across all tests
const mockVerifications = { create: vi.fn() }
const mockVerificationChecks = { create: vi.fn() }
const mockServices = vi.fn(() => ({
  verifications: mockVerifications,
  verificationChecks: mockVerificationChecks,
}))

// Mock Twilio before importing the service
vi.mock('twilio', () => {
  return {
    default: vi.fn(() => ({
      verify: {
        v2: {
          services: mockServices,
        },
      },
    })),
  }
})

// Set required env vars before importing
process.env.TWILIO_ACCOUNT_SID = 'test_sid'
process.env.TWILIO_AUTH_TOKEN = 'test_token'
process.env.TWILIO_VERIFY_SERVICE_SID = 'test_verify_sid'

const { sendOtp, verifyOtp } = await import('./otp.service.js')

describe('OTP Service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sendOtp returns success:true on Twilio success', async () => {
    mockVerifications.create.mockResolvedValueOnce({ sid: 'VE123' })
    const result = await sendOtp('971501234567')
    expect(result.success).toBe(true)
  })

  it('sendOtp returns success:false on Twilio error — does not throw', async () => {
    mockVerifications.create.mockRejectedValueOnce(new Error('Twilio error'))
    const result = await sendOtp('971501234567')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('verifyOtp returns valid:true when Twilio returns approved', async () => {
    mockVerificationChecks.create.mockResolvedValueOnce({ status: 'approved' })
    const result = await verifyOtp('971501234567', '123456')
    expect(result.valid).toBe(true)
  })

  it('verifyOtp returns valid:false when Twilio returns pending', async () => {
    mockVerificationChecks.create.mockResolvedValueOnce({ status: 'pending' })
    const result = await verifyOtp('971501234567', '999999')
    expect(result.valid).toBe(false)
  })
})
