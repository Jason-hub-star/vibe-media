import { expect, test } from "@playwright/test";

test("public flow moves from home to radar, brief, sources, and newsletter", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /operator-first ai publishing hub/i })).toBeVisible();
  const navigation = page.getByRole("navigation", { name: "Primary" });

  await navigation.getByRole("link", { name: "Radar" }).click();
  await expect(page.getByRole("heading", { name: /one place to spot tools, skills, events/i })).toBeVisible();

  await navigation.getByRole("link", { name: "Brief" }).click();
  await expect(page.getByRole("heading", { name: /ai briefs prepared/i })).toBeVisible();

  await navigation.getByRole("link", { name: "Sources" }).click();
  await expect(page.getByRole("heading", { name: /tracked source feeds/i })).toBeVisible();

  await navigation.getByRole("link", { name: "Newsletter" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill("owner@vibehub.tech");
  await page.getByRole("button", { name: /join newsletter/i }).click();
  await expect(page.getByText(/subscription request saved/i)).toBeVisible();
});
