import { test, expect } from "@playwright/test";

const pages = [
  { name: "home", path: "/" },
  { name: "brief-list", path: "/brief" },
  { name: "radar", path: "/radar" },
  { name: "sources", path: "/sources" },
];

for (const { name, path } of pages) {
  test(`public UX — ${name} has no internal jargon`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `test-results/screenshot-${name}.png`, fullPage: true });

    // Internal jargon that must NOT appear on public pages
    const body = await page.textContent("body");
    const jargon = [
      "Operator-first",
      "admin cockpit",
      "stitch-guided",
      "test-backed",
      "operator-friendly",
      "drafting pipeline",
      "operator@vibehub.tech",
    ];
    for (const term of jargon) {
      expect(body).not.toContain(term);
    }
  });
}

test("public UX — header has no Admin link", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const adminLink = page.locator('nav[aria-label="Primary"] a', { hasText: "Admin" });
  await expect(adminLink).toHaveCount(0);
});

test("public UX — home hero shows user-facing copy", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("h1")).toContainText("Track AI without the noise");
  await expect(page.locator(".hero-grid .muted")).toContainText("Briefs, source links, and tool discovery in one place");
});

test("public UX — footer shows user tagline", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("footer .eyebrow")).toContainText("Daily AI news briefs");
});

test("public UX — brief detail eyebrow is not raw status", async ({ page }) => {
  // Navigate to first brief if available
  await page.goto("/brief");
  await page.waitForLoadState("networkidle");
  const firstLink = page.locator('a[href^="/brief/"]').first();
  if (await firstLink.count() > 0) {
    await firstLink.click();
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: "test-results/screenshot-brief-detail.png", fullPage: true });
    const eyebrow = await page.locator(".eyebrow").first().textContent();
    expect(eyebrow).not.toBe("draft");
    expect(eyebrow).not.toBe("review");
  }
});
