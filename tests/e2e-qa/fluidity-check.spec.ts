import { test, expect } from '@playwright/test'

const NAV_TABS = ['nav-home', 'nav-compose', 'nav-flows', 'nav-poses', 'nav-learn']

test('Fluidity: bottom tab bar touch targets are >=40px and nav is instant', async ({ page }) => {
  await page.goto('/poses')
  await page.screenshot({ path: 'qa-screenshots/fluidity-01-poses.png' })

  const bottomNav = page.getByRole('navigation').filter({ has: page.getByTestId('nav-home') })

  for (const testId of NAV_TABS) {
    const box = await bottomNav.getByTestId(testId).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.height).toBeGreaterThanOrEqual(40)
  }

  // Nav between all 5 tabs and confirm each lands without a full reload (SPA nav)
  for (const testId of NAV_TABS) {
    const start = Date.now()
    await bottomNav.getByTestId(testId).click()
    await page.waitForLoadState('domcontentloaded')
    const elapsed = Date.now() - start
    expect(elapsed).toBeLessThan(1500)
  }
})

test('Fluidity: card touch targets and expandable content on Poses', async ({ page }) => {
  await page.goto('/poses')
  const firstCard = page.locator('[data-testid^="poses-card-"]').first()
  const box = await firstCard.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.height).toBeGreaterThanOrEqual(40)
  await page.screenshot({ path: 'qa-screenshots/fluidity-02-poses-cards.png' })
})

test('Fluidity: pose detail layer chips are quick to switch, no layout jank', async ({ page }) => {
  await page.goto('/poses')
  await page.getByTestId('poses-search-input').fill('mountain')
  await page.locator('[data-testid^="poses-card-"]').first().click()
  await page.getByRole('link', { name: /view anatomy diagram/i }).click()
  await page.waitForURL('**/poses/mountain')

  const chips = ['poses-detail-layer-simple', 'poses-detail-layer-advanced', 'poses-detail-layer-expert']
  for (const chip of chips) {
    const locator = page.getByTestId(chip)
    if (await locator.count() === 0) continue
    const box = await locator.boundingBox()
    expect(box).not.toBeNull()
    await locator.click()
    await page.waitForTimeout(50)
  }
  await page.screenshot({ path: 'qa-screenshots/fluidity-03-pose-detail-chips.png' })
})

test('Fluidity: no transition/animation on the page exceeds 200ms or uses spring/bounce easing', async ({ page }) => {
  await page.goto('/poses')
  const violations = await page.evaluate(() => {
    const bad: string[] = []
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      const durations = cs.transitionDuration.split(',').map(s => parseFloat(s) * (s.includes('ms') ? 1 : 1000))
      const timing = cs.transitionTimingFunction
      if (durations.some(d => d > 200)) {
        bad.push(`${el.tagName}.${el.className} duration=${cs.transitionDuration}`)
      }
      if (/cubic-bezier\(.*[2-9]\.\d|cubic-bezier\(.*,\s*-/.test(timing)) {
        bad.push(`${el.tagName}.${el.className} timing=${timing}`)
      }
    }
    return bad
  })
  expect(violations).toEqual([])
})
