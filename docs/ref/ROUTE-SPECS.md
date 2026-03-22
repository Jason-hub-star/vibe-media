# Route Specs

## Public
### `/`
- 목적: 브랜드 허브, 최근 브리프 진입점, 자산 전략 소개
- 핵심 섹션: hero, selected briefs, showcase lane teaser, custom assets
- 상태 강화 예정: brief empty state

### `/brief`
- 목적: 브리프 아카이브
- 핵심 섹션: brief card grid
- 상태 강화 예정: list loading/empty/error

### `/radar`
- 목적: 오픈소스, 스킬, 플러그인, 사이트, 이벤트, 공모전 discovery 허브
- 핵심 섹션: hero, showcase picks, featured picks, discovery index
- 현재 상태: scaffold cards + fast action links

### `/brief/[slug]`
- 목적: 브리프 상세와 출처 확인
- 핵심 섹션: summary/body, sources
- 현재 상태: Supabase-first detail read 구현, not found 분기 포함

### `/sources`
- 목적: 추적 소스 레지스트리
- 핵심 섹션: source rows
- 상태 강화 예정: empty/error

### `/newsletter`
- 목적: 구독 CTA
- 핵심 섹션: form, hero placeholder
- 현재 상태: client-side success/error copy 구현

## Admin
### `/admin`
- 목적: 운영자 메인 대시보드
- 핵심 섹션: Pipeline Monitor (canvas + node detail panel + results summary + run history + source reliability) 상단, Queue Overview 하단
- 사이드바 그룹: Pipeline, Editorial, Registry, Reference (4개 섹션)
- 현재 인증 성격: 로컬 스캐폴드 게이트, production auth 아님

### `/admin/pipeline`
- 목적: Pipeline Monitor 전용 route (레거시)
- 현재 상태: `/admin`으로 redirect

### `/admin/briefs`
- 목적: 브리프 검수
- 핵심 섹션: status table
- 현재 상태: empty state 분기 구현. review mutation은 `/admin/review`에서 처리

### `/admin/discover`
- 목적: 디스커버리 레지스트리 운영
- 핵심 섹션: registry table
- 현재 상태: scaffold table + outbound actions

### `/admin/showcase`
- 목적: 수동 큐레이션 showcase lane 운영
- 핵심 섹션: 신규 전시 등록, discovery reference 연결, featured home/radar 제어, 게시 상태 관리
- 현재 상태: sidecar lane editor form + existing entry editor cards

### `/admin/inbox`
- 목적: 새로 수집된 item 확인
- 핵심 섹션: source / parsed content / classification candidate
- 현재 상태: scaffold table 구현, 실제 classification mutation은 후속 작업

### `/admin/runs`
- 목적: 수집/가공/초안 실행 이력 확인
- 핵심 섹션: run status table, retry actions
- 현재 상태: scaffold table 구현, 실제 retry mutation은 후속 작업

### `/admin/publish`
- 목적: 승인 후 배포 대기와 예약 상태 확인
- 핵심 섹션: publish queue + action cell
- 현재 상태: Supabase editorial lifecycle + `video_jobs` queue를 함께 읽고, brief/discover 항목에 schedule/publish Server Action 버튼 구현 (video는 버튼 미표시)
- 전제: mutation은 `SUPABASE_DB_URL` 환경변수 필요

### `/admin/review`
- 목적: 예외 검수와 send-back 판단
- 핵심 섹션: source / parsed / preview 3면 레이아웃 + action bar
- 현재 상태: `admin_reviews` 실저장 row를 우선 읽는 3면 레이아웃 + approve/changes_requested/reject Server Action 버튼 구현
- 전제: mutation은 `SUPABASE_DB_URL` 환경변수 필요

### `/admin/exceptions`
- 목적: human-on-exception 큐 운영
- 핵심 섹션: exception reason, confidence, retry or hold action
- 현재 상태: retryable ingest failure + blocked video 상태를 한 화면에서 읽는 read/view 중심 화면

### `/admin/policies`
- 목적: review policy, source tier, publish policy 확인
- 핵심 섹션: policy summary cards and rule table
- 현재 상태: 실제 `docs/ref/*.md`를 읽어 review / source tier / publish rule을 한 화면에서 참조

### `/admin/programs`
- 목적: program-style rule files 관리
- 핵심 섹션: brief/discover/publish/source policy references
- 현재 상태: 실제 program-style markdown 참조 정보를 읽어 파일 위치와 역할을 보여줌

### `/admin/video-jobs`
- 목적: 비디오 자동화 상태 확인
- 핵심 섹션: placeholder banner, job board, CapCut handoff notes, parent review gate
- 현재 상태: scaffold board가 `auto analysis -> CapCut -> parent review -> private upload` 흐름을 반영

### `/admin/sources`
- 목적: source registry 확인
- 핵심 섹션: source rows (ul/li 구조, enabled sources만 표시)
- 현재 상태: Supabase-first read, fallback은 snapshot → mock. source name, category, freshness, visit link 표시

### `/admin/assets`
- 목적: asset slot 확인
- 핵심 섹션: slot cards
- 현재 상태: empty state 분기 구현

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
