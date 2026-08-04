import { expect, test } from "@playwright/test";

test("owner can view dashboard and rates", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Owner Dashboard" })).toBeVisible();
  await expect(page.getByText("Today's revenue", { exact: true })).toBeVisible();
  await expect(page.getByText("PS5 time")).toBeVisible();

  await page.goto("/rates");
  await expect(page.getByRole("heading", { name: "Hourly Rates" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Rate for Royal Snooker" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Rate for Mini Snooker" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Rate for Pool" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Rate for PS5 · 1 player" })).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "Rate for PS5 · 4 players" })).toBeVisible();
});
