import { expect, test } from './fixtures';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'e2e-role', value: 'PARENT', url: baseURL! }]);
});

test('notification page is RTL, keyboard-readable, and overflow-free on real viewports', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([{ name: 'e2e-notifications', value: '1', url: baseURL! }]);
  await page.goto('/student/notifications');
  await expect(page.getByRole('heading', { name: 'اعلان‌ها' })).toBeVisible();
  await expect(page.getByText('خوانده‌نشده')).toBeVisible();
  await expect(page.getByRole('button', { name: 'خواندم' })).toBeEnabled();
  await page.getByRole('link', { name: 'مشاهده جزئیات' }).focus();
  await expect(page.getByRole('link', { name: 'مشاهده جزئیات' })).toBeFocused();
  const layout = await page.evaluate(() => ({
    direction: getComputedStyle(document.documentElement).direction,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  }));
  expect(layout).toEqual({ direction: 'rtl', overflow: false });
});

test('mobile receipt capture keeps long filenames responsive and reports real upload failure', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name === 'chromium', 'Receipt capture runs in touch viewports.');
  testInfo.annotations.push({
    type: 'allowed-browser-failure',
    description: '503 (Service Unavailable)',
  });
  await context.addCookies([
    { name: 'e2e-payments', value: '1', url: baseURL! },
    { name: 'e2e-receipt-failure', value: '1', url: baseURL! },
  ]);
  await page.goto('/student/payments');
  await expect(page.getByRole('heading', { name: 'ثبت پرداخت آفلاین' })).toBeVisible();
  await page.getByLabel('تاریخ پرداخت (شمسی)').fill('۱۴۰۵۰۱۰۱');
  await page.getByLabel('شماره پیگیری بانکی').fill('123456789');
  await page.getByLabel('تصویر رسید (JPEG یا PNG)').setInputFiles({
    name: `${'رسید-بسیار-طولانی-'.repeat(12)}.jpg`,
    mimeType: 'image/jpeg',
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  await expect(page.getByAltText('پیش‌نمایش رسید پرداخت')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false);
  await page.getByRole('button', { name: 'ارسال رسید برای بررسی مدیر' }).click();
  await expect(
    page.getByText('در حال حاضر انجام این درخواست ممکن نیست. لطفاً دوباره تلاش کنید.'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'ارسال رسید برای بررسی مدیر' })).toBeEnabled();
});
