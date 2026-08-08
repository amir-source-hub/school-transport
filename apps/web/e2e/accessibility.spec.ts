import { AxeBuilder } from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';

async function blockingViolations(page: Page) {
  // Audit the final interactive state, after entrance transitions have settled.
  await page.waitForTimeout(700);
  const results = await new AxeBuilder({ page }).analyze();
  return results.violations.filter(
    (violation) => violation.impact === 'critical' || violation.impact === 'serious',
  );
}

test('public pages expose no serious or critical accessibility violations', async ({ page }) => {
  for (const path of ['/', '/registration-guide', '/login']) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    const violations = await blockingViolations(page);
    expect(violations, `${path} has serious/critical axe violations`).toEqual([]);
  }
});

test('parent dashboard exposes no serious or critical accessibility violations', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: 'e2e-role', value: 'PARENT', url: baseURL! }]);
  await page.goto('/student/dashboard');
  await expect(page.getByRole('main')).toBeVisible();
  const violations = await blockingViolations(page);
  expect(violations, '/student/dashboard has serious/critical axe violations').toEqual([]);
});
