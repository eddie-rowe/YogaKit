import { test, expect } from '@playwright/test'

// US1 (specs/002-auth-tenancy-billing/tasks.md T026): a solo practitioner with no
// pre-existing flows and no organization membership lands fully personal — no
// org/teacher/billing surface leaks into the UI just because those tables now exist.
//
// A real Google OAuth / email-OTP sign-up needs a live Supabase project and isn't
// exercisable in this Playwright run (no network identity provider, no mailbox to read
// the OTP link from) — that path is covered by scripts/verify-migrations.sh (T024's solo
// assertion block) at the RLS layer instead. This scenario covers what Playwright can
// exercise directly: the solo landing surface itself carries no org/teacher/billing
// references and the claim-flows prompt never appears with an empty local flow store.
test('solo landing: no pre-existing flows renders no claim prompt and no org/billing surface', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByTestId('onboarding-claim-flows')).toHaveCount(0)
  await expect(page.getByTestId('home-new-flow')).toBeVisible()

  const bodyText = await page.locator('body').innerText()
  expect(bodyText).not.toMatch(/\borganization\b/i)
  expect(bodyText).not.toMatch(/\bbilling\b/i)
  expect(bodyText).not.toMatch(/\bmembership\b/i)
})
