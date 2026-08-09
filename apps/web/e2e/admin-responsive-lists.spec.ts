import { expect, test } from './fixtures';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'e2e-role', value: 'ADMIN', url: baseURL! },
    { name: 'e2e-admin-data', value: '1', url: baseURL! },
  ]);
});

test('admin lists preserve context and actions without horizontal overflow', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'chromium',
    'Responsive alternatives run in touch viewports.',
  );
  for (const path of ['/admin/admins', '/admin/registrations', '/admin/dashboard']) {
    await page.goto(path);
    await expect(page.getByRole('main')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      ),
      path,
    ).toBe(false);
  }
  await page.goto('/admin/admins');
  const adminList =
    testInfo.project.name === 'phone-320'
      ? page.getByLabel('فهرست مدیران')
      : page.getByLabel('جدول مدیران');
  await expect(adminList).toContainText('administrator-with-a-very-long-username');
  await expect(adminList.getByRole('button', { name: 'ویرایش' })).toBeVisible();
  await page.goto('/admin/registrations');
  if (testInfo.project.name === 'phone-320') {
    await expect(
      page.locator('p:visible', { hasText: 'دانش‌آموز با نام طولانی آزمایشی' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'مشاهده جزئیات و اقدامات' })).toBeVisible();
  } else {
    await expect(
      page.getByLabel('جدول درخواست‌های ثبت‌نام').getByText('دانش‌آموز با نام طولانی آزمایشی'),
    ).toBeVisible();
    await expect(
      page.getByLabel('جدول درخواست‌های ثبت‌نام').getByRole('link', { name: 'جزئیات و اقدامات' }),
    ).toBeVisible();
  }
  await page.goto('/admin/dashboard');
  await expect(
    testInfo.project.name === 'phone-320'
      ? page.getByLabel('ثبت‌نام‌های اخیر', { exact: true })
      : page.getByLabel('جدول ثبت‌نام‌های اخیر'),
  ).toContainText('شروع بررسی');
});
