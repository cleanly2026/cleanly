import { z } from 'zod'

export type UserRole = 'customer' | 'washer' | 'company_member' | 'admin'

export interface JWTPayload {
  sub: string         // userId (cuid)
  role: UserRole
  companyId?: string  // present for company_member only
  iat: number
  exp: number
}

// Zod schema for runtime validation of JWT payload
export const JWTPayloadSchema = z.object({
  sub: z.string().cuid(),
  role: z.enum(['customer', 'washer', 'company_member', 'admin']),
  companyId: z.string().cuid().optional(),
  iat: z.number(),
  exp: z.number(),
})

// OTP request/response schemas
export const SendOtpRequestSchema = z.object({
  phone: z.string().regex(/^971[0-9]{9}$/, 'Phone must be UAE format: 971XXXXXXXXX'),
})
export type SendOtpRequest = z.infer<typeof SendOtpRequestSchema>

export const VerifyOtpRequestSchema = z.object({
  phone: z.string().regex(/^971[0-9]{9}$/),
  code: z.string().length(6).regex(/^\d{6}$/),
})
export type VerifyOtpRequest = z.infer<typeof VerifyOtpRequestSchema>

// Washer PIN schemas
export const WasherPinVerifySchema = z.object({
  phone: z.string().regex(/^971[0-9]{9}$/),
  code: z.string().length(6).regex(/^\d{6}$/),
  pin: z.string().length(4).regex(/^\d{4}$/),
})
export type WasherPinVerify = z.infer<typeof WasherPinVerifySchema>

// Company auth schemas
export const CompanyLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})
export type CompanyLogin = z.infer<typeof CompanyLoginSchema>

export const CompanyTotpVerifySchema = z.object({
  email: z.string().email(),
  token: z.string().length(6).regex(/^\d{6}$/),
  sessionToken: z.string(),  // short-lived pre-MFA token
})
export type CompanyTotpVerify = z.infer<typeof CompanyTotpVerifySchema>

// Token pair response
export interface TokenPair {
  accessToken: string   // 15-minute JWT
  refreshToken: string  // 30-day opaque token
}

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(32),
})
