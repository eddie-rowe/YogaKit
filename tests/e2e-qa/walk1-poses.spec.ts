import { test, expect } from '@playwright/test'

test('Walk 1: Meet the poses', async ({ page }) => {
  await page.goto('/poses')
  await expect(page.getByTestId('poses-search-input')).toBeVisible()
  const cards = page.locator('[data-testid^="poses-card-"]')
  await expect(cards.first()).toBeVisible()
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/01-poses-list.png' })

  // open a pose commonly taught
  await page.getByTestId('poses-search-input').fill('butterfly')
  await page.waitForTimeout(300)
  const firstCard = page.locator('[data-testid^="poses-card-"]').first()
  await firstCard.click()
  await page.waitForTimeout(250)
  // card expands in place — click through to detail via link if present
  const detailLink = firstCard.locator('a[href^="/poses/"]')
  if (await detailLink.count() > 0) {
    await detailLink.first().click()
  } else {
    await page.goto('/poses/butterfly')
  }
  await page.waitForURL(/\/poses\//)
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/02-pose-detail-simple.png' })

  // chips exist
  const simple = page.getByTestId('poses-detail-layer-simple')
  const advanced = page.getByTestId('poses-detail-layer-advanced')
  const expert = page.getByTestId('poses-detail-layer-expert')
  await expect(simple).toBeVisible()
  await expect(advanced).toBeVisible()
  await expect(expert).toBeVisible()

  const bodyTextSimple = await page.locator('body').innerText()
  await advanced.click()
  await page.waitForTimeout(250)
  const bodyTextAdvanced = await page.locator('body').innerText()
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/03-pose-detail-advanced.png' })
  expect(bodyTextAdvanced).not.toEqual(bodyTextSimple)

  await expert.click()
  await page.waitForTimeout(250)
  const bodyTextExpert = await page.locator('body').innerText()
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/04-pose-detail-expert.png' })
  expect(bodyTextExpert).not.toEqual(bodyTextAdvanced)

  // rarely-taught pose
  await page.goto('/poses/toe-squat').catch(() => {})
})
