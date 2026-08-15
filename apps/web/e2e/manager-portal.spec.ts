import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from './fixtures';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'e2e-role', value: 'SCHOOL_MANAGER', url: baseURL! }]);
});

test('manager routes remain usable, RTL, and free of serious accessibility violations', async ({
  page,
}) => {
  for (const path of [
    '/manager/dashboard',
    '/manager/students',
    '/manager/drivers',
    '/manager/online-control',
    '/manager/hyperschool',
    '/manager/feedback',
    '/manager/settings',
  ]) {
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('main')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((item) => item.impact === 'critical' || item.impact === 'serious'),
      `${path} accessibility`,
    ).toEqual([]);
  }
});

test('manager drawer is keyboard accessible and restores focus', async ({ page }) => {
  await page.goto('/manager/dashboard');
  const trigger = page.getByRole('button', { name: 'باز کردن منوی مدیر مدرسه' });
  if (await trigger.isVisible()) {
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test('manager sees scoped students and can open an allowed detail', async ({ page }) => {
  await page.goto('/manager/students');
  await expect(page.getByText('0012345678')).toHaveCount(2);
  await expect(page.getByText('09120000000')).toHaveCount(0);
  await page.locator('a:visible').filter({ hasText: 'دانش‌آموز با نام طولانی آزمایشی' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('دانش‌آموز');
  await expect(page.getByText('09120000000')).toBeVisible();
  await expect(page.getByText('نشانی‌ها')).toBeVisible();
  await expect(page.getByText('اطلاعات راننده آزمایشی است')).toBeVisible();
});

test('experimental and deferred features perform no location, camera, or driver-auth requests', async ({
  page,
}) => {
  const sensitiveRequests: string[] = [];
  page.on('request', (request) => {
    if (/gps|location|camera|video|driver\/login/i.test(request.url()))
      sensitiveRequests.push(request.url());
  });
  await page.goto('/manager/drivers');
  await expect(page.getByText('اطلاعات آزمایشی').first()).toBeVisible();
  await page.getByRole('link', { name: /آریا نیک‌راه/ }).click();
  await expect(page.getByText('09121234567')).toBeVisible();
  await expect(page.getByText('0013540394')).toBeVisible();
  await expect(page.getByText('1404123456')).toBeVisible();
  await page.goto('/manager/online-control');
  await expect(page.getByRole('button', { name: 'نمایش موقعیت زنده' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'مشاهده تصویر خودرو' })).toBeDisabled();
  expect(sensitiveRequests).toEqual([]);
});
