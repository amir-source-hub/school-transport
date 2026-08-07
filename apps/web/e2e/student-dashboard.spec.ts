import { expect, test } from './fixtures';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'e2e-role', value: 'PARENT', url: baseURL! }]);
});

test('parent dashboard authorizes against seeded fixtures and renders empty state', async ({
  page,
}) => {
  await page.goto('/student/dashboard');
  await expect(
    page.getByRole('status').filter({ hasText: 'Ù‡Ù†ÙˆØ² Ø¯Ø§Ù†Ø´â€ŒØ¢Ù…ÙˆØ²ÛŒ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª' }),
  ).toBeVisible();
});

test('parent session dependency renders an intentional 503 state and retries safely', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'Dependency-state smoke runs once on desktop.');
  await context.addCookies([{ name: 'e2e-failure', value: '503', url: baseURL! }]);
  await page.goto('/student/dashboard');
  const alert = page.getByRole('alert').filter({ hasText: 'Ø¨Ø±Ø±Ø³ÛŒ Ù†Ø´Ø³Øª Ø­Ø³Ø§Ø¨ Ù…Ù…Ú©Ù† Ù†ÛŒØ³Øª' });
  await expect(alert).toContainText('Ø¨Ø±Ø±Ø³ÛŒ Ù†Ø´Ø³Øª Ø­Ø³Ø§Ø¨ Ù…Ù…Ú©Ù† Ù†ÛŒØ³Øª');

  await context.addCookies([
    { name: 'e2e-failure', value: '', url: baseURL!, expires: Math.floor(Date.now() / 1000) - 1 },
  ]);
  await alert.getByRole('button', { name: 'ØªÙ„Ø§Ø´ Ø¯ÙˆØ¨Ø§Ø±Ù‡' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Ù‡Ù†ÙˆØ² Ø¯Ø§Ù†Ø´â€ŒØ¢Ù…ÙˆØ²ÛŒ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª' }),
  ).toBeVisible();
});

test('parent dock does not overlap phone/tablet content or phone 200% root text', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'chromium', 'Dock contract runs in touch viewport projects.');
  await page.goto('/student/dashboard');
  if (testInfo.project.name === 'phone-320') {
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  }
  const dock = page.getByRole('navigation', { name: 'Ù†Ø§ÙˆØ¨Ø±ÛŒ Ø³Ø±ÛŒØ¹ Ù…ÙˆØ¨Ø§ÛŒÙ„' });
  const main = page.getByRole('main');
  await expect(dock).toBeVisible();
  const geometry = await page.evaluate(() => {
    const dockElement = document.querySelector('nav[aria-label="Ù†Ø§ÙˆØ¨Ø±ÛŒ Ø³Ø±ÛŒØ¹ Ù…ÙˆØ¨Ø§ÛŒÙ„"]');
    const mainElement = document.querySelector('main');
    if (!dockElement || !mainElement) return null;
    return {
      dockHeight: dockElement.getBoundingClientRect().height,
      mainPaddingBottom: Number.parseFloat(getComputedStyle(mainElement).paddingBottom),
      horizontalOverflow:
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.mainPaddingBottom).toBeGreaterThanOrEqual(geometry!.dockHeight);
  expect(geometry!.horizontalOverflow).toBe(false);
  await expect(
    main.getByRole('status').filter({ hasText: 'Ù‡Ù†ÙˆØ² Ø¯Ø§Ù†Ø´â€ŒØ¢Ù…ÙˆØ²ÛŒ Ø«Ø¨Øª Ù†Ø´Ø¯Ù‡ Ø§Ø³Øª' }),
  ).toBeVisible();
});

