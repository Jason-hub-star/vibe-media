---
name: ui-audit
description: Playwright로 admin/public 페이지의 overflow, 가독성, 반응성, 토큰 준수를 한번에 검증한다. 프론트엔드 CSS/컴포넌트 변경 후 사용.
argument-hint: "[admin|public|all] [--mobile] [--page=/admin/briefs]"
user_invocable: true
---

# UI Audit

Playwright 기반 프론트엔드 품질 검증. overflow, 가독성, 반응성을 한번에 점검한다.

## Arguments
- `admin` (기본값): admin 페이지만
- `public`: public 페이지만
- `all`: 전체
- `--mobile`: 390px viewport 추가 검증
- `--page=/path`: 특정 페이지만 검증

## Steps

### 1. 대상 페이지 결정

인자에 따라 페이지 목록을 구성한다.

**admin 페이지:**
`/admin`, `/admin/collection`, `/admin/briefs`, `/admin/pending`, `/admin/discover`, `/admin/sources`, `/admin/rules`, `/admin/publish`, `/admin/video-jobs`, `/admin/assets`, `/admin/showcase`

**public 페이지:**
`/`, `/brief`, `/radar`, `/sources`, `/newsletter`

`--page=` 인자가 있으면 해당 페이지만 대상으로 한다.

### 2. Playwright 스크립트 생성 및 실행

`/tmp/ui-audit.mjs`에 검증 스크립트를 생성하고 `node`로 실행한다.
Playwright import 경로: `node_modules/playwright/index.mjs` (프로젝트 루트 기준)

viewport:
- desktop: `{ width: 1440, height: 900 }`
- mobile (`--mobile`): `{ width: 390, height: 844 }` 추가

admin 페이지는 로그인 필요:
```js
const loginInput = page.locator('input[aria-label="Operator key"]');
if (await loginInput.isVisible({ timeout: 3000 }).catch(() => false)) {
  await loginInput.fill("operator");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
}
```

### 3. 검증 항목

각 페이지에서 다음을 검증한다:

#### A. Overflow 검사
모든 `.admin-card`, `.panel`, `.summary-card` 요소에 대해:
- 자식 요소가 부모 bounds를 초과하는지 검사 (1px 허용)
- 초과하면 요소 이름, 방향, 초과 px 보고

#### B. 가독성 검사 (admin-card가 있는 페이지)
- `.admin-card-title`: fontSize ≥ 14px, fontWeight ≥ 700
- `.admin-card-subtitle`: fontSize ≥ 13px
- `.admin-card-meta-item dt`: fontSize ≥ 11px
- `.admin-card-meta-item dd`: fontWeight ≥ 600
- `.admin-card-meta`: display === "grid" (가로 정렬)
- `.summary-count` (대시보드): fontSize ≥ 18px, fontWeight ≥ 700

#### C. 반응성 검사 (`--mobile` 활성 시)
- 가로 스크롤바 발생 여부: `document.documentElement.scrollWidth > window.innerWidth`
- 터치 타겟 44px 준수: 클릭 가능 요소(`a`, `button`)의 최소 높이/폭 ≥ 44px
- 카드 그리드가 1열로 전환되었는지

#### D. 스크린샷 캡처
각 페이지를 `/tmp/ui-audit-{pagename}.png`로 저장한다.
Read 도구로 열어 시각 확인한다.

### 4. CSS 토큰 준수
변경된 CSS 파일이 있으면 token-lint도 실행:
```bash
bash tools/token-lint.sh
```

### 5. 결과 보고

```
## UI Audit Report

**대상**: admin 11페이지, desktop viewport
**Overflow**: ✅ 0건 (카드 35개, 패널 12개 검사)
**가독성**: ✅ 전체 통과
**토큰 준수**: ✅ 0 violations

| 페이지 | 카드 수 | Overflow | 가독성 | 스크린샷 |
|--------|---------|----------|--------|----------|
| /admin | 8 | ✅ | ✅ | /tmp/ui-audit-admin.png |
| /admin/collection | 10 | ✅ | ✅ | /tmp/ui-audit-collection.png |
| ... | | | | |

### 발견 사항
(문제가 있으면 여기에 구체적으로 기술)
```

## 규칙
- 검사는 localhost:3000 기준. dev 서버가 꺼져 있으면 먼저 알린다
- 스크린샷은 `/tmp/`에 저장하며 영구 보존하지 않는다
- overflow 1px 이하는 서브픽셀 렌더링으로 무시한다
- 발견된 문제는 파일 경로와 CSS 클래스를 함께 보고한다
