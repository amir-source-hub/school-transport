import { expect, test } from './fixtures';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'e2e-role', value: 'PARENT', url: baseURL! },
    { name: 'e2e-enrollment', value: '1', url: baseURL! },
  ]);
});

test('enrollment form restores safe choices and focuses mobile validation errors', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'chromium',
    'Long-form mobile behavior runs in touch viewports.',
  );
  await page.goto('/student/enrollments');
  await expect(page.getByRole('heading', { level: 1, name: 'ثبت‌نام و پیگیری' })).toBeVisible();
  await expect(page.getByLabel('تاریخ تولد (شمسی)')).toBeVisible();
  await expect(page.getByLabel(/انتخاب عکس/)).toHaveAttribute('accept', 'image/jpeg,image/png');

  await page.getByLabel('جنسیت').click();
  await page.getByRole('option', { name: 'دختر' }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem('school-transport:enrollment-safe-draft:v1:panel'),
      ),
    )
    .toContain('FEMALE');
  await page.reload();
  await expect(page.getByLabel('جنسیت')).toContainText('دختر');

  await page.getByRole('button', { name: 'مرحله بعد' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'لطفاً خطاهای زیر را اصلاح کنید' }),
  ).toBeVisible();
  await expect(page.getByLabel('نام دانش‌آموز')).toBeFocused();
  await page.evaluate(() =>
    sessionStorage.setItem(
      'school-transport:enrollment-safe-draft:v1:panel',
      JSON.stringify({
        version: 1,
        savedAt: Date.now(),
        step: 2,
        values: { addressTitle: 'خانه', province: 'تهران', city: 'تهران' },
      }),
    ),
  );
  await page.reload();
  const map = page.getByLabel('نقشه انتخاب موقعیت؛ برای جابه‌جایی نشانگر روی نقشه کلیک کنید');
  await expect(map).toBeVisible();
  await map.focus();
  await expect(map).toBeFocused();
  await expect(page.getByLabel('نشانی کامل')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    ),
  ).toBe(false);
});
