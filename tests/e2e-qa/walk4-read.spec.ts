import { test, expect } from '@playwright/test'

const VINYASA_ID = 'b79a753d-fc7c-42e7-8abc-10181fabdb12'

test('Walk 4: Teach from it (read view legibility at mat viewport)', async ({ page }) => {
  await page.goto(`/read/${VINYASA_ID}`)

  // No app chrome (nav) should compete for space on the read surface
  await expect(page.getByTestId('nav-home')).toHaveCount(0)

  const items = page.locator('[data-testid^="read-item-"]')
  await expect(items.first()).toBeVisible()
  const itemCount = await items.count()
  expect(itemCount).toBeGreaterThan(10)

  // Every item should carry a breath/time marking — nothing silently blank
  const breathMarks = page.getByTestId('read-breath-mark')
  const markCount = await breathMarks.count()
  expect(markCount).toBe(itemCount)
  for (let i = 0; i < markCount; i++) {
    const text = (await breathMarks.nth(i).textContent())?.trim()
    expect(text).not.toBe('')
  }

  // Phase grouping should be present (headers between blocks of poses)
  const phaseHeadings = page.locator('h2')
  expect(await phaseHeadings.count()).toBeGreaterThan(0)

  // Pose name type should be large enough to glance at from a few feet away
  const firstNameFontSize = await page.locator('.pose-row span').first().evaluate(
    el => parseFloat(getComputedStyle(el).fontSize)
  )
  expect(firstNameFontSize).toBeGreaterThanOrEqual(20)

  await page.screenshot({ path: 'qa-screenshots/w4-01-read-top.png', fullPage: false })

  // Scroll through ~10 min worth of the sequence and confirm no jank / horizontal overflow
  const bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const viewportWidth = page.viewportSize()?.width ?? 390
  expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1)

  await page.mouse.wheel(0, 1200)
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'qa-screenshots/w4-02-read-scrolled.png', fullPage: false })

  await page.mouse.wheel(0, 1200)
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'qa-screenshots/w4-03-read-scrolled-more.png', fullPage: false })
})
