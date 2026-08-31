import 'server-only'
import { Resend } from 'resend'

import { logger } from '@/lib/utils/logger'

// Resend wrapper (ported from NextMove's src/services/delivery/email.ts).
// Deliberately reads RESEND_API_KEY/RESEND_FROM_ADDRESS directly from
// process.env, not through src/lib/env.ts's getEnv() — that schema is
// validated on every request in src/proxy.ts, and email delivery isn't on
// the critical path every request needs.

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

export interface SendEmailResult {
  id: string
}

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is not set')
  }
  return new Resend(apiKey)
}

function defaultFrom(): string {
  return process.env.RESEND_FROM_ADDRESS ?? 'onboarding@resend.dev'
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

const RETRY_DELAYS_MS = [200, 400, 800] as const

// Sends a transactional email with 3 retries (200/400/800ms backoff). Never
// logs email body content (RULE-L7) — only ids, addresses, and attempt counts.
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const from = options.from ?? defaultFrom()
  let lastError: unknown = null

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const resend = getResendClient()
      const { data, error } = await resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        ...(options.text ? { text: options.text } : {}),
      })

      if (error) {
        throw new Error(`Resend API error: ${error.message ?? JSON.stringify(error)}`)
      }
      if (!data?.id) {
        throw new Error('Resend API returned success but no message ID')
      }

      logger.info('email.delivered', { resend_id: data.id, to: options.to, attempt })
      return { id: data.id }
    } catch (err) {
      lastError = err
      const isLastAttempt = attempt === RETRY_DELAYS_MS.length
      logger.warn('email.attempt_failed', {
        attempt,
        to: options.to,
        error: err instanceof Error ? err.message : String(err),
        will_retry: !isLastAttempt,
      })
      if (!isLastAttempt) {
        await sleep(RETRY_DELAYS_MS[attempt])
      }
    }
  }

  logger.error('email.delivery_failure', {
    to: options.to,
    attempts: RETRY_DELAYS_MS.length + 1,
  })
  if (lastError instanceof Error) throw lastError
  throw new Error(`Email delivery failed after ${RETRY_DELAYS_MS.length + 1} attempts`)
}
