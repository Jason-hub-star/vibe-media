import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page) {
  await page.getByRole("textbox", { name: "Operator key" }).fill("operator");
  await page.getByRole("button", { name: /enter admin/i }).click();
  await expect(page.getByText("운영자 워크스페이스")).toBeVisible({ timeout: 15_000 });
}

/** Card grid or empty state — both are valid when data may be absent. */
async function expectCardGridOrEmpty(page: import("@playwright/test").Page) {
  const hasCards = await page.locator(".admin-card-grid").isVisible();
  const hasEmpty = await page.locator(".state-box").isVisible();
  expect(hasCards || hasEmpty).toBe(true);
}

// ── 사이드바 한국어 링크 ──

test("admin sidebar shows Korean navigation links", async ({ page }) => {
  await page.goto("/admin");
  await signIn(page);
  await expect(page.getByRole("link", { name: "수신함" })).toBeVisible();
  await expect(page.getByRole("link", { name: "실행 이력" })).toBeVisible();
  await expect(page.getByRole("link", { name: "검수" })).toBeVisible();
  await expect(page.getByRole("link", { name: "발행" })).toBeVisible();
  await expect(page.getByRole("link", { name: "예외 처리" })).toBeVisible();
  await expect(page.getByRole("link", { name: "정책" })).toBeVisible();
  await expect(page.getByRole("link", { name: "프로그램" })).toBeVisible();
});

// ── 대시보드 콕핏 4섹션 ──

test("admin dashboard shows cockpit sections", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/admin", { timeout: 45_000 });
  await signIn(page);
  await expect(page.getByText("VibeHub 운영실")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("최근 완료 항목")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("배포 준비 현황")).toBeVisible();
  await expect(page.getByText("대기열 현황")).toBeVisible();
  await expect(page.getByText("자동화 이력")).toBeVisible();
});

// ── 카드 UI 목록 페이지 ──

test("admin briefs shows card grid or empty state", async ({ page }) => {
  await page.goto("/admin/briefs");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "브리프 검수" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin inbox shows card grid or empty state", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/admin/inbox", { timeout: 45_000 });
  await signIn(page);
  await expect(page.getByRole("heading", { name: "수신함" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin runs shows card grid or empty state", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/admin/runs", { timeout: 45_000 });
  await signIn(page);
  await expect(page.getByRole("heading", { name: "실행 이력" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin review shows card grid or empty state", async ({ page }) => {
  await page.goto("/admin/review");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "검수 워크벤치" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin publish shows card grid or empty state", async ({ page }) => {
  await page.goto("/admin/publish");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "발행 대기열" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin exceptions shows card grid or empty state", async ({ page }) => {
  await page.goto("/admin/exceptions");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "예외 처리" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin discover shows card grid or empty state", async ({ page }) => {
  await page.goto("/admin/discover");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "디스커버리 레지스트리" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin video jobs shows card grid or empty state", async ({ page }) => {
  await page.goto("/admin/video-jobs");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "비디오 작업" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin sources shows card grid or empty state", async ({ page }) => {
  await page.goto("/admin/sources");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "소스 관리" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin assets shows card grid or empty state", async ({ page }) => {
  await page.goto("/admin/assets");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "에셋 슬롯" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

test("admin showcase shows card grid or empty state", async ({ page }) => {
  await page.goto("/admin/showcase");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "쇼케이스" })).toBeVisible();
  await expectCardGridOrEmpty(page);
});

// ── 정책/프로그램 (카드 그리드 아닌 기존 참조 화면) ──

test("admin policies and programs show Korean headings", async ({ page }) => {
  await page.goto("/admin/policies");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "정책 참조" })).toBeVisible();
  await expect(page.getByText(/REVIEW-POLICY/i)).toBeVisible();

  await page.goto("/admin/programs");
  await expect(page.getByRole("heading", { name: "프로그램 참조" })).toBeVisible();
  await expect(page.getByText(/brief\.program/i)).toBeVisible();
});

// ── 카드 클릭 → 디테일 페이지 진입 ──

test("clicking a brief card navigates to detail page", async ({ page }) => {
  await page.goto("/admin/briefs");
  await signIn(page);
  const firstCard = page.locator(".admin-card").first();
  if (await firstCard.isVisible()) {
    await firstCard.click();
    await expect(page.locator(".admin-breadcrumb")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".admin-detail")).toBeVisible();
    await expect(page.getByText("브리프 목록")).toBeVisible();
  }
});

test("clicking a discover card navigates to detail page", async ({ page }) => {
  await page.goto("/admin/discover");
  await signIn(page);
  const firstCard = page.locator(".admin-card").first();
  if (await firstCard.isVisible()) {
    await firstCard.click();
    await expect(page.locator(".admin-breadcrumb")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".admin-detail")).toBeVisible();
    await expect(page.getByText("디스커버리 목록")).toBeVisible();
  }
});

// ── 대기열 카드 → 목록 페이지 링크 ──

test("dashboard queue cards link to list pages", async ({ page }) => {
  await page.goto("/admin");
  await signIn(page);
  const inboxLink = page.locator("a.panel", { hasText: "수신함" });
  if (await inboxLink.isVisible()) {
    await inboxLink.click();
    await expect(page.getByRole("heading", { name: "수신함" })).toBeVisible({ timeout: 15_000 });
  }
});
