import { test, expect } from '@playwright/test'

// US2 (specs/003-pose-library/tasks.md T026). The config runs every spec at 390px, which
// is where FR-018's single-row constraint and the catalog's chip wrapping actually bite.
//
// camel is a brahmana pose — one of the three directions, chosen so the assertion reads
// against a known value rather than whatever the first pose happens to carry.
test('a pose detail page shows its energetic direction, glossed', async ({ page }) => {
  await page.goto('/poses/camel')

  const badge = page.getByTestId('poses-detail-energetic-direction')
  await expect(badge).toBeVisible()
  await expect(badge).toHaveText('Brahmana — building')
})

test('the direction is readable at the simple layer, with no disclosure to open', async ({ page }) => {
  // FR-012 says readable, not gated. `simple` is the default layer, so arriving on the
  // page is the whole interaction.
  await page.goto('/poses/butterfly')

  await expect(page.getByTestId('poses-detail-energetic-direction')).toBeVisible()
  await expect(page.getByTestId('poses-detail-energetic-direction')).toHaveText('Langhana — reducing')
})
