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

test('combined enrollment rules survive retry and submit normalized values', async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The combined contract runs once on desktop.');
  test.setTimeout(60_000);
  testInfo.annotations.push({
    type: 'allowed-browser-failure',
    description: 'server responded with a status of 503',
  });
  await context.addCookies([{ name: 'e2e-photo', value: '1', url: baseURL! }]);

  let attempts = 0;
  let submitted: Record<string, unknown> | undefined;
  await page.route('**/api/v1/enrollments/guided', async (route) => {
    attempts += 1;
    submitted = route.request().postDataJSON() as Record<string, unknown>;
    if (attempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'temporary enrollment failure' },
          meta: { requestId: 'retry-1' },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          registrationId: 'registration-e2e',
          studentId: 'student-e2e',
          contractId: 'contract-e2e',
          scheduleItemId: 'schedule-e2e',
          prepaymentAmount: 4_000_000,
          contractText: 'قرارداد آزمایشی',
        },
      }),
    });
  });

  await page.goto('/student/enrollments');
  const studentSection = page.getByRole('heading', { name: 'مشخصات دانش‌آموز' }).locator('..');
  await expect(studentSection.getByLabel('شماره تلفن منزل')).toHaveValue('');
  await expect(studentSection.getByText('021')).toBeVisible();
  await expect(studentSection.getByLabel('شماره همراه دانش‌آموز')).toHaveValue('');
  await expect(studentSection.getByText('09')).toBeVisible();
  await studentSection.getByLabel('شماره تلفن منزل').fill('۲۲۱۱۳۳۳۳');
  await studentSection.getByLabel('نام دانش‌آموز').fill('علی');
  await studentSection.getByLabel('نام خانوادگی').fill('احمدی');
  const studentNationalId = studentSection.getByLabel('کد ملی');
  await studentNationalId.fill('۰۰۲۳');
  await expect(studentNationalId).toHaveAttribute('dir', 'ltr');
  await expect(studentNationalId).toHaveCSS('text-align', 'left');

  const birthDate = page.getByRole('group', { name: 'تاریخ تولد (شمسی)' });
  await birthDate.getByLabel('سال').fill('۱۳۹۵');
  await birthDate.getByLabel('ماه').fill('۰۷');
  await birthDate.getByLabel('روز').fill('۱۵');
  await expect(page.getByText(/تاریخ انتخاب‌شده/)).toContainText('1395/07/15');

  const guardianSection = page.getByRole('heading', { name: 'سرپرست' }).locator('..');
  await guardianSection.getByRole('combobox', { name: 'نسبت' }).click();
  await page.getByRole('option', { name: 'پدر' }).click();
  await expect(guardianSection.getByLabel('نام', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'اطلاعات پدر' })).toHaveCount(0);
  const motherSection = page.getByRole('heading', { name: 'اطلاعات مادر' }).locator('..');
  await motherSection.getByLabel('نام', { exact: true }).fill('مریم');
  await motherSection.getByLabel('نام خانوادگی').fill('احمدی');
  await motherSection.getByLabel('کد ملی').fill('۰۰۶۷۷۴۹۸۱۱');
  const motherPhone = motherSection.getByLabel('شماره همراه');
  await expect(motherPhone).toHaveValue('09');
  await motherPhone.fill('۰۹۰۹۱۲۳۴۵۶۷۸۹');
  await expect(motherPhone).toHaveValue('09123456789');

  await guardianSection.getByRole('combobox', { name: 'نسبت' }).click();
  await page.getByRole('option', { name: 'سایر' }).click();
  await guardianSection.getByLabel('نام', { exact: true }).fill('زهرا');
  await guardianSection.getByLabel('نام خانوادگی').fill('کاظمی');
  await guardianSection.getByLabel('کد ملی').fill('۱۲۳');
  await guardianSection.getByLabel('شرح نسبت').fill('خاله');
  await expect(page.getByRole('heading', { name: 'اطلاعات پدر' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'اطلاعات مادر' })).toHaveCount(0);

  const photoInput = page.getByLabel(/انتخاب عکس/);
  await photoInput.setInputFiles({
    name: 'too-large.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1),
  });
  await expect(page.getByText(/۵ مگابایت بیشتر/)).toBeVisible();
  await photoInput.setInputFiles({
    name: 'boundary.png',
    mimeType: 'image/png',
    buffer: Buffer.alloc(5 * 1024 * 1024),
  });
  await page.getByRole('button', { name: 'بارگذاری و ارسال برای بررسی' }).click();
  await expect(page.getByText(/عکس در پیش‌نویس/)).toBeVisible();

  await page.getByRole('button', { name: 'مرحله بعد' }).click();
  await page.getByLabel('نشانی کامل').fill('خیابان آزادی، پلاک ۱۰');
  await page.getByLabel('کد پستی').fill('۰۱۲۳۴۵۶۷۸۹');
  await page.getByLabel('عرض جغرافیایی').fill('35.72');
  await page.getByLabel('طول جغرافیایی').fill('51.33');
  await page.getByRole('button', { name: 'مرحله بعد' }).click();
  await page.getByRole('button', { name: 'مرحله بعد' }).click();

  await page.getByRole('button', { name: /مشاهده قرارداد/ }).click();
  await expect(page.getByText(/مشکلی در سرویس رخ داده است/)).toBeVisible();
  expect(attempts).toBe(1);
  await page.getByRole('button', { name: /مشاهده قرارداد/ }).click();
  await expect(page.getByText('قرارداد آزمایشی')).toBeVisible();
  expect(attempts).toBe(2);

  const payload = submitted as {
    student: { nationalId: string; birthDate: string };
    guardian: { nationalId: string; relationshipType: string };
    father: null;
    mother: null;
    homePhone: string;
  };
  expect(payload.student.nationalId).toBe('0023');
  expect(payload.guardian).toMatchObject({ nationalId: '123', relationshipType: 'OTHER' });
  expect(payload.father).toBeNull();
  expect(payload.mother).toBeNull();
  expect(payload.homePhone).toBe('02122113333');
  expect(payload.student.birthDate).toMatch(/^20\d{2}-\d{2}-\d{2}$/);
  await expect
    .poll(() =>
      page.evaluate(() =>
        sessionStorage.getItem('school-transport:enrollment-safe-draft:v1:panel'),
      ),
    )
    .toBeNull();
});
