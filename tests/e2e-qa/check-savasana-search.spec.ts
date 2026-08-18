import { test, expect } from '@playwright/test'

test('searching savasana returns the real Savasana pose, not Constructive Rest', async ({ page }) => {
  await page.goto('/poses')
  await page.getByTestId('poses-search-input').fill('savasana')
  const cards = page.locator('[data-testid^="poses-card-"]')
  await expect(cards).toHaveCount(1)
  await expect(cards.first()).toHaveAttribute('data-testid', 'poses-card-savasana')
})
