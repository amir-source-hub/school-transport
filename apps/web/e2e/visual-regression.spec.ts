import { expect, test } from './fixtures';

test('public landing page matches its approved responsive visual baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page).toHaveScreenshot('public-landing.png', {
    animations: 'disabled',
    caret: 'initial',
    fullPage: true,
    // Allow minor cross-platform font rasterization while still failing meaningful layout drift.
    maxDiffPixelRatio: 0.03,
  });
});
