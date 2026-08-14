import { expect, test } from './fixtures';

test('public navigation and auth entry render without external providers', async ({
  page,
  context,
  baseURL,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  const heroCta = page.getByRole('link', { name: 'ثبت‌نام و ورود' }).first();
  await expect(heroCta).toBeVisible();
  await expect(heroCta).toHaveAttribute('href', '/login');

  await page.getByRole('link', { name: 'مراحل ثبت‌نام' }).first().click();
  await expect(page).toHaveURL('/registration-guide');
  await expect(
    page.getByRole('heading', { level: 1, name: 'مراحل ثبت‌نام را قدم به قدم بشناسید' }),
  ).toBeVisible();

  await context.addCookies([{ name: 'e2e-auth', value: 'anon', url: baseURL! }]);
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1, name: 'ورود یا ساخت حساب' })).toBeVisible();
  await page.getByLabel('شماره همراه سرپرست').fill('0912');
  await page.getByRole('button', { name: 'ورود یا ثبت‌نام و ادامه' }).click();
  await expect(page.getByText('شماره همراه را با قالب 09xxxxxxxxx وارد کنید.')).toBeVisible();
});

test('public drawer survives phone/tablet layouts and phone 200% root text', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === 'chromium',
    'Drawer contract runs in touch viewport projects.',
  );
  await page.goto('/');
  if (testInfo.project.name === 'phone-320') {
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
  }
  await page.getByRole('button', { name: 'باز کردن منوی اصلی' }).click();
  const dialog = page.getByRole('dialog', { name: 'منوی اصلی' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'مراحل ثبت‌نام' })).toBeVisible();
  expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(
    true,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'باز کردن منوی اصلی' })).toBeFocused();
});
