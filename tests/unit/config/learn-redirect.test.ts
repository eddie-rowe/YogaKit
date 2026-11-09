// @vitest-environment node
import { describe, expect, it } from 'vitest'

import nextConfig from '../../../next.config'

// 005 US7 T070 (FR-066, FR-067): /learn is retired as a route; a bookmarked visit
// redirects rather than erroring.
describe('/learn retirement', () => {
  it('redirects /learn permanently (308) to the Today surface', async () => {
    const redirects = await nextConfig.redirects?.()
    const rule = redirects?.find(r => r.source === '/learn')
    expect(rule).toBeDefined()
    expect(rule?.destination).toBe('/')
    expect(rule?.permanent).toBe(true)
  })
})
