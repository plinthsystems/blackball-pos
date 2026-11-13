import { expect, test } from "@playwright/test";
import { loginAs } from "./auth";

test("Admin can see The Nine analytics and minimal navigation", async ({ page }) => {
  await loginAs(page, "admin@thenine.local");

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Owner overview" })).toBeVisible();
  await expect(page.getByText("Sales trend")).toBeVisible();
  await expect(page.getByRole("link", { name: "Live Floor" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Billing" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Menu" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Rates" })).toBeVisible();

  await page.getByRole("link", { name: "Live Floor" }).first().click();
  await expect(page).toHaveURL(/\/live-tables$/);
  await expect(page.getByRole("heading", { name: "Live Floor" })).toBeVisible();
});

test("Store opens on Live Floor and cannot enter admin routes", async ({ page }) => {
  await loginAs(page, "store@thenine.local");

  await expect(page).toHaveURL(/\/live-tables$/);
  await expect(page.getByRole("heading", { name: "Live Floor" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Billing" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Dashboard" })).toHaveCount(0);

  for (const route of ["/dashboard", "/rates", "/settings", "/hq/dashboard", "/platform/setup"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/live-tables$/);
  }
});
