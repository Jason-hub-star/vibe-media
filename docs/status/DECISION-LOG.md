# Decision Log

이 문서는 `source`, `tool`, `orchestration` 관련 보류 결정을 한 곳에 모아두는 운영 로그다.

## Resolved

### 2026-03-25 — Channel Publish Pipeline 설계 (MimikaStudio + 멀티채널 배포)
- 상태: resolved
- 결정:
  - 내부 TTS/영상 가공은 **MimikaStudio** 단일 도구로 통합. Qwen3-TTS 등 별도 self-host는 하지 않음.
  - MimikaStudio는 BSL-1.1이지만 **내부 도구로만 사용**, 산출물(mp4/mp3/text)만 외부 채널에 유통 → 라이선스 위반 없음.
  - 외부 배포 채널: 티스토리, YouTube, Ghost/WordPress 블로그, 팟캐스트 RSS.
  - 티스토리 Open API가 2024-02에 완전 종료됐으므로 **Playwright 브라우저 자동화**로 대체.
  - YouTube는 Data API v3 resumable upload 사용. 일일 쿼터 ~6건 제한 → scheduled 큐로 분산.
  - Remotion 영상 합성은 기존 media-engine의 `render-spawn.ts`를 확장. `getAudioData()` + `calculateMetadata()`로 나레이션 길이에 맞춘 영상 길이 자동 결정.
  - 팟캐스트는 MimikaStudio mp3 → Supabase Storage + `podcast` npm RSS 생성.
  - `publish-dispatcher`가 brief → TTS → 채널별 분배를 오케스트레이션. 채널별 실패는 독립 처리(`Promise.allSettled`).
  - MimikaStudio MCP 서버(:8010)로 Claude Code 에이전트 직접 연동 가능.
- 근거: 자동화 워크플로우로 티스토리/유튜브/블로그를 자동 배포하는 것이 목적. MimikaStudio는 Mac Apple Silicon 네이티브 MLX 가속 + 60+ REST API + MCP 통합으로 파이프라인 연동에 최적. 내부/외부 분리 원칙으로 라이선스 리스크 제거.
- 상세 문서: `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`

### 2026-03-25 — media-engine 패키지 추출 (takdizang → vibe-media)
- 상태: resolved
- 결정:
  - takdizang의 도메인 무관 인프라 코드(Kie.ai, Gemini, Sharp, Remotion spawn, Supabase Storage)를 `packages/media-engine`으로 추출.
  - 이커머스 특화 코드(usage-guard, marketing-script, compose 블록 에디터, Remotion composition UI)는 takdizang에 유지.
  - 플랫 구조(src/ 단일 폴더, 16개 파일) 채택 — 하위 폴더 + barrel index 오버헤드 제거.
  - Supabase Storage는 DI 패턴(`createStorageHelper(client)`)으로 양쪽 프로젝트에서 자기 클라이언트 주입 가능.
  - Gemini 래퍼는 이커머스 프롬프트(CATEGORY_INSTRUCTIONS, PERSUASION_SEQUENCES) 제거, `callGemini(prompt, schema)` 범용 인터페이스.
  - TTS/Publish는 인터페이스만 스캐폴딩 (types.ts에 통합), 구현체는 향후 apps/backend에서.
- 근거: vibe-media의 IT 뉴스 brief를 블로그/영상/뉴스레터로 자동 변환하는 엔진 기반이 필요했고, takdizang과 동일 API(Kie.ai, Gemini, Supabase)를 공유하므로 코드 재사용이 합리적. 별도 패키지 분리로 양쪽 독립 진화 가능.

### 2026-03-25 — Local `code-review-graph` Ignore Baseline
- 상태: resolved
- 결정:
  - 로컬 `code-review-graph`는 시스템 기본 Python을 바꾸지 않고 별도 Python/uv 환경에서 사용한다.
  - 레포 루트에 `.code-review-graphignore`를 추가해 `apps/web/.next`, `logs`, `coverage`, `test-results`, `playwright-report`, `supabase/.temp` 같은 generated churn을 그래프와 watch 대상에서 제외한다.
  - 운영 기본값은 `watch` 상시 구동보다 `status` / `build` / `update` 중심으로 두고, watch noise가 다시 보이면 ignore 규칙을 먼저 조정한다.
- 근거: 초기 `watch` 검증에서 authored source 외의 generated output churn이 함께 잡혀 로그 가독성과 blast-radius 해석 품질을 떨어뜨렸다. source 중심 그래프를 유지하는 편이 실제 리뷰와 수정 범위 산정에 더 유리했다.

### 2026-03-25 — Editorial Automation Hardening
- 상태: resolved
- 결정:
  - 루트 `package.json`에 `publish:auto`, `publish:auto-dry`, `publish:repair-state`, `automation:check` 스크립트를 추가해 automation 문서와 실제 실행 경로를 일치시킨다.
  - `auto-publish` quality check 실패 브리프는 `draft + pending`으로 되돌리고 `last_editor_note`에 recovery 사유를 남겨 다음 editorial review 사이클로 복귀시킨다.
  - `approve`와 `schedule` 액션은 `review` 상태 브리프에서만 허용해 `draft + approved` 같은 상태 조합을 write 시점에 막는다.
  - `publish:repair-state` 워커를 추가해 `draft + approved`, `draft + scheduled_at`, `draft + published_at` 같은 복구 가능한 조합을 nightly repair 대상으로 둔다.
  - `automation:check` 스크립트를 추가해 `.claude/automations/*.md`의 `npm run ...` 및 로컬 파일 참조 drift를 주기적으로 검사한다.
  - Supabase Postgres 연결에는 retry/backoff를 추가해 pooler circuit breaker 및 prepared statement 계열 일시 오류를 자동 재시도한다.
- 근거: auto-publish skip 후 재가공 복귀 경로 부재, 문서-스크립트 drift, 상태 무결성 누수, pooler 일시 오류가 운영 자동화의 가장 작은 반복 장애 지점이었다.

### 2026-03-24 — Auto-Publish Worker
- 상태: resolved
- 결정:
  - `supabase-auto-publish.ts` + `run-auto-publish.ts` 워커 구현
  - `review_status = 'approved'` + `status != 'published'` 브리프 대상
  - quality check 6항목 (title/summary/body/source-count/https-url/internal-term) 통과 시에만 전환
  - `draft|review → scheduled → published` 2단계 전환 (1회 실행에 1단계)
  - `npm run publish:auto` / `publish:auto-dry` (dry-run) 스크립트 등록
  - 전환 발생 시 Telegram 보고
- 근거: review → published 사이 수동 클릭 의존도 제거. AUTO-PUBLISH-RULES.md 조건 기반 구현

### 2026-03-24 — Brief Cover Image Pipeline + Reference Brief
- 상태: resolved
- 결정:
  - `brief_posts`에 `cover_image_url` nullable text 컬럼 추가
  - RSS 파서에서 `<enclosure>`, `<media:content>`, `<media:thumbnail>`, `<img>` 순서로 이미지 추출
  - 이미지는 URL만 저장 (파일 다운로드 없음), 원본 서버에서 직접 로드
  - 공개 디테일 페이지에 메타바 아래/본문 위에 cover 이미지 표시 (없으면 영역 숨김)
  - 레퍼런스 브리프 1개 작성 — 3단락+섹션헤딩+소스3개 구조로 Quality Check 6/6 기준 확립
- 근거: 기존 브리프가 RSS 요약 1줄 복사에 불과. 자동화 프롬프트 설계 전 "좋은 브리프" 기준이 필요

### 2026-03-24 — Admin Card Readability + Sidebar Reorder
- 상태: resolved
- 결정:
  - 카드 제목 `--type-body`→`--type-h3`, fontWeight 600→700
  - 메타 레이아웃 flex→grid, dd에 fontWeight 600 추가
  - 대시보드 카운트 `--type-h2` + orange 강조
  - 카드 overflow 방지: `overflow: hidden`, badges `flex-wrap`, title `word-break`
  - 사이드바 순서를 파이프라인 흐름순으로 정렬 (소스→파이프라인→수집→브리프→디스커버리→검토→발행)
- 근거: 카드 텍스트 가독성 부족 + 사이드바 순서가 실제 워크플로우와 불일치

### 2026-03-24 — Admin Tab Data Separation + Promotion Actions
- 상태: resolved
- 결정:
  - 발행 탭 SQL에서 `pending`/`changes_requested` 제거 → 승인된 항목만 표시
  - 수신함에서 `ingest_status = 'drafted'` 항목 제외 → 이미 진행된 항목 안 보임
  - 브리프 탭에 상태 필터 칩 추가 (전체/초안/검수 중/예약/발행됨)
  - draft 브리프 → review 전환 서버 액션 + "검수 요청" 버튼 추가
  - retryable 예외 → 재시도 서버 액션 + "재시도" 버튼 추가
- 근거: 같은 항목이 여러 탭에 동시 노출돼 운영자 혼란. 각 탭이 자기 단계 데이터만 보여야 함

### 2026-03-24 — Admin Sidebar Tab Consolidation (15 → 12)
- 상태: resolved
- 결정:
  - 정책 + 프로그램 → `/admin/rules` "운영 규칙" (읽기 전용 섹션 2개)
  - 수신함 + 실행 이력 → `/admin/collection` "수집 현황" (클라이언트 탭 전환)
  - 검수 + 예외 처리 → `/admin/pending` "검토 대기" (클라이언트 탭 전환)
  - 기존 6개 route(`/admin/policies`, `/admin/programs`, `/admin/inbox`, `/admin/runs`, `/admin/review`, `/admin/exceptions`)는 redirect 유지
  - 디테일 페이지(`/admin/inbox/[id]` 등)는 기존 URL 유지, back link만 통합 페이지로 변경
  - 공용 `AdminTabSwitcher` 컴포넌트로 URL `?tab=` 파라미터 기반 탭 상태 관리
- 근거: 15개 사이드바 탭이 네비게이션을 복잡하게 만듦. 유사 역할의 3쌍을 합쳐 12개로 축소하면 인지 부하 감소

### 2026-03-24 — Supabase Connection Pool Deadlock + Timestamp Parsing Fix
- 상태: resolved
- 결정:
  - `postgres` 라이브러리의 `max: 1` → `max: 10` 변경. Transaction mode pooler(6543)를 사용하므로 안전
  - timestamp/timestamptz OID에 대해 `parse: (x) => x`로 문자열 반환 설정 추가
  - projection bundle timeout을 15초 → 8초로 축소
- 근거:
  - `max: 1`은 `Promise.all`로 7개 쿼리를 병렬 실행할 때 1개 연결로 순차 실행 시도 → deadlock 발생 → 15초 timeout까지 대기
  - `postgres` 라이브러리가 `timestamp` 컬럼을 `Date` 객체로 반환 → React JSX에서 `[object Date]` 렌더링 에러
  - 결과: admin 전체 라우트 15,600ms → 600~900ms (56배 개선), 에러 0건

### 2026-03-24 — AutomationTrail useSyncExternalStore Infinite Loop Fix
- 상태: resolved
- 결정: `getSnapshot`이 매 호출마다 새 배열 참조를 반환해 React 무한 re-render 발생. JSON 문자열 비교로 이전 결과를 캐싱하여 실제 변경 시에만 새 참조 반환하도록 수정
- 근거: React `useSyncExternalStore` 규약상 getSnapshot 반환값이 변경되지 않았으면 동일 참조를 반환해야 함

### 2026-03-24 — Brief Detail Redesign + Quality Checklist + Review Body Preview
- 상태: resolved
- 결정:
  - Brief detail에 convention-based section parsing 도입: `## ` 접두사로 시작하는 body paragraph를 자동 섹션 분리. 현재 파이프라인 데이터엔 heading 없어 flat 렌더링 유지, 파이프라인이 `## ` 접두사 생성 시 자동 활성화
  - Admin brief detail에 advisory 품질 체크리스트 6항목 추가 (title/summary 길이, body 단락수, source 수/URL 유효성, 내부 용어 노출)
  - Review detail에서 brief body를 보여주기 위해 `previewTitle`로 `brief_posts` title lookup 방식 채택. 직접 FK 없으므로 title 기반 best-effort 매칭, 실패 시 graceful 생략
- 근거: review→brief 직접 FK 부재, `whyItMatters`/`topic` DB 컬럼 미존재 제약 하에서 즉시 실행 가능한 개선

### 2026-03-24 — Brief CSS Separation + Token Lint
- 상태: resolved
- 결정:
  - `components.css`가 355줄에 도달하여 brief 전용 CSS를 `brief.css`로 분리
  - CSS 토큰 준수 검사를 `tools/token-lint.sh`로 자동화하고 self-review에 통합
  - `whyItMatters`와 `topic` 필드는 DB 마이그레이션 필요 → contract에 optional로 선언만 하고 실제 DB 컬럼 추가는 보류
- 근거: components.css 300줄 규칙 초과, 경쟁사 분석 기반 UX 개선 필요성

### 2026-03-22 — Showcase Sidecar Lane Boundary
- 상태: resolved
- 결정:
  - `showcase`는 자동 `brief/discover` 파이프라인과 분리된 수동 큐레이션 sidecar lane으로 운영한다.
  - 첫 공개 surface는 홈 티저와 `/radar` showcase picks 섹션이다.
  - 운영 surface는 `/admin/showcase`를 사용한다.
  - 향후 로그인 기반 사용자 submission도 ingest/classify 본선이 아니라 showcase lane 안에서만 처리한다.
- 근거:
  - 기존 `target_surface = brief | discover | both | archive | discard`는 자동화 파이프라인 의미를 유지해야 한다.
  - discovery와 showcase를 같은 저장 레일에 섞으면 human-on-exception, publish queue, projection 해석이 흐려진다.
  - 별도 `showcase_entries` / `showcase_links` 레인이 public/admin 브랜드 경험은 확장하면서 파이프라인 안정성은 유지한다.

### 2026-03-22 — JS Runtime Baseline
- 상태: resolved
- 결정:
  - `vibehub-media` 검증에는 Node 런타임이 필요하다.
  - `apps/web` typecheck는 `next typegen` 이후 `tsc --noEmit`를 canonical flow로 사용한다.
- 근거:
  - Next 16 App Router 타입 생성은 빌드 산출물 의존보다 `typegen` 선행이 더 안정적이다.

### 2026-03-22 — Git Bootstrap Strategy
- 상태: resolved
- 결정:
  - `vibehub-media`는 로컬 git repository로 초기화한다.
  - 기본 브랜치는 `main`을 사용한다.
  - 원격은 `origin = git@github.com:kimjuyoung1127/vibe-media.git`를 canonical remote로 둔다.
- 메모:
  - 로컬 초기화와 첫 커밋은 완료했다.
  - 현재 SSH-authenticated 환경에서 push도 확인했다.

### 2026-03-22 — Ingest Stack v1
- 상태: resolved
- 결정:
  - 현재 구현 collector는 RSS/API + GitHub Releases fetch를 유지한다.
  - collector 목표 primary: `Crawl4AI`
  - collector fallback 후보: `Firecrawl`
  - HTML/article cleanup Phase 1 실제 도입: `Defuddle`
  - document/PDF 목표 primary: `Docling`
  - PDF 목표 fallback: `OpenDataLoader PDF`
  - utility fallback 후보: `MarkItDown`
  - `Unstructured`는 v1 primary에서 제외하고 P3 ETL 후보로 남긴다.
- 기준 문서:
  - `docs/ref/INGEST-STACK-DECISION.md`

### 2026-03-22 — Source Catalog v1
- 상태: resolved
- 결정:
  - brief source 1차 배치는 공식 AI product/research source 중심으로 묶는다.
  - discover source 1차 배치는 GitHub/launch/event/contest 축으로 묶는다.
  - event/contest/grant는 `Devpost`, `Kaggle Competitions`, `AI Engineer World’s Fair`, `MLH`를 기본 source로 둔다.
- 기준 문서:
  - `docs/ref/SOURCE-CATALOG.md`

### 2026-03-22 — Auto-Safe Live Fetch v0 Start Set
- 상태: resolved
- 결정:
  - 첫 live source fetch 연결은 `auto-safe` 중 `OpenAI News`, `Google AI Blog`, `GitHub Releases`부터 연다.
  - `OpenAI API Changelog`, `Anthropic Research`는 registry에는 남기되 stable endpoint 확인 전까지 disabled로 둔다.
- 근거:
  - `OpenAI News` RSS, `Google AI Blog` RSS, `GitHub Releases` API는 실제 fetch 검증에 성공했다.
  - `Anthropic Research` 후보 RSS endpoint는 404를 반환했다.
  - `OpenAI API Changelog`는 stable RSS/API endpoint가 아직 정리되지 않아 첫 live spine에는 넣지 않았다.
- 다음 작업:
  - live fetched item을 `ingest_runs -> ingested_items -> item_classifications` 저장 spine에 연결
  - disabled source의 stable endpoint를 다시 조사
- 기준 문서:
  - `docs/ref/SOURCE-CATALOG.md`
  - `docs/ref/INGEST-STACK-DECISION.md`

### 2026-03-22 — Local Ingest Spine Snapshot v0
- 상태: resolved
- 결정:
  - live fetch 결과는 우선 로컬 snapshot 형태로 `sources -> ingest_runs -> ingested_items -> item_classifications` 구조에 맞춰 저장한다.
  - backend의 `sources / runs / inbox / review / publish / exceptions` 조회는 snapshot이 있으면 그것을 우선 읽고, 없으면 기존 mock으로 fallback한다.
  - web의 동일 화면도 backend use case를 통해 snapshot-backed 데이터를 읽는다.
- 근거:
  - `pipeline:live-ingest` 실행으로 5 source row, 3 run row, 9 ingested item row, 9 classification row가 생성됐다.
  - backend 조회 결과도 `sources 5 / runs 3 / inbox 9 / review 4 / publish 5 / exceptions 4`로 snapshot 값을 읽는 것을 확인했다.
  - Supabase apply 전에도 저장 spine과 화면 소비 경로를 먼저 검증할 수 있다.
- 다음 작업:
  - snapshot을 Supabase 실제 테이블 write로 교체
  - dedupe, retry, failure history를 row 수준으로 정교화
- 기준 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/ref/ARCHITECTURE.md`

### 2026-03-22 — Supabase Remote Write Path v0
- 상태: resolved
- 결정:
  - `pipeline:supabase-migrate`와 `pipeline:supabase-sync` 스크립트를 추가해 원격 Supabase에 migration apply와 live ingest sync를 실행할 수 있게 준비한다.
  - `SUPABASE_DB_URL`에 placeholder가 남아 있으면 실행을 즉시 중단한다.
  - sync 레이어는 `public.*` schema-qualified upsert와 stable UUID mapping을 사용해 로컬 snapshot id를 원격 UUID 스키마에 맞춰 저장한다.
- 근거:
  - migration runner는 현재 `supabase/migrations/*.sql`을 순서대로 적용하도록 구성했다.
  - sync runner는 live ingest snapshot을 `sources / ingest_runs / ingested_items / item_classifications`에 upsert하도록 구성했다.
  - 실제 원격 migration apply와 live ingest sync를 실행했고 `sources 5 / ingest_runs 3 / ingested_items 9 / item_classifications 9` row count를 확인했다.
  - 첫 원격 sync에서 local snapshot id가 UUID 형식이 아니라 실패했고, 이를 stable UUID mapping으로 보정했다.
- 다음 작업:
  - Supabase read path 전환 적용
  - dedupe, retry, failure history를 row 수준으로 정교화
- 기준 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/status/PROJECT-STATUS.md`

### 2026-03-22 — Supabase Read Path v0
- 상태: resolved
- 결정:
  - backend의 `sources / runs / inbox / review / publish / exceptions` 조회는 `SUPABASE_DB_URL`이 있으면 Supabase projection을 우선 사용한다.
  - Supabase read가 불가능하면 live snapshot, 그다음 mock 순서로 fallback한다.
  - web의 admin/public source 화면도 같은 backend use case를 통해 이 경로를 사용한다.
- 근거:
  - remote row를 `source / run / inbox / review / publish / exceptions` projection으로 재구성하는 read module을 추가했다.
  - 실제 원격 read 확인 결과 현재 enabled source 기준 `sources 3 / runs 3 / inbox 9 / review 9 / publish 0 / exceptions 9`를 반환했다.
  - typecheck, build, unit test가 모두 통과했다.
- 다음 작업:
  - drafted stage와 publish queue를 원격 테이블 기준으로 분리 저장
  - read/write 모두에서 dedupe, retry, failure history를 row 수준으로 정교화
- 기준 문서:
  - `docs/ref/ARCHITECTURE.md`
  - `docs/ref/SCHEMA.md`

### 2026-03-22 — Editorial Draft Spine v0
- 상태: resolved
- 결정:
  - ingest 결과를 `brief_posts / discover_items / discover_actions / admin_reviews`까지 확장 저장한다.
  - public `brief`, `brief/[slug]`, `radar`와 admin `briefs`, `discover`는 이 editorial spine을 Supabase-first로 읽는다.
  - brief는 `source_links`, `source_count`를 함께 저장하고, discover는 action rows를 별도 테이블로 저장한다.
- 근거:
  - 새 migration으로 `discover_items`, `discover_actions`, `brief_posts` 확장 컬럼을 추가했다.
  - 실제 원격 sync 후 row count는 `brief_posts 9 / discover_items 4 / discover_actions 8 / admin_reviews 8`이었다.
  - 실제 read 확인 결과 `briefs 9`, `brief detail ok`, `discover 4`, `first discover actions 2`를 반환했다.
  - lint, typecheck, build, unit test가 모두 통과했다.
- 다음 작업:
  - `scheduled/published` 기준 publish queue를 editorial 테이블 중심으로 재구성
  - discovery status와 action-link 품질 규칙을 운영 정책에 맞춰 정교화
- 기준 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/ref/PIPELINE-OPERATING-MODEL.md`

### 2026-03-22 — Classifier Stage Winner
- 상태: resolved
- 결정:
  - `classifier` stage candidate는 `claude-sonnet-4-6`로 승격한다.
  - active baseline이던 `mistral-small3.1`은 fallback으로 유지한다.
- 근거:
  - Sonnet으로 Claude runner를 고정한 뒤 40-sample classifier shadow trial을 다시 기록했다.
  - active `mistral-small3.1` exact match는 57.5%, candidate `claude-sonnet-4-6` exact match는 95.0%였다.
  - exception queue inflow는 active 52.5%, candidate 10.0%로 candidate가 더 낮았다.
  - runbook의 minimum sample gate를 충족했다.
- 다음 작업:
  - `telegram-orchestrator` activate step 실행
  - 최소 observation window 유지
  - 다음 stage인 `brief draft` shadow trial 시작
- 기준 문서:
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Claude Runner Default To Sonnet
- 상태: resolved
- 결정:
  - `telegram-orchestrator`의 Claude runner 기본 모델은 `claude-sonnet-4-6`를 사용한다.
  - 필요하면 `ROUTER_CLAUDE_MODEL` 환경 변수로 override할 수 있다.
- 근거:
  - `../telegram-orchestrator/bin/run-claude.sh`에 `--model "$CLAUDE_MODEL"`을 추가했고 기본값을 `claude-sonnet-4-6`로 설정했다.
  - Claude runner smoke test는 `SONNET_OK` 응답으로 통과했다.
  - Sonnet 기준 classifier shadow trial 재기록도 완료했다.
- 기준 문서:
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`
  - `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`

### 2026-03-22 — Brief Draft Stage Winner
- 상태: resolved
- 결정:
  - `brief draft` stage candidate는 `claude-sonnet-4-6`로 승격한다.
  - active baseline이던 `mistral-small3.1`은 fallback으로 유지한다.
- 근거:
  - 20-sample `brief draft` shadow trial gate를 충족했다.
  - active `mistral-small3.1` task success는 0.0%, candidate `claude-sonnet-4-6` task success는 100.0%였다.
  - exception queue inflow는 active 90.0%, candidate 10.0%로 candidate가 더 낮았다.
  - brief source fidelity와 summary quality가 candidate 쪽에서 더 안정적으로 유지됐다.
- 다음 작업:
  - `discover draft` shadow trial 시작
  - classifier activate step과 observation window는 `telegram-orchestrator`에서 계속 추적
- 기준 문서:
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Discover Draft Stage Winner
- 상태: resolved
- 결정:
  - `discover draft` stage candidate는 `claude-sonnet-4-6`로 승격한다.
  - active baseline이던 `mistral-small3.1`은 fallback으로 유지한다.
- 근거:
  - 20-sample `discover draft` shadow trial gate를 충족했다.
  - active `mistral-small3.1` task success는 0.0%, candidate `claude-sonnet-4-6` task success는 100.0%였다.
  - confidence stability는 active 80.0%, candidate 100.0%였다.
  - exception queue inflow는 active 100.0%, candidate 0.0%로 candidate가 더 낮았다.
  - category fit, action-link quality, CTA clarity가 candidate 쪽에서 더 안정적으로 유지됐다.
- 다음 작업:
  - `critic` shadow trial 시작
  - classifier activate step과 observation window는 `telegram-orchestrator`에서 계속 추적
- 기준 문서:
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Critic Stage Winner
- 상태: resolved
- 결정:
  - `critic` stage candidate는 `claude-sonnet-4-6`로 승격한다.
  - active baseline이던 `mistral-small3.1`은 fallback으로 유지한다.
- 근거:
  - 25-sample `critic` shadow trial gate를 충족했다.
  - active `mistral-small3.1` task success는 64.0%, candidate `claude-sonnet-4-6` task success는 96.0%였다.
  - confidence stability는 active 92.0%, candidate 100.0%였다.
  - memory false positive drift는 active 16.0%, candidate 0.0%였다.
  - exception queue inflow는 active 36.0%, candidate 8.0%로 candidate가 더 낮았다.
- 다음 작업:
  - orchestration mode comparison 실행
  - classifier activate step과 observation window는 `telegram-orchestrator`에서 계속 추적
- 기준 문서:
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Telegram Orchestrator Stage Activation Boundary
- 상태: resolved
- 결정:
  - `telegram-orchestrator`의 `/model-activate`와 `/model-rollback`은 이제 role target과 stage target을 분리해서 받는다.
  - `router/search/memory`는 role activation 대상으로 유지한다.
  - `classifier`, `brief draft`, `discover draft`, `critic`는 stage pointer activation 대상으로 분리한다.
  - stage pointer activation은 runtime `chat/router/search/memory` active를 바꾸지 않는다.
- 근거:
  - 기존 activate 구현은 `chat/router/search/memory`를 한 번에 모두 바꿔서 VibeHub runbook과 충돌했다.
  - 수정 후 `classifier` stage pointer만 Sonnet으로 올려도 runtime roles는 모두 `mistral-small3.1`로 유지되는 것을 확인했다.
  - automatic rollback monitor는 runtime role activation에서만 켜도록 유지했다.
- 다음 작업:
  - classifier observation window 유지
  - `brief draft`, `discover draft`, `critic` stage activation 순서 확정
  - orchestration mode comparison 실행
- 기준 문서:
  - `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`

### 2026-03-22 — Legacy Public Cleanup
- 상태: resolved
- 결정:
  - legacy public table/trigger/function은 SQL backup 후 cleanup한다.
  - `handle_new_user`는 `auth.users` trigger를 살리기 위해 no-op 함수로 교체한다.
- 근거:
  - app code는 legacy public tables를 참조하지 않는다.
  - cleanup 전용 worker가 table data / function / trigger SQL backup을 생성했다.
  - cleanup commit 뒤 allowlist 외 public legacy table이 남지 않는 것을 확인했다.
- 기준 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/status/PROJECT-STATUS.md`

### 2026-03-22 — Video Raw Storage Policy
- 상태: resolved
- 결정:
  - 원본 비디오는 Supabase DB에 저장하지 않는다.
  - raw video는 local disk 또는 NAS에 두고, DB `video_jobs`에는 metadata만 저장한다.
  - remote storage는 proxy / preview / transcript / final export 같은 파생 산출물 전용으로 둔다.
- 근거:
  - `video_jobs`는 상태 spine이며 raw blob 저장은 비용과 용량 면에서 비효율적이다.
  - watch folder worker와 schema expansion이 raw metadata fields를 기준으로 구현됐다.
- 기준 문서:
  - `docs/ref/VIDEO-PIPELINE.md`
  - `docs/ref/VIDEO-WORKER-CONTRACT.md`
  - `docs/ref/SCHEMA.md`

### 2026-03-22 — Orchestration Final Choice
- 상태: resolved
- 결정:
  - 최종 운영 기본값은 `hybrid`다.
  - runtime `chat/router/search/memory`는 `mistral-small3.1`로 유지한다.
  - `classifier`, `brief draft`, `discover draft`, `critic` stage pointer는 모두 `claude-sonnet-4-6`로 활성화한다.
- 근거:
  - stage-level shadow trial 4개가 모두 `claude-sonnet-4-6` 우세로 끝났다.
  - stage-scoped activation boundary가 이미 구현돼 runtime role과 stage pointer를 분리할 수 있다.
  - 실제 orchestrator SQLite 상태에서 4개 stage pointer가 모두 `claude-sonnet-4-6`로 활성화된 것을 확인했다.
- 기준 문서:
  - `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Review And Publish Action Layer
- 상태: resolved
- 결정:
  - review decision과 publish transition은 backend action handler + admin UI Server Action 버튼으로 닫았다.
  - backend CLI (`review:decision`, `publish:action`)와 admin UI 양쪽에서 mutation 실행 가능.
- 근거:
  - `review / publish` read model은 이미 Supabase lifecycle 기준으로 전환돼 있었다.
  - `review:decision`, `publish:action` worker가 추가되어 approve / changes requested / reject / schedule / publish를 backend에서 바로 실행할 수 있다.
- 기준 문서:
  - `docs/status/PROJECT-STATUS.md`
  - `docs/status/EXECUTION-CHECKLIST.md`

### 2026-03-22 — News Pipeline Audit Stage Split
- 상태: resolved
- 결정:
  - 최신 IT 뉴스 파이프라인 `점검용` 프롬프트는 로컬 기본 경로가 아니라 agent runner 기본 경로로 둔다.
  - local `mistral-small3.1`는 `router/search/memory`와 짧은 후처리 요약에 남긴다.
  - repo-scale audit은 `Codex` 또는 `Claude`에 맡기고, 실제 수정/검증은 현재 기준 `Claude`를 우선한다.
- 근거:
  - `mistral-small3.1`로 30KB~40KB 수준의 실제 문서/코드 컨텍스트 audit을 시도했지만 수분 단위로 응답이 지연되어 실용적이지 않았다.
  - 같은 점검 프롬프트를 `Codex` read-only runner로 실행했을 때 약 `307150ms` 안에 실제 병목과 검증 포인트를 포함한 결과를 반환했다.
  - 실험 당시 snapshot, source registry, `typecheck`, `test:unit`까지 실제 상태 확인을 함께 수행했다.
- 기준 문서:
  - `docs/status/LOCAL-VS-AGENT-NEWS-PIPELINE-EVAL.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-24 — Mobile Responsiveness Hardening
- 상태: resolved
- 결정:
  - 반응형 값(브레이크포인트, 고정 레이아웃 폭)은 디자인 토큰화하지 않고 `responsive.css` media query로 관리한다.
  - 모든 터치 타겟은 모바일에서 최소 44px을 보장한다.
  - `admin-table`은 `admin-table-wrap` 스크롤 래퍼로 수평 오버플로를 방지한다.
  - SiteHeader는 모바일에서 햄버거 메뉴 + 드롭다운 패턴을 사용한다.
- 근거:
  - CSS `@media`는 `var()` 미지원으로 브레이크포인트 토큰화 불가.
  - `admin-detail-meta`, `admin-table`, `pipeline-detail-panel`이 `responsive.css`에서 누락돼 모바일 레이아웃이 깨졌다.
  - nav-links, sidebar-link, sidebar-toggle 등의 터치 타겟이 15~30px로 44px 최소 기준 미달이었다.
- 변경: `responsive.css` 37줄→132줄, `SiteHeader.tsx` 클라이언트 컴포넌트 전환, TSX 7개 테이블 래퍼 추가
- 기준 문서:
  - `apps/web/app/responsive.css`
  - `docs/status/FRONTEND-HANDOFF.md`

### 2026-03-24 — Design Token Unification
- 상태: resolved
- 결정:
  - CSS에서 raw rgba/hex 하드코딩을 전면 제거하고 `var()` 참조로 전환한다.
  - `colorRgbTokens`를 추가해 `rgba(var(--color-X-rgb), alpha)` 패턴을 지원한다.
  - `purple` (#bc9aff) 색상 토큰을 추가한다 (비디오/raw_received 상태용).
  - `--radius-md` (12px), `--radius-sm` (8px), `--type-body` (0.92rem), `--type-label` (0.65rem) 토큰을 추가한다.
  - `button-danger`와 `modification-reasons`가 사용하던 미등록 색상 `#f43f5e`를 `--color-rose`로 통일한다.
  - `pipeline.css`의 Tailwind 팔레트 색상 12종을 프로젝트 토큰으로 전환한다.
- 근거:
  - CSS 6개 파일에서 raw rgba 28회+(cream), Tailwind hex 12종(pipeline), 미등록 색상 2종이 발견됐다.
  - 근본 원인은 `rootCssVariables`가 hex만 내보내 alpha 사용 시 raw rgba가 강제된 것이었다.
  - RGB 채널 변수 추가로 구조적 문제를 해결하고, 총 141건의 하드코딩을 `var()` 참조로 교체했다.
- 기준 문서:
  - `packages/design-tokens/src/index.ts`
  - `docs/status/FRONTEND-HANDOFF.md` §2 (CSS 토큰)

## Next Review Order
1. ~~review / publish mutation 모델 확정~~ done — Server Action 버튼 구현 완료
2. ~~`SUPABASE_DB_URL` 환경변수 세팅 + end-to-end 검증~~ done — pipeline → UI E2E 검증 완료, Supabase query timeout 보호 적용
3. watch-folder auto-analysis output 연결
4. admin auth / observability hardening
