import { expect, test } from "@playwright/test";

test("staff can view the live table board", async ({ page }) => {
  await page.goto("/live-tables");
  await expect(page.getByRole("heading", { name: "Live Floor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Snooker & Pool" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PS5", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pool Table 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Royal Snooker 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mini Snooker 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PS5 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PS5 2" })).toBeVisible();
});

test("table cards remain usable on tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await page.goto("/live-tables");
  await expect(page.getByRole("heading", { name: "Live Floor" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start session for station/ }).first()).toBeVisible();
});
