import type { Page } from "@playwright/test";

export async function loginAs(page: Page, email: string) {
  await page.goto("/login");
  await page.getByPlaceholder("admin@thenine.local").fill(email);
  await page.getByPlaceholder("••••••••").fill(process.env.THE_NINE_DEFAULT_PASSWORD ?? "Password@123");
  await page.getByRole("button", { name: "Sign In" }).click();
}
