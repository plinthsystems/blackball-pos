import { expect, test } from "@playwright/test";
import { loginAs } from "./auth";

test("owner can view dashboard and rates", async ({ page }) => {
  await loginAs(page, "admin@thenine.local");
  await expect(page.getByRole("heading", { name: "The Nine Admin" })).toBeVisible();
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
