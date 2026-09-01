import { test, expect } from '@playwright/test'

/** US3 at 390px, where the control row and the touch targets actually have to fit. */

test.describe('pose anatomy diagram', () => {
  test('a stillness pose gets no diagram at all, not an empty frame', async ({ page }) => {
    // FR-017. seated-stillness carries no muscles, meridians, joints, or chakras.
    await page.goto('/poses/seated-stillness')
    await expect(page.getByTestId('poses-body-diagram')).toHaveCount(0)
    await expect(page.getByTestId('body-diagram-depth-legend')).toHaveCount(0)
    await expect(page.getByText(/data for this pose/i)).toHaveCount(0)
    // The page itself still reads — the absence is scoped to the diagram.
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('offers only the categories holding data, and never a dead-end tab', async ({ page }) => {
    // SC-005. Every visible trigger must lead to something.
    await page.goto('/poses/camel')
    const tabs = page.getByRole('tab')
    const count = await tabs.count()

    if (count === 0) {
      // A single-category pose presents as a view, not a one-tab tab set.
      await expect(page.locator('[data-testid^="body-diagram-single-"]')).toHaveCount(1)
    } else {
      for (let i = 0; i < count; i++) {
        await tabs.nth(i).click()
        // Whatever the layer, it has at least one legend entry to explain.
        await expect(page.locator('[data-testid^="body-diagram-legend-"]').first()).toBeVisible()
      }
    }
  })

  test('keeps the tab row and the view toggle on one line at 390px', async ({ page }) => {
    // FR-018.
    await page.goto('/poses/camel')
    const toggle = page.getByTestId('body-diagram-view-front')
    await expect(toggle).toBeVisible()

    const anchor = (await page.getByRole('tab').count()) > 0
      ? page.getByRole('tab').first()
      : page.locator('[data-testid^="body-diagram-single-"]').first()

    const toggleBox = await toggle.boundingBox()
    const anchorBox = await anchor.boundingBox()
    expect(toggleBox).not.toBeNull()
    expect(anchorBox).not.toBeNull()
    // Same row: the vertical centres coincide within a couple of pixels.
    const toggleMid = toggleBox!.y + toggleBox!.height / 2
    const anchorMid = anchorBox!.y + anchorBox!.height / 2
    expect(Math.abs(toggleMid - anchorMid)).toBeLessThan(4)
  })

  test('legend chips are real buttons that meet the touch floor', async ({ page }) => {
    // FR-026: 40px under a coarse pointer, inherited from kk-chip now they are buttons.
    await page.goto('/poses/camel')
    const chip = page.locator('[data-testid^="body-diagram-legend-"]').first()
    await expect(chip).toBeVisible()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')

    const box = await chip.boundingBox()
    expect(box!.height).toBeGreaterThanOrEqual(40)

    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
  })

  test('reaches the legend by keyboard, and toggles it there', async ({ page }) => {
    // Legend entries entered the tab order for the first time in this change.
    await page.goto('/poses/camel')
    const chip = page.locator('[data-testid^="body-diagram-legend-"]').first()
    await chip.focus()
    await expect(chip).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
  })
})
