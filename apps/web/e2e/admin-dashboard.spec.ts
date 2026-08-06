import { expect, test } from './fixtures';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'e2e-role', value: 'ADMIN', url: baseURL! }]);
});

test('admin dashboard authorizes against seeded fixtures and renders summaries', async ({
  page,
}) => {
  await page.goto('/admin/dashboard');
  await expect(page.getByRole('heading', { level: 1, name: 'داشبورد مدیریت' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'شاخص‌های کلیدی عملیات' })).toBeVisible();
});

test('admin drawer remains keyboard-dismissable on phone and tablet', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'chromium', 'Drawer runs in touch viewport projects.');
  await page.goto('/admin/dashboard');
  const trigger = page.getByRole('button', { name: 'باز کردن منوی مدیریت' });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'پنل مدیریت' });
  await expect(dialog.getByRole('link', { name: 'گزارش‌ها' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});
