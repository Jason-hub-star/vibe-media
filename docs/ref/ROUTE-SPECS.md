# Route Specs

## Public Route Tree
- 공개 라우트는 `apps/web/app/[locale]/(public)/` 기준으로만 유지한다.
- 레거시 `apps/web/app/(public)/` route group은 제거 완료다.
- 현재 localized public tree는 총 18개 파일이다.
  - `17`개 `tsx`
  - `1`개 `CLAUDE.md`
- 포함 범위: home, brief list/detail + OG/Twitter 이미지, radar list/detail + OG/Twitter 이미지, sources submit hub, newsletter, about, privacy, terms, route-group loading/error

## Locale Routing
- `middleware.ts`가 locale prefix 없는 접근을 `Accept-Language` 기반으로 `/en/...` 또는 `/es/...`로 301 리다이렉트
- admin, api, _next, 정적 파일은 미들웨어에서 제외
- 지원 locale: `en` (canonical), `es` (first target) — `packages/content-contracts/src/locales.ts` SSOT
- 모든 공개 페이지에 `generateMetadata` + `buildAlternates` (hreflang) + `getOgLocale` 적용
- `sitemap.ts`가 모든 정적/동적 페이지를 locale × 2로 생성 (hreflang alternates 포함)
- `/[locale]/brief/[slug]`에서 variant 조회 → 있으면 번역 콘텐츠, 없으면 영어 + TranslationPendingBanner

## Public
### `/`
- 목적: 브랜드 허브, 최근 브리프 진입점, 자산 전략 소개
- 핵심 섹션: hero, selected briefs, showcase lane teaser, custom assets, discovery surface
- 상태 강화 예정: brief empty state

### `/brief`
- 목적: 브리프 아카이브
- 핵심 섹션: brief card grid
- URL 필터: `?topic=X&q=Y` (새로고침 시 필터 유지, debounce 300ms)
- 상태 강화 예정: list loading/empty/error

### `/radar`
- 목적: 오픈소스, 스킬, 플러그인, 디자인 레퍼런스, 사이트, 이벤트, 공모전 discovery 허브
- 핵심 섹션: hero, discovery index (하이라이트 항목 포함 전체 통합 필터 목록, featured picks 섹션 없음)
- URL 필터: `?category=X&q=Y` (레거시 `?group=X`도 초기 진입 시 허용, debounce 300ms)
- 현재 상태: scaffold cards + fast action links + 상세 페이지 링크
- 공개 규칙: showcase는 radar에서 소비하지 않는다. showcase 노출은 home + submit hub에서만 유지한다.

### `/radar/[id]`
- 목적: 디스커버리 항목 상세 (SEO 크롤링 + 공유 가능 URL)
- 핵심 섹션: 카테고리 pill, 상태 뱃지, summary, fullDescription, 태그, 액션 버튼, 관련 브리프
- 메타데이터: title, description, OG article, Twitter card, canonical, JSON-LD Thing + BreadcrumbList
- 동적 이미지: opengraph-image.tsx + twitter-image.tsx (카테고리 색상 기반 액센트)
- 현재 상태: 구현 완료, notFound() 폴백

### `/brief/[slug]`
- 목적: 브리프 상세와 출처 확인
- 핵심 섹션: summary/body, sources, 관련 브리프 (같은 topic)
- 현재 상태: Supabase-first detail read 구현, not found 분기 포함, 하단 RelatedBriefs 섹션 추가

### `/sources`
- 목적: 비로그인 `Submit Tool` 허브
- 핵심 섹션: Showcase Picks, Submit Your Tool, Latest Submissions, Imported Candidates
- 공개 규칙: Latest Submissions에는 자동 심사 통과분만 노출
- 공개 규칙: Imported Candidates는 외부 소스 attribution을 유지하며 direct submission과 분리 노출
- 현재 상태: locale public route로 통합 완료, non-login submission intake + imported sidecar lane + showcase 승격 분리 운영

### `/newsletter`
- 목적: 구독 CTA
- 핵심 섹션: form, hero placeholder, social proof CTA
- 현재 상태: client-side success/error copy 구현
- 메타데이터: title "Newsletter", description "Get weekly AI brief digests..."

### `/about`
- 목적: 서비스 소개 + 연락처 + 뉴스레터 CTA
- 핵심 섹션: 미션, What we do, Brief/Radar 설명, 연락처 (contact@vibehub.tech), NewsletterForm 재사용
- 메타데이터: title "About", canonical /about
- 원칙: 내부 기술(파이프라인/AI/스코어) 노출 없음 — 사용자 가치만 표현

### `/privacy`
- 목적: 개인정보처리방침 (뉴스레터 이메일 수집 법적 필수)
- 핵심 섹션: 6개 조항 (수집정보, 사용목적, 공유, 쿠키, 보존, 연락처)

### `/terms`
- 목적: 이용약관
- 핵심 섹션: 7개 조항 (동의, 서비스 설명, 지적재산권, 사용자 행위, 면책, 변경, 연락처)

### `/feed.xml`
- 목적: RSS 2.0 피드 (brief 전체)
- 구현: Route Handler, 1시간 캐시

## SEO Infrastructure
- `robots.ts`: Next.js Metadata API, sitemap 경로 포함
- `sitemap.ts`: 정적 8개 + 동적 brief slug + 동적 discover item 페이지, `lastModified` 포함
- JSON-LD: Organization (root), NewsArticle + BreadcrumbList (brief detail), Thing + BreadcrumbList (radar detail)
- OG/Twitter 이미지: `colorTokens`/`brandTokens`/`categoryAccentHex` (design-tokens) 기반 — raw hex 하드코딩 금지
- hreflang: `buildAlternates()`로 en, es, x-default 3개 alternate 생성
- `<html lang>`: `SetHtmlLang` 클라이언트 컴포넌트가 locale segment 기반 동적 설정
- `viewport` export: root layout에서 `Viewport` 타입으로 분리 (width, initialScale, themeColor)
- RSS feed: `/feed.xml` — brief 링크에 `/en/` locale prefix 포함
- GA4: `NEXT_PUBLIC_GA_ID` 환경변수 기반, 미설정 시 비렌더링
- SEO 자동화: `weekly-seo-audit.md` 주간 점검 프롬프트

## Shared Utilities
- `useFilterUrlSync` (`features/shared/view/`): URL ↔ 필터 상태 동기화 훅 (basePath, filterParam, queryParam). Brief/Radar 공용
- `brandTokens` (`design-tokens`): name, domain, briefTagline, radarTagline — OG 이미지 브랜드 SSOT
- `categoryAccentHex` (`design-tokens`): CategoryColorToken → hex 자동 매핑 — OG 이미지 카테고리 색상

## Admin
### `/admin`
- 목적: 운영자 메인 대시보드 (운영 콕핏)
- 핵심 섹션: 최근 완료 항목 → 배포 준비 현황 → 대기열 현황 → 자동화 이력 → Pipeline Monitor
- 사이드바 그룹: 파이프라인(소스→파이프라인→수집 현황) / 에디토리얼(브리프→디스커버리→검토 대기→발행) / 레지스트리(툴 제출·가져온 툴 후보·쇼케이스·비디오 작업·에셋) / 참조(운영 규칙) — 총 13개, 파이프라인 흐름순 배치
- 대기열 카드 클릭 시 각 목록 페이지로 이동
- 현재 인증 성격: 로컬 스캐폴드 게이트, production auth 아님

### `/admin/pipeline`
- 목적: Pipeline Monitor 전용 route (레거시)
- 현재 상태: `/admin`으로 redirect

### `/admin/briefs`
- 목적: 브리프 검수
- 핵심 섹션: 카드 그리드 (상태 뱃지, 소스 수, 발행일)
- 현재 상태: 카드 UI + empty state 분기 구현. review mutation은 `/admin/review`에서 처리

### `/admin/briefs/[slug]`
- 목적: 브리프 상세 보기
- 핵심 섹션: 본문, 출처 링크, 발행 위치 안내
- 현재 상태: AdminDetailLayout + BriefDetailContent 구현

### `/admin/discover`
- 목적: 디스커버리 레지스트리 운영
- 핵심 섹션: 카드 그리드 (카테고리, 상태, 태그)
- 현재 상태: 카드 UI + outbound actions

### `/admin/discover/[id]`
- 목적: 디스커버리 항목 상세
- 핵심 섹션: 설명, 액션 링크, 관련 브리프
- 현재 상태: AdminDetailLayout + DiscoverDetailContent 구현

### `/admin/showcase`
- 목적: 수동 큐레이션 showcase lane 운영
- 핵심 섹션: 신규 전시 등록, discovery reference 연결, featured home/submit hub 제어, 게시 상태 관리
- 현재 상태: sidecar lane editor form + existing entry editor cards

### `/admin/submissions`
- 목적: 비로그인 tool submission intake 운영
- 핵심 섹션: 제출 목록, screening 상태, showcase 승격/거절
- 현재 상태: card grid + detail workflow

### `/admin/imported-tools`
- 목적: 외부 자동수집 tool candidate 운영
- 핵심 섹션: imported 목록, source attribution, showcase 승격/숨김/거절
- 현재 상태: card grid + detail workflow

### `/admin/translations`
- 목적: 다국어 번역 현황 모니터링 + 재시도/강제 승인
- 핵심 섹션: 통계 카드 (전체/번역 완료/대기/품질 실패/발행), 상태 테이블
- 현재 상태: brief_posts LEFT JOIN brief_post_variants 조회 + 상세 페이지 (영/스 비교)

### `/admin/translations/[slug]`
- 목적: 개별 brief 번역 상세 (영어 원문 vs 스페인어 variant 병렬 비교)
- 핵심 섹션: 원문 메타, variant 메타, 공개 페이지 링크, CLI 재번역 안내

### `/admin/collection`
- 목적: 수신함 + 실행 이력 통합 ("수집 현황")
- 핵심 섹션: 탭 전환 (수신함 / 실행 이력), 각 탭은 기존 InboxCardGrid / RunCardGrid 재사용
- 현재 상태: AdminTabSwitcher 기반 ?tab= URL 파라미터 전환 구현

### `/admin/inbox`  *(legacy — redirect)*
- 현재 상태: `/admin/collection`으로 redirect

### `/admin/inbox/[id]`
- 목적: 수신 항목 상세
- 핵심 섹션: 수집 정보, 파싱 요약, 분류 로그
- 현재 상태: AdminDetailLayout + InboxDetailContent 구현

### `/admin/runs`  *(legacy — redirect)*
- 현재 상태: `/admin/collection?tab=runs`로 redirect

### `/admin/runs/[id]`
- 목적: 실행 상세
- 핵심 섹션: 단계별 로그, 항목 분류 결과
- 현재 상태: AdminDetailLayout + RunDetailContent 구현

### `/admin/publish`
- 목적: 승인 후 배포 대기와 예약 상태 확인
- 핵심 섹션: 카드 그리드 (대상 타입, 큐 상태, 예약일, 다음 액션)
- 현재 상태: 카드 UI + schedule/publish Server Action 버튼 구현
- 전제: mutation은 `SUPABASE_DB_URL` 환경변수 필요

### `/admin/publish/[id]`
- 목적: 발행 항목 상세
- 핵심 섹션: 발행 URL, 배포 대상, 다음 액션
- 현재 상태: AdminDetailLayout + PublishDetailContent 구현

### `/admin/pending`
- 목적: 검수 + 예외 처리 통합 ("검토 대기")
- 핵심 섹션: 탭 전환 (검수 / 예외), 검수 탭에는 approve/changes_requested/reject 액션 포함
- 현재 상태: PendingTabs 기반 ?tab= URL 파라미터 전환 구현

### `/admin/review`  *(legacy — redirect)*
- 현재 상태: `/admin/pending`으로 redirect

### `/admin/review/[id]`
- 목적: 검수 항목 상세
- 핵심 섹션: 출처, 파싱 결과, 미리보기, 수정 사유 (ModificationReason)
- 현재 상태: AdminDetailLayout + ReviewDetailContent 구현

### `/admin/exceptions`  *(legacy — redirect)*
- 현재 상태: `/admin/pending?tab=exceptions`로 redirect

### `/admin/exceptions/[id]`
- 목적: 예외 항목 상세
- 핵심 섹션: 수정 사유 (ModificationReason), 정책 위반 사항
- 현재 상태: AdminDetailLayout + ExceptionDetailContent 구현

### `/admin/rules`
- 목적: 정책 + 프로그램 통합 ("운영 규칙")
- 핵심 섹션: "정책" 섹션 (PolicySummaryGrid) + "프로그램" 섹션 (ProgramReferenceGrid)
- 현재 상태: 읽기 전용 2-섹션 레이아웃 구현

### `/admin/policies`  *(legacy — redirect)*
- 현재 상태: `/admin/rules`로 redirect

### `/admin/programs`  *(legacy — redirect)*
- 현재 상태: `/admin/rules`로 redirect

### `/admin/video-jobs`
- 목적: 비디오 자동화 상태 확인
- 핵심 섹션: 카드 그리드 (상태, 종류, 하이라이트, 다음 액션)
- 현재 상태: 카드 UI + placeholder banner

### `/admin/video-jobs/[id]`
- 목적: 비디오 작업 상세
- 핵심 섹션: 처리 로그, 에셋/자막 상태, 위험 세그먼트
- 현재 상태: AdminDetailLayout + VideoJobDetailContent 구현

### `/admin/sources`
- 목적: source registry 확인
- 핵심 섹션: 카드 그리드 (카테고리, 주기, 방문 링크)
- 현재 상태: 카드 UI + Supabase-first read

### `/admin/sources/[id]`
- 목적: 소스 상세
- 핵심 섹션: 실행 이력, 신뢰도, URL
- 현재 상태: AdminDetailLayout + SourceDetailContent 구현

### `/admin/assets`
- 목적: asset slot 확인
- 핵심 섹션: 카드 그리드 (타입, 사양)
- 현재 상태: 카드 UI + empty state 분기 구현

### `/admin/assets/[id]`
- 목적: 에셋 슬롯 상세
- 핵심 섹션: 사양, 사용처
- 현재 상태: AdminDetailLayout + AssetDetailContent 구현

### `/admin/showcase/[id]`
- 목적: 쇼케이스 항목 상세
- 핵심 섹션: 요약, 본문, 태그, 발행 상태
- 현재 상태: AdminDetailLayout + ShowcaseDetailContent 구현

### `/admin/submissions/[id]`
- 목적: tool submission 상세
- 핵심 섹션: 원본 입력, screening notes, submitter 정보, 승격/거절 액션
- 현재 상태: AdminDetailLayout + ToolSubmissionDetailContent 구현

### `/admin/imported-tools/[id]`
- 목적: imported tool candidate 상세
- 핵심 섹션: source attribution, screening notes, 승격/숨김/거절 액션
- 현재 상태: AdminDetailLayout + ToolCandidateImportDetailContent 구현

## API Routes

### `POST /api/pipeline/fetch`
- 목적: Source Fetch 단계 실행
- 동작: `npm run pipeline:live-fetch` 실행, stdout에서 아이템 수 파싱
- 반환: `{ ok, itemCount, durationMs, sources[] }`

### `POST /api/pipeline/ingest`
- 목적: Ingest 단계 실행
- 동작: `npm run pipeline:live-ingest` 실행
- 반환: `{ ok, itemCount, durationMs }`

### `POST /api/pipeline/sync`
- 목적: Supabase Sync 단계 실행
- 동작: `npm run pipeline:supabase-sync` 실행
- 반환: `{ ok, itemCount, durationMs }`

### `POST /api/tools/og-preview`
- 목적: 임의 URL에서 OG 메타데이터를 가져와 Submit Tool 폼 자동 완성에 활용
- 요청 바디: `{ url: string }`
- 반환: `{ ogTitle: string | null, ogDescription: string | null, ogImage: string | null }`
- 동작: HTML 스트리밍 최대 32KB 읽기, 6초 타임아웃, SSRF 방지 (private IP 차단)
