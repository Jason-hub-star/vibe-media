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
  await expect(page.getByRole("link", { name: /^publish$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^exceptions$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^policies$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^programs$/i })).toBeVisible();
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

test("admin publish queue shows mixed release surfaces", async ({ page }) => {
  await page.goto("/admin/publish");
  await signIn(page);
  await expect(page.getByRole("heading", { name: /publish queue/i })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText(/uploaded_private/i)).toBeVisible();
  await expect(page.getByRole("cell", { name: /ai engineer world's fair ai engineer world's fair/i })).toBeVisible();
});

test("admin exceptions queue shows blocked and low-confidence items", async ({ page }) => {
  await page.goto("/admin/exceptions");
  await signIn(page);
  await expect(page.getByRole("heading", { name: /^exceptions$/i })).toBeVisible();
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByText(/quote boundary review needed/i)).toBeVisible();
  await expect(page.getByText(/privacy-sensitive voice chat/i)).toBeVisible();
});

test("admin policies and programs expose operator references", async ({ page }) => {
  await page.goto("/admin/policies");
  await signIn(page);
  await expect(page.getByRole("heading", { name: /^policies$/i })).toBeVisible();
  await expect(page.getByText(/review-policy\.md/i)).toBeVisible();

  await page.goto("/admin/programs");
  await expect(page.getByRole("heading", { name: /^programs$/i })).toBeVisible();
  await expect(page.getByText(/brief\.program\.md/i)).toBeVisible();
});
