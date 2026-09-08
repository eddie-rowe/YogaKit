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

  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/w4-01-read-top.png', fullPage: false })

  // Scroll through ~10 min worth of the sequence and confirm no jank / horizontal overflow
  const bodyScrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  const viewportWidth = page.viewportSize()?.width ?? 390
  expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1)

  await page.mouse.wheel(0, 1200)
  await page.waitForTimeout(200)
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/w4-02-read-scrolled.png', fullPage: false })

  await page.mouse.wheel(0, 1200)
  await page.waitForTimeout(200)
  await page.screenshot({ caret: 'initial', path: 'qa-screenshots/w4-03-read-scrolled-more.png', fullPage: false })
})

/** WCAG 2.1 relative luminance and contrast, computed in the page against the colours
 *  the browser actually resolved. The tokens are `var()` chains across three theme
 *  blocks, so asserting the hex in the stylesheet would prove nothing about what a
 *  teacher sees. */
async function contrastOf(page: import('@playwright/test').Page, selector: string) {
  return page.evaluate(sel => {
    const parse = (value: string) => value.match(/[\d.]+/g)!.slice(0, 3).map(Number)
    const luminance = (rgb: number[]) => {
      const [r, g, b] = rgb
        .map(v => v / 255)
        .map(v => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)))
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }
    const element = document.querySelector(sel)!
    const foreground = parse(getComputedStyle(element).color)

    // Walk up for the first painted background — the row fill if there is one, the
    // page otherwise.
    let node: Element | null = element
    let background = [255, 255, 255]
    while (node) {
      const value = getComputedStyle(node).backgroundColor
      const rgba = value.match(/[\d.]+/g)?.map(Number) ?? []
      if (rgba.length >= 3 && (rgba[3] ?? 1) > 0.5) {
        background = rgba.slice(0, 3)
        break
      }
      node = node.parentElement
    }

    const a = luminance(foreground)
    const b = luminance(background)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }, selector)
}

/** US1: the measure is the one number a teacher looks for from the mat, and until
 *  this story it rendered at 18px in a token that fails AA in the default theme.
 *  Both halves are asserted here — the size of the count and the contrast of the
 *  word beside it — because the second is invisible to a screenshot review. */
async function assertMeasureIsLegible(page: import('@playwright/test').Page) {
  const countFontSize = await page
    .locator('[data-testid="read-breath-mark"] span')
    .first()
    .evaluate(el => parseFloat(getComputedStyle(el).fontSize))
  expect(countFontSize).toBeGreaterThanOrEqual(20)

  // WCAG AA for text under 24px. Both spans, not just the count: the unit word is
  // small and muted, which is exactly the combination that fails.
  const countContrast = await contrastOf(page, '[data-testid="read-breath-mark"] span:first-child')
  expect(countContrast).toBeGreaterThanOrEqual(4.5)
  const unitContrast = await contrastOf(page, '[data-testid="read-breath-mark"] span:last-child')
  expect(unitContrast).toBeGreaterThanOrEqual(4.5)

  // And the phase totals, which are the smallest new text on the screen.
  const totalContrast = await contrastOf(page, '[data-testid^="read-phasetotal-"]')
  expect(totalContrast).toBeGreaterThanOrEqual(4.5)
}

test('Walk 4a: the measure and the phase totals clear AA in the default theme', async ({ page }) => {
  await page.goto(`/read/${VINYASA_ID}`)
  await expect(page.locator('[data-testid^="read-item-"]').first()).toBeVisible()

  await assertMeasureIsLegible(page)

  // FR-049: every block says how long it runs, and says it approximately — a phase
  // summed from breath counts is an estimate, not a clock.
  const totals = page.locator('[data-testid^="read-phasetotal-"]')
  const totalCount = await totals.count()
  expect(totalCount).toBeGreaterThan(0)
  for (let i = 0; i < totalCount; i++) {
    expect((await totals.nth(i).textContent())?.trim()).toMatch(/^~\d+(\.5)?\s(s|min|hr)$/)
  }
})

test.describe('in the dark, which is when it is actually read', () => {
  // The guardrails ask for this pass by hand every time (§1.2 smoke flow). The dark
  // tokens hang off `@media (prefers-color-scheme: dark)` behind a
  // `:root:not([data-theme="light"])` guard, so an emulated preference is enough —
  // no cookie seeding, and no dependence on /settings.
  test.use({ colorScheme: 'dark' })

  test('Walk 4b: the read view is legible with the lights off', async ({ page }) => {
    await page.goto(`/read/${VINYASA_ID}`)
    await expect(page.locator('[data-testid^="read-item-"]').first()).toBeVisible()

    const pageBackground = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(pageBackground).not.toBe('rgb(244, 241, 237)')

    await assertMeasureIsLegible(page)

    const nameContrast = await contrastOf(page, '.pose-row .read-pose-name')
    expect(nameContrast).toBeGreaterThanOrEqual(4.5)
  })
})

test('Walk 4c: exactly one row is marked, and a tap moves it', async ({ page }) => {
  await page.goto(`/read/${VINYASA_ID}`)
  const items = page.locator('[data-testid^="read-item-"]')
  await expect(items.first()).toBeVisible()

  // FR-002/SC-002: there is no unmarked state. The flow opens on its first item.
  const marked = page.locator('[data-current="true"]')
  await expect(marked).toHaveCount(1)
  await expect(page.getByTestId('read-item-0')).toHaveAttribute('data-current', 'true')

  await page.getByTestId('read-item-3').click()
  await expect(marked).toHaveCount(1)
  await expect(page.getByTestId('read-item-3')).toHaveAttribute('data-current', 'true')

  // FR-003: the mark is a fill plus a size step, so it survives a dimmed screen and
  // does not depend on colour alone.
  const currentSize = await page
    .locator('[data-testid="read-item-3"] .read-pose-name')
    .evaluate(el => parseFloat(getComputedStyle(el).fontSize))
  const plainSize = await page
    .locator('[data-testid="read-item-4"] .read-pose-name')
    .evaluate(el => parseFloat(getComputedStyle(el).fontSize))
  expect(currentSize).toBeGreaterThan(plainSize)

  // Marking a row must not push the page sideways at mat width.
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
  expect(scrollWidth).toBeLessThanOrEqual((page.viewportSize()?.width ?? 390) + 1)
})

test('Walk 4d: a marked stillness node is still never bolder than an active pose', async ({ page }) => {
  // Guardrails §2 is absolute about this, and the current-item size step is the one
  // thing in the app that could push a savasana past a pose. The flow ends on one.
  await page.goto(`/read/${VINYASA_ID}`)
  const rows = page.locator('[data-testid^="read-item-"]')
  await expect(rows.first()).toBeVisible()
  const count = await rows.count()

  const last = page.getByTestId(`read-item-${count - 1}`)
  await last.scrollIntoViewIfNeeded()
  await last.click()

  const measured = await page.evaluate(n => {
    const read = (index: number) => {
      const row = document.querySelector(`[data-testid="read-item-${index}"]`)!
      const name = row.querySelector('.read-pose-name')!
      const style = getComputedStyle(name)
      return {
        stillness: row.className.includes('kk-stillness'),
        size: parseFloat(style.fontSize),
        weight: Number(style.fontWeight),
      }
    }
    return { current: read(n - 1), neighbour: read(n - 2) }
  }, count)

  expect(measured.current.stillness).toBe(true)
  expect(measured.neighbour.stillness).toBe(false)
  expect(measured.current.size).toBeLessThanOrEqual(measured.neighbour.size)
  expect(measured.current.weight).toBeLessThanOrEqual(measured.neighbour.weight)

  // On paper there is no "now": the fill goes and the size step is undone, so a flow
  // printed hours before the class doesn't carry one arbitrarily larger row.
  await page.emulateMedia({ media: 'print' })
  const printed = await page.evaluate(n => {
    const row = document.querySelector(`[data-testid="read-item-${n - 1}"]`)!
    const plain = document.querySelector(`[data-testid="read-item-0"]`)!
    const size = (el: Element) =>
      parseFloat(getComputedStyle(el.querySelector('.read-pose-name')!).fontSize)
    return {
      background: getComputedStyle(row).backgroundColor,
      currentSize: size(row),
      stillnessBaseline: size(plain),
    }
  }, count)
  expect(printed.background).toMatch(/rgba?\(0, 0, 0, 0\)|transparent/)
  expect(printed.currentSize).toBeLessThan(printed.stillnessBaseline)
})
