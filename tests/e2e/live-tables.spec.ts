import { expect, test } from "@playwright/test";
import { loginAs } from "./auth";

test("staff can view the live table board", async ({ page }) => {
  await loginAs(page, "store@thenine.local");
  await expect(page.getByRole("heading", { name: "Live Floor" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "The Nine Tables" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pool" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Royal Snooker 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mini Snooker 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Royal Snooker 2" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mini Snooker 2" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "PS5 1" })).toHaveCount(0);
});

test("table cards remain usable on tablet width", async ({ page }) => {
  await page.setViewportSize({ width: 834, height: 1194 });
  await loginAs(page, "store@thenine.local");
  await expect(page.getByRole("heading", { name: "Live Floor" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start session for station/ }).first()).toBeVisible();
});
