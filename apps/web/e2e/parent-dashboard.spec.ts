import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("parent dashboard keeps selected-student context clear", async ({ page }) => {
  await page.goto("/parent/dashboard");

  await expect(
    page.getByRole("heading", { name: "وضعیت هر دانش‌آموز را جداگانه پیگیری کنید" }),
  ).toBeVisible();
  await expect(page.getByText("داده نمایشی", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "دانش‌آموز نمونه دو" }).click();

  await expect(page.getByRole("button", { name: "دانش‌آموز نمونه دو" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("alert").filter({ hasText: "این درخواست برای اصلاح" }),
  ).toBeVisible();
  await expect(page.getByText("درخواست نمونه برای بررسی ارسال شده است.")).toHaveCount(0);

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations).toEqual([]);
});

test("parent mobile navigation opens and reaches an empty section", async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "Mobile navigation is only visible on mobile.");

  await page.goto("/parent/dashboard");
  await page.getByRole("button", { name: "باز کردن منوی پنل" }).click();
  await page.getByRole("link", { name: "قراردادها" }).click();

  await expect(page).toHaveURL("/parent/contracts");
  await expect(page.getByRole("heading", { level: 1, name: "قراردادها" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("هنوز قرارداد آماده‌ای");
});
