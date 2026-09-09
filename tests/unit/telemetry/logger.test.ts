import { afterEach, describe, expect, it, vi } from 'vitest'

import { logger } from '../../../src/lib/utils/logger'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('privacy-safe logger', () => {
  it('redacts error messages and the message line of stacks', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const error = new Error('private.user@example.com failed for My Morning Flow')

    logger.error('operation.failed', { outcome: 'failure' }, error)

    const entry = JSON.parse(String(output.mock.calls[0][0]))
    expect(entry.error.kind).toBe('Error')
    expect(entry.error.message).toBe('[redacted]')
    expect(entry.error.stack).toMatch(/^\[redacted\]\n/)
    expect(JSON.stringify(entry)).not.toContain('private.user@example.com')
    expect(JSON.stringify(entry)).not.toContain('My Morning Flow')
  })

  it('rejects direct PII and arbitrary error fields', () => {
    expect(() => logger.info('unsafe', { email: 'private.user@example.com' })).toThrow(
      /refusing to log field/,
    )
    expect(() => logger.warn('unsafe', { error: 'provider response' })).toThrow(
      /refusing to log field/,
    )
  })

  it('redacts non-Error thrown values', () => {
    const output = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    logger.error('operation.failed', undefined, 'private thrown value')
    const entry = JSON.parse(String(output.mock.calls[0][0]))
    expect(entry.error).toEqual({ kind: 'UnknownError', message: '[redacted]' })
  })
})
