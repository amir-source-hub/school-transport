import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("admin dashboard shows documented mock operational summaries", async ({ page }) => {
  await page.goto("/admin/dashboard");

  await expect(page.getByRole("heading", { level: 1, name: "داشبورد مدیریت" })).toBeVisible();
  await expect(page.getByText("ثبت‌نام‌های در انتظار")).toBeVisible();
  await expect(page.getByText("پرداخت آفلاین منتظر بررسی")).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "کد پیگیری" })).toBeVisible();
  await expect(page.getByText("داده نمایشی", { exact: true })).toBeVisible();

  await expect(page.getByRole("link", { name: /راننده|خودرو|حضور/ })).toHaveCount(0);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("admin mobile drawer reaches an MVP section", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile drawer is only visible on mobile.");

  await page.goto("/admin/dashboard");
  await page.getByRole("button", { name: "باز کردن منوی مدیریت" }).click();
  await page.getByRole("link", { name: "قیمت‌گذاری" }).click();

  await expect(page).toHaveURL("/admin/pricing");
  await expect(page.getByRole("heading", { level: 1, name: "قیمت‌گذاری" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("ثبت و تغییر قیمت");
});

test("registration queue preserves filters in the URL and keeps review actions safe", async ({ page }) => {
  await page.goto("/admin/registrations");

  await page.getByRole("textbox", { name: "جست‌وجو", exact: true }).fill("پیگیری-۰۰۱");
  await page.getByRole("combobox", { name: "وضعیت" }).selectOption("در حال بررسی");
  await page.getByRole("combobox", { name: "مرتب‌سازی" }).selectOption("student");
  await page.getByRole("button", { name: "اعمال فیلتر" }).click();

  await expect(page).toHaveURL(/q=.*status=.*sort=student/);
  await expect(page.getByText("دانش‌آموز نمونه یک").filter({ visible: true })).toBeVisible();
  await expect(page.getByText("دانش‌آموز نمونه دو")).toHaveCount(0);

  await page.goto("/admin/registrations/registration-001");
  await expect(page.getByRole("heading", { level: 1, name: /بررسی درخواست دانش‌آموز نمونه یک/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "تأیید درخواست" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "رد درخواست با دلیل" })).toBeDisabled();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});
