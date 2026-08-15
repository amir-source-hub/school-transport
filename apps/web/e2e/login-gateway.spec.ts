import { expect, test } from './fixtures';

test.describe('unified login gateway', () => {
  test('anonymous users can switch roles and see the correct form per role', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'e2e-auth', value: 'anon', url: baseURL! }]);
    await page.goto('/login');

    const studentForm = page.getByRole('button', { name: 'ورود یا ثبت‌نام و ادامه' });
    const managerForm = page.getByRole('button', { name: 'ورود به پنل مدرسه' });
    const driverForm = page.getByRole('button', { name: 'ورود به پنل راننده' });

    await expect(studentForm).toBeVisible();
    await expect(page.getByLabel('شماره همراه سرپرست')).toBeVisible();
    await expect(managerForm).toBeHidden();

    await page.getByRole('radio', { name: /پنل مدیر مدرسه/ }).click();
    await expect(managerForm).toBeVisible();
    await expect(page.getByLabel(/نام کاربری/)).toBeVisible();
    await expect(studentForm).toBeHidden();

    const driverRadio = page.getByRole('radio', { name: /پنل راننده/ });
    await expect(driverRadio).toHaveAttribute('tabindex', '-1');
    await driverRadio.click();
    await expect(managerForm).toBeVisible();
    await expect(driverForm).toBeHidden();
    await expect(page.getByRole('radio', { name: /پنل مدیر مدرسه/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('already-authenticated families and admins skip login', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'e2e-role', value: 'PARENT', url: baseURL! }]);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/student\/dashboard$/);

    await page.context().clearCookies();
    await page.context().addCookies([{ name: 'e2e-role', value: 'ADMIN', url: baseURL! }]);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
  });

  test('does not expose the private admin login entry point', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.addCookies([{ name: 'e2e-auth', value: 'anon', url: baseURL! }]);
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /صفحه ورود مدیریت/ })).toHaveCount(0);
  });
});
