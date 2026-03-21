import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.getByRole("textbox", { name: "Operator key" }).fill("operator");
  await page.getByRole("button", { name: /enter admin/i }).click();
}

test("admin brief review flow is accessible after lightweight sign-in", async ({ page }) => {
  await page.goto("/admin/briefs");
  await signIn(page);
  await expect(page.getByRole("heading", { name: /brief review/i })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("admin video jobs are visible inside the internal operations area", async ({ page }) => {
  await page.goto("/admin/video-jobs");
  await signIn(page);
  await expect(page.getByRole("heading", { name: /video jobs/i })).toBeVisible();
  await expect(page.getByText(/minecraft survival session/i)).toBeVisible();
});

test("admin discover registry is visible inside the internal operations area", async ({ page }) => {
  await page.goto("/admin/discover");
  await signIn(page);
  await expect(page.getByRole("heading", { name: /discovery registry/i })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("admin shell exposes inbox, runs, and review pages", async ({ page }) => {
  await page.goto("/admin");
  await signIn(page);
  await expect(page.getByRole("link", { name: /inbox/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^runs$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^review$/i })).toBeVisible();
});

test("admin inbox and runs tables are visible", async ({ page }) => {
  await page.goto("/admin/inbox");
  await signIn(page);
  await expect(page.getByRole("heading", { name: /^inbox$/i })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();

  await page.goto("/admin/runs");
  await expect(page.getByRole("heading", { name: /^runs$/i })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
});

test("admin review shows multiple queue items", async ({ page }) => {
  await page.goto("/admin/review");
  await signIn(page);
  await expect(page.getByRole("heading", { name: /^review$/i })).toBeVisible();
  await expect(page.getByText(/queue item 1/i)).toBeVisible();
  await expect(page.getByText(/queue item 2/i)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: /karpathy on the loopy era of ai/i })).toBeVisible();
});
