import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicPages = [
  ['/', 'مسیر ساده‌تر برای مدیریت سرویس مدرسه'],
  ['/about', 'یک مسیر یکپارچه برای خانواده و مدیریت مدرسه'],
  ['/services', 'همه مراحل اصلی سرویس مدرسه در یک فضای مشخص'],
  ['/registration-guide', 'مراحل ثبت‌نام را پیش از شروع بشناسید'],
  ['/pricing', 'قیمت نهایی پس از بررسی درخواست تعیین می‌شود'],
  ['/schools', 'انتخاب مدرسه از فهرست تأییدشده سامانه'],
  ['/faq', 'پاسخ کوتاه به پرسش‌های اصلی خانواده‌ها'],
  ['/contact', 'برای دریافت راهنمایی با پشتیبانی در ارتباط باشید'],
] as const;

for (const [path, heading] of publicPages) {
  test(`${path} renders in Persian RTL without accessibility violations`, async ({ page }) => {
    await page.goto(path);

    await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}

test('public navigation reaches the registration guide', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'راهنمای ثبت‌نام' }).first().click();

  await expect(page).toHaveURL('/registration-guide');
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'مراحل ثبت‌نام را پیش از شروع بشناسید',
    }),
  ).toBeVisible();
});
