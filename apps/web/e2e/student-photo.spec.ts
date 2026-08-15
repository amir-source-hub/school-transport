import { expect, test } from './fixtures';

const onePixelPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'e2e-role', value: 'PARENT', url: baseURL! },
    { name: 'e2e-photo', value: '1', url: baseURL! },
  ]);
});

test('student photo field supports touch upload, preview, privacy, and responsive status', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'chromium', 'Photo capture runs in touch viewports.');
  await page.goto('/student/students/student-photo-1');

  await expect(
    page.getByRole('heading', { name: 'عکس پرسنلی دانش‌آموز برای صدور کارت سرویس' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'حریم خصوصی و نحوه نگهداری عکس' })).toHaveAttribute(
    'href',
    '/about#privacy',
  );

  await page.getByLabel(/انتخاب عکس/).setInputFiles({
    name: `${'عکس-دانش‌آموز-'.repeat(12)}.png`,
    mimeType: 'image/png',
    buffer: onePixelPng,
  });
  await expect(page.getByAltText('پیش‌نمایش عکس انتخابی')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false);

  await page.getByRole('button', { name: 'بارگذاری و ارسال برای بررسی' }).click();
  await expect(page.getByRole('status')).toContainText(
    'عکس پرسنلی دانش‌آموز بارگذاری شد و برای صدور کارت سرویس در صف بررسی قرار گرفت.',
  );
  await expect(page.getByAltText('پیش‌نمایش عکس انتخابی')).toHaveCount(0);
});
