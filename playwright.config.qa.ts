import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e-qa',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    screenshot: 'off',
  },
  workers: 1,
  reporter: [['list']],
})
