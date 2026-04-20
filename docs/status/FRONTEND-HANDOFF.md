# Frontend Handoff — 2026-03-27

> 새 세션에서 프론트엔드 작업을 이어받기 위한 핸드오프 문서.
> 이 문서 하나만 읽고 시작하면 된다.

---

## 1. 프로젝트 정체성

- **VibeHub Media**: AI Brief 에디토리얼 허브 (공개) + 내부 운영 콕핏 (admin)
- **파이프라인**: collect → process → draft → review → publish
- **공개 IA**: `/:locale` (home), `/:locale/brief`, `/:locale/brief/[slug]`, `/:locale/radar`, `/:locale/radar/[id]`, `/:locale/sources`, `/:locale/newsletter`, `/:locale/about`, `/:locale/privacy`, `/:locale/terms`
- **Admin IA**: `/admin` + 운영 route들 (collection, pending, briefs, discover, publish, showcase, submissions, sources, assets, video-jobs 등)
- **video는 공개 콘텐츠가 아님** → `/admin/video-jobs` 내부 운영 기능
- **admin 진입은 로컬 스캐폴드** → production auth처럼 확장 금지

---

## 2. 기술 스택

| 항목 | 선택 |
|------|------|
| Framework | Next.js (App Router) |
| CSS | Custom Properties + vanilla CSS (Tailwind 없음) |
| Fonts | Space Grotesk (display), Noto Sans KR (body) |
| DB | Supabase |
| Monorepo | npm workspaces |
| Contracts | `packages/content-contracts` |
| Design Tokens | `packages/design-tokens/src/index.ts` |
| E2E | Playwright |

### CSS 토큰 (`:root` via layout.tsx)
```
/* 색상 */
--color-ink: #151110          --color-ink-soft: #241d1a
--color-cream: #f2ecdf        --color-cream-muted: #ddd2bf
--color-orange: #d9863a       --color-mint: #8fcfbe
--color-yellow: #d7bc62       --color-rose: #c97a8d
--color-sky: #92abd8          --color-purple: #a88fd0
--color-border: #1e1a18

/* RGB 채널 (alpha 사용: rgba(var(--color-X-rgb), 0.12)) */
--color-ink-rgb: 21, 17, 16         --color-ink-soft-rgb: 36, 29, 26
--color-cream-rgb: 242, 236, 223    --color-orange-rgb: 217, 134, 58
--color-mint-rgb: 143, 207, 190     --color-yellow-rgb: 215, 188, 98
--color-rose-rgb: 201, 122, 141     --color-sky-rgb: 146, 171, 216
--color-purple-rgb: 168, 143, 208

/* 스페이싱·라디우스 */
--space-section: clamp(3rem, 6vw, 6rem)
--space-gutter: clamp(1rem, 2vw, 1.5rem)
--radius-panel: 20px    --radius-md: 12px    --radius-sm: 8px

/* 타입 스케일 */
--type-h1: clamp(1.6rem, 3.2vw, 2.4rem)
--type-h2: clamp(1.1rem, 2vw, 1.5rem)
--type-h3: clamp(0.9rem, 1.4vw, 1.1rem)
--type-body: 1rem       --type-small: 0.85rem
--type-caption: 0.76rem --type-label: 0.65rem

/* 폰트 */
--font-display: SpaceGrotesk   --font-body: NotoSansKR
```

### 2026-03-27 팔레트 보정 메모
- 브랜드 축은 유지: `ink + cream + orange`
- 보조색은 저채도 보정: `mint / sky / yellow / rose / purple`
- status badge와 category pill은 더 옅은 alpha + 얇은 border 조합으로 조정
- `public/brand/*`, `public/placeholders/*`, `public/sprites/*`, media-engine Remotion/thumbnail 기본색도 같은 팔레트로 동기화

### 디자인 SSOT 레이어
```
Layer 1: content-contracts/discover.ts → DISCOVER_CATEGORIES (id, label, group)
Layer 2: design-tokens/index.ts → discoverCategoryVisuals (color, icon), discoverGroupLabels
Layer 3: presenters (자동 파생) → present-discover-category.ts, discovery.css
```
- 카테고리 추가 = Layer 1에 1줄 + Layer 2에 1줄 → 타입/라벨/색상/아이콘 자동 반영
- `/design-sync check`로 3레이어 정합성 검증 가능

### 카테고리 색상 팔레트 (그룹별)
| 그룹 | 색상 | 적용 카테고리 |
|------|------|-------------|
| core | mint | open_source, skill, plugin, os, website, event, contest, news |
| builder | sky | model, api, sdk, agent, template, integration |
| knowledge | purple | research, dataset, benchmark, tutorial, newsletter, repo_list |
| opportunity | yellow | job, grant, community |
| asset | orange | asset |

### 반응형 브레이크포인트
| 기준 | 공개 그리드 | Admin 그리드 |
|------|-----------|------------|
| >900px | 3~4열 원본 | 원본 |
| ≤900px | 2열 (panel-grid, brief-grid, summary-grid, showcase-grid) | 1열 |
| ≤768px | 1열, brief lead span 해제, footer 1열 | (900px과 동일) |

### 카드 인터랙션
- `.panel` base: `box-shadow: 0 8px 24px rgba(0,0,0,0.16)` + `transition: … transform 180ms ease`
- `.panel:hover`: `translateY(-2px)` + `box-shadow: 0 12px 32px rgba(0,0,0,0.22)`
- `.brief-lead`: 홈페이지 첫 brief 카드에 적용 (orange left border + 큰 제목 + 2열 span)

### CSS 토큰 사용 규칙
- 색상 alpha가 필요하면 반드시 `rgba(var(--color-X-rgb), alpha)` 사용 — raw rgba 금지
- 하드코딩 hex/rgba 대신 CSS 변수 참조
- radius는 `--radius-panel` / `--radius-md` / `--radius-sm` 중 선택
- font-size는 `--type-*` 토큰 중 가장 가까운 값 사용
- 카테고리 pill 색상은 `.category-pill-{color}` 클래스 사용 — `discovery.css`에 정의

---

## 3. 검증 명령

```bash
# 기본 검증 (lint + typecheck)
npm run test

# 상세
npm run lint                    # eslint
npm run typecheck               # next typegen && tsc --noEmit
npm run build                   # next build
npm run test:e2e                # playwright (apps/web/tests/e2e)
```

---

## 4. 현재 구현 상태

### 완료 (happy-path 스캐폴드)
- localized public route tree 렌더링 동작
- Admin route tree 렌더링 동작
- Supabase 읽기 경로 연결 (briefs, discover, review, publish, exceptions)
- 데이터 흐름: `features/{domain}/api/*.ts` → `features/{domain}/use-case/*.ts` → page

### 미구현 (이번 작업 대상)
- **Loading/Empty/Error 상태**: EmptyState만 일부 존재, loading.tsx/error.tsx 없음
- **globals.css 438줄**: 분리 필요 (status/components/admin/responsive)
- **타이포·간격·위계 품질**: 현재 최소 스캐폴드 수준
- **Admin 사이드바**: 기능적이나 시각 개선 필요
- **mutation endpoints**: review approve/sendback, publish schedule/action (백엔드 먼저)

### 발견된 버그
- `admin/page.tsx` 59줄: `listVideoJobs()` await 누락 (Promise.all에 포함 안 됨)

---

## 5. 파일 구조 요약

```
apps/web/
├── app/
│   ├── layout.tsx                # 33줄, 폰트·메타·CSS변수
│   ├── globals.css               # 438줄 ⚠️ 분리 대상
│   ├── discovery.css             # 확장됨: category-pill, status-new, status-group 추가
│   ├── status.css                # 신규 생성 (globals에서 미제거 상태)
│   ├── [locale]/(public)/        # 공개 IA SSOT
│   │   ├── 총 22개 파일          # 21 tsx + 1 CLAUDE.md
│   │   ├── page.tsx              # localized home
│   │   ├── brief/page.tsx        # brief list
│   │   ├── brief/[slug]/page.tsx # brief detail
│   │   ├── radar/page.tsx        # discovery list
│   │   ├── radar/[id]/page.tsx   # discovery detail
│   │   ├── sources/page.tsx      # Submit Tool hub
│   │   ├── newsletter/page.tsx   # newsletter
│   │   ├── about/editorial-policy/team/contact/privacy/terms
│   │   ├── loading.tsx/error.tsx # route-group state
│   │   └── CLAUDE.md
│   └── admin/                    # 운영 IA
│       ├── page.tsx              # 107줄 (videoJobs 버그)
│       ├── briefs/    discover/  review/  publish/
│       ├── exceptions/  inbox/   runs/    sources/
│       ├── video-jobs/  assets/  policies/  programs/
│       └── CLAUDE.md
├── features/                     # 도메인별 api/ + use-case/ (각각 CLAUDE.md 보유)
│   ├── brief/  sources/  newsletter/  admin-briefs/
│   ├── discover/  inbox/  runs/  review/
│   ├── publish/  exceptions/  video-jobs/  assets/
│   ├── policies/  programs/
│   └── CLAUDE.md
├── components/                   # 공용 컴포넌트 7개
│   ├── AdminShell.tsx            # admin 레이아웃 래퍼
│   ├── EmptyState.tsx            # 빈 상태 (현재 유일한 상태 컴포넌트)
│   ├── PageFrame.tsx             # 공개 페이지 프레임
│   ├── PlaceholderArt.tsx        # 에셋 슬롯 플레이스홀더
│   ├── SectionBlock.tsx          # 섹션 컨테이너
│   ├── SiteFooter.tsx            # 공용 푸터
│   └── SiteHeader.tsx            # 공용 헤더
└── tests/e2e/                    # Playwright E2E

public/
├── brand/                        # logo-mark.svg, logo-wordmark.svg, ribbon.svg
├── placeholders/                 # brief-hero, radar-hero, newsletter-hero,
│                                 # admin-video-banner, source-strip (.svg)
└── sprites/                      # beacon-dots.svg, orbit-grid.svg

docs/design/
├── prompts/                      # 8개 (home, brief, sources, newsletter,
│                                 #   admin-overview, admin-briefs, admin-video-jobs, admin-assets)
├── decisions/                    # route별 디자인 결정
└── tokens/                       # route별 토큰 노트
```

---

## 6. 마일스톤 계획

### M1: CSS 분리 (globals.css 438줄 → ~85줄) ✅
- `status.css` — `.status-*` 클래스들
  - ⚠️ **중간 상태**: 파일은 `app/status.css`로 이미 생성됨
  - 하지만 `globals.css`에서 해당 코드(202~318줄)가 아직 제거되지 않음
  - `globals.css`의 `@import`에도 아직 추가되지 않음
  - → M1 시작 시 globals.css를 다시 읽고 중복 제거부터 해야 함
- `components.css` — eyebrow, buttons, panel, source-row, form, placeholder (130~200줄 + 320~365줄)
- `admin.css` — admin-login, admin-layout, admin-sidebar, admin-table (367~417줄)
- `responsive.css` — @media 블록 (419~437줄)
- `globals.css` — reset + layout + imports만 남김 (~85줄 목표)
- **검증**: `npm run build` 후 시각적 회귀 없음

### M2: 3-State 컴포넌트 ✅
- `components/LoadingState.tsx` — 스켈레톤/스피너
- `components/ErrorState.tsx` — 에러 메시지 + 재시도
- `components/EmptyState.tsx` — 기존 EmptyState 통합/개선
- daykervibe 패턴 참고 (sectioned shell, source-limited 처리)

### M3: 전 라우트 에러 핸들링 ✅
- localized public route group + admin route에 loading.tsx + error.tsx 추가
- `admin/page.tsx` videoJobs 버그 수정

### M4: 타이포·간격·위계 품질 ✅
- 폰트 사이즈 스케일 정리
- spacing 토큰 통일
- 카드·패널 계층감 강화
- impeccable 수준 디테일

### M7: 디자인 토큰 통일 ✅
- `colorRgbTokens` 추가 → CSS에서 `rgba(var(--color-X-rgb), alpha)` 패턴 사용 가능
- `purple` 색상 토큰 추가 (비디오/raw_received 상태용)
- `--radius-md` (12px), `--radius-sm` (8px) 추가
- `--type-body` (0.92rem), `--type-label` (0.65rem) 추가
- CSS 6개 파일에서 raw rgba/hex 141건 → `var()` 참조로 전환
- `button-danger`, `modification-reasons`의 미등록 색상을 `--color-rose`로 통일
- `pipeline.css` Tailwind 팔레트 12종 → 프로젝트 토큰으로 전환

### M8: 모바일 반응성 강화 ✅
- `responsive.css` 37줄→132줄: 누락된 grid collapse, flex-wrap, overflow 규칙 추가
- `admin-detail-meta` 2컬럼 그리드 모바일 collapse 추가
- `admin-table-wrap` 수평 스크롤 래퍼 → TSX 7개 파일에 적용
- `pipeline-detail-panel` width: 100% 모바일 오버라이드
- SiteHeader 모바일 햄버거 메뉴 (클라이언트 컴포넌트 전환)
- 터치 타겟 44px 최소 보장 (nav-links, sidebar-link/toggle, button-danger/ghost)
- iOS Safari 자동 줌 방지 (`font-size: max(1rem, ...)` on inputs)
- Footer `row-between` flex-wrap 추가

### M5: Admin 사이드바 개선 ✅
- 현재 활성 route 하이라이트
- 카운트 배지 표시
- 모바일 반응형

### M9: Brief Page UI + CSS Token Lint (2026-03-24) ✅
- `brief.css` 분리: `components.css`에서 `.brief-grid`, `.brief-placeholder`, `.brief-cta-banner`를 이동
- 새 클래스: `.brief-lead`, `.source-chip`, `.brief-preview`, `.brief-insight`, `.skeleton-line`, `.skeleton-block`, `.brief-nav`, `.filter-pill-row`, `.filter-pill`, `.filter-pill--active`
- `status.css`에 `.freshness-today/recent/week/older` 배지 추가
- 새 shared presenter: `present-relative-date.ts`, `present-freshness.ts`, `present-read-time.ts`
- 새 컴포넌트: `BriefSkeletonCard.tsx`, `BriefNav.tsx`
- `tools/token-lint.sh` standalone CSS lint script
- self-review에 CSS 토큰 준수 점검 단계 통합

### M10: Brief Detail Redesign + Quality Checklist + Review Body (2026-03-24) ✅
- 새 presenter: `parse-brief-sections.ts` (convention-based `## ` section parsing), `extract-source-domains.ts`
- 새 컴포넌트: `BriefMetaBar.tsx`, `BriefBodySections.tsx`, `BriefInsight.tsx`, `BriefSourcePanel.tsx`
- 새 admin presenter: `evaluate-brief-quality.ts` (6-criteria advisory checklist)
- 새 admin 컴포넌트: `BriefQualityChecklist.tsx`
- 새 CSS 클래스: `.brief-meta-bar`, `.brief-meta-chip`, `.brief-detail-article`, `.brief-section`, `.brief-section-heading`, `.brief-source-panel`, `.brief-source-list`, `.brief-source-link`
- 새 admin CSS 클래스: `.quality-checklist`, `.quality-row`, `.quality-icon`, `.quality-criterion`, `.quality-message`, `.quality-pass`, `.quality-warn`, `.quality-fail`
- review contract: `ReviewItemDetail.previewBody?: string[]` 추가
- review backend: `previewTitle` → `brief_posts` title lookup으로 body enrichment

### M11: 카드 가독성 + 진입 UX 개선 (2026-03-27) ✅
> 코드리뷰 스캔 결과 — Brief/Discover 카드 텍스트 오버플로우, 정보 위계, 클릭 영역 개선

**Phase A: Brief 카드 텍스트 절단 + 위계 정리** ✅
- [x] `brief.css`: `.brief-card-title` 클래스 추가 — `max-width: 32ch`, `line-clamp: 2`, `line-height: 1.28`
- [x] `brief.css`: `.brief-card-summary` 클래스 추가 — `line-clamp: 2`, `line-height: 1.45`, `color: cream 0.68`
- [x] `BriefCard.tsx`: h3에 `.brief-card-title`, p에 `.brief-card-summary` 적용
- [x] `BriefCard.tsx`: 정보 2-tier 구조 — 1차(배지+제목), 2차(요약+메타), 호버 프리뷰 제거

**Phase B: Brief 카드 전체 클릭 영역화** ✅
- [x] `BriefCard.tsx`: `<article>` 내부 `<Link>` stretch overlay 패턴 적용
  - 방식: CSS `position: relative` (article) + `<Link>::after { position: absolute; inset: 0 }` (전체 덮개)
  - source-chip, tag-row는 `position: relative; z-index: 1`로 클릭 유지
  - "Read brief" 텍스트 링크 → 제목 자체가 링크 역할 (중복 링크 제거)
- [x] 키보드 접근성: 카드 focus 시 `outline` + `:focus-visible` 스타일 (orange 아웃라인)
- [x] hover 상태: 카드 전체 `border-color` 변화 (기존 `.panel:hover` 활용)

**Phase C: Discover 카드 미세 조정** ✅
- [x] `discovery.css`: `.discover-card-title` max-width `26ch → 32ch` 확장
- [x] `discovery.css`: `.discover-card-summary` `line-height: 1.45` 명시
- [x] 모바일에서도 일관성 확인 (기존 `max-width: none` 미디어쿼리 유지)

**Phase D: Newsletter 폼 UX** — 보류 (페이지 교체 검토 중)

**검증**: `npm run lint && npm run typecheck && npm run build && npm run test:e2e`

### M6: 문서 동기화 + 최종 검증 ✅
- `docs/status/PROJECT-STATUS.md` 업데이트
- `docs/status/PAGE-UPGRADE-BOARD.md` 생성/업데이트
- 전체 `npm run test && npm run build && npm run test:e2e`
- 변경 요약 작성

### M7: SEO & 상업화 기반 (2026-03-26) ✅
- favicon.svg, robots.ts, sitemap.ts, RSS feed (`/feed.xml` route handler)
- per-page metadata (6개 공개 페이지 + brief detail `generateMetadata`)
- JSON-LD 3종 (Organization, NewsArticle, BreadcrumbList)
- Footer 5-section 확장 (footer-grid, footer-heading, footer-links, footer-brand, footer-bottom)
- share-bar CSS (share-bar, share-label, share-btn)
- newsletter-proof CSS
- GA4 Analytics 컴포넌트, Privacy/Terms 페이지
- `SITE_URL` 중앙화 (`lib/constants.ts`), CSS 토큰 `var()` 준수

---

## 7. 참고 프로젝트 (패턴만 가져올 것)

### daykervibe (해커톤 앱)
- **가져올 것**: sectioned content shell, summary bar 패턴, loading/empty/error 상태 UI, 상태 배지·카드 계층감, 폰트/토큰 운영 분위기
- **가져오지 말 것**: camp/rankings/war-room 도메인, 해커톤/팀모집 비즈니스 로직
- **핵심 참고 파일**:
  - UI 상태: `src/components/ui/LoadingState.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `StatusBadge.tsx`
  - 섹션 패턴: `src/components/hackathon/SectionRenderer.tsx`, `SectionTabs.tsx`, `SummaryBar.tsx`
  - 토큰/스타일: `src/app/globals.css`
  - 데이터 해석: `src/lib/hackathon-detail.ts`, `src/lib/types/hackathon.ts`

### TaillogToss
- **가져올 것**: 문서 운영 체계 (status/ref 분리), feature 단위 백엔드 폴더 구조
- **가져오지 말 것**: 구현체 자체
- **핵심 참고 파일**:
  - 문서 체계: `docs/status/PAGE-UPGRADE-BOARD.md`, `docs/status/PROJECT-STATUS.md`
  - 운영 모델: `docs/ref/10-MIGRATION-OPERATING-MODEL.md`, `docs/ref/ASSET-GUIDE.md`

---

## 8. 스타일 원칙

- 강한 셸, 상태 명확한 운영형 UI
- 기본 아이콘 위주, 플레이스홀더는 명시적 유지
- 새 이미지 자리 = 교체 가능한 asset slot
- `public/brand/*`, `public/placeholders/*`, `public/sprites/*` 우선 사용
- AI 생성 사이트처럼 보이는 과한 장식 금지
- SaaS 그라데이션으로 흐르지 말 것

---

## 9. CLAUDE.md 로딩 순서

새 세션에서는 다음 순서로 맥락을 로드:
1. `CLAUDE.md` (루트)
2. `docs/ref/PRD.md`
3. `docs/ref/SCHEMA.md`
4. `docs/ref/ARCHITECTURE.md`
5. `docs/ref/ROUTE-SPECS.md`
6. `docs/status/PROJECT-STATUS.md`
7. **이 문서** (`docs/status/FRONTEND-HANDOFF.md`)
8. `apps/web/CLAUDE.md`

---

## 10. Git 설정

- Remote: `https://github.com/kimjuyoung1127/vibe-media.git`
- 새 세션 시작 시 remote 연결 확인: `git remote -v`
- 없으면: `git remote add origin https://github.com/kimjuyoung1127/vibe-media.git`
- 커밋은 마일스톤 단위, push는 사용자 확인 후

---

## 11. Ralph Loop 실행 방법

Ralph Loop는 마일스톤을 자동 순회하며 구현→테스트→수정→커밋하는 스킬이다.
스킬 파일 위치: `~/.claude/skills/ralph-loop/SKILL.md` (이미 설치됨)

### 호출
```
/ralph-loop
```

### 설정값
- **마일스톤 소스**: 이 문서의 §6 (M1~M6)
- **검증 명령**: `npm run lint && npm run typecheck && npm run build`
- **최대 반복수**: 마일스톤당 5회
- **커밋**: 마일스톤 통과 시 자동 (사용자 확인 후 push)

### 순서
```
M1 → M2 → M3 → M4 → M5 → M6
각 마일스톤: EXPLORE → IMPLEMENT → TEST
  ├─ PASS → commit → next
  └─ FAIL → fix → re-test (최대 5회)
```

---

## 12. 실행 시 주의사항

- 추측하지 말고 실제 파일 읽고 비교
- 도구 호출 전 한 줄 목적 먼저 밝힐 것
- 절대경로 금지 (상대경로만)
- 파일 300줄 접근 시 분리 검토, 400줄 전 알림
- basename 규칙 유지 (프론트 파일명 = 백엔드 파일명)
- 공용 패턴은 `components/` 또는 `features/` 공용 레벨로 올릴 것
- 변경 후 반드시 `npm run lint && npm run typecheck`
- 커밋은 마일스톤 단위
- 완료 시 반드시 정리: **변경 요약, 변경 파일 목록, 테스트 결과, 남은 리스크**

---

## 13. 새 세션 시작 프롬프트 (복붙용)

```
vibehub-media 프론트엔드 작업을 이어받아줘.

1. docs/status/FRONTEND-HANDOFF.md 를 읽어줘
2. apps/web/CLAUDE.md 를 읽어줘
3. git remote -v 로 원격 연결 확인하고, 없으면 origin 추가해줘
   https://github.com/kimjuyoung1127/vibe-media.git
4. /ralph-loop 으로 M1부터 M6까지 순회해줘
   - 검증 명령: npm run lint && npm run typecheck && npm run build
   - 마일스톤당 최대 5회 반복
   - 마일스톤 통과 시 커밋, push는 내가 확인 후
```
