import * as Sentry from '@sentry/node'
import { env } from './env.js'

export function initSentry() {
  // BYPASS_SENTRY gate: skip Sentry init entirely when bypass is active
  if (env.BYPASS_SENTRY) {
    console.warn('[Sentry] BYPASS_SENTRY is true — Sentry initialization skipped')
    return
  }

  if (!env.SENTRY_DSN) {
    console.warn('[Sentry] SENTRY_DSN not set — error tracking disabled')
    return
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      Sentry.httpIntegration(),
    ],
  })
}
