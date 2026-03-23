# Route Specs

## Public
### `/`
- 목적: 브랜드 허브, 최근 브리프 진입점, 자산 전략 소개
- 핵심 섹션: hero, selected briefs, showcase lane teaser, custom assets, discovery surface
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
- 목적: 운영자 메인 대시보드 (운영 콕핏)
- 핵심 섹션: 최근 완료 항목 → 배포 준비 현황 → 대기열 현황 → 자동화 이력 → Pipeline Monitor
- 사이드바 그룹: 파이프라인 / 에디토리얼 / 레지스트리 / 참조 (한국어)
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
- 핵심 섹션: 신규 전시 등록, discovery reference 연결, featured home/radar 제어, 게시 상태 관리
- 현재 상태: sidecar lane editor form + existing entry editor cards

### `/admin/inbox`
- 목적: 새로 수집된 item 확인
- 핵심 섹션: 카드 그리드 (소스, 단계, surface, 신뢰도)
- 현재 상태: 카드 UI 구현, 실제 classification mutation은 후속 작업

### `/admin/inbox/[id]`
- 목적: 수신 항목 상세
- 핵심 섹션: 수집 정보, 파싱 요약, 분류 로그
- 현재 상태: AdminDetailLayout + InboxDetailContent 구현

### `/admin/runs`
- 목적: 수집/가공/초안 실행 이력 확인
- 핵심 섹션: 카드 그리드 (상태, 아이템 수, 소요 시간)
- 현재 상태: 카드 UI 구현, 실제 retry mutation은 후속 작업

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

### `/admin/review`
- 목적: 예외 검수와 send-back 판단
- 핵심 섹션: 카드 그리드 (검수 상태, surface, 신뢰도)
- 현재 상태: 카드 UI + approve/changes_requested/reject Server Action 버튼 구현
- 전제: mutation은 `SUPABASE_DB_URL` 환경변수 필요

### `/admin/review/[id]`
- 목적: 검수 항목 상세
- 핵심 섹션: 출처, 파싱 결과, 미리보기, 수정 사유 (ModificationReason)
- 현재 상태: AdminDetailLayout + ReviewDetailContent 구현

### `/admin/exceptions`
- 목적: human-on-exception 큐 운영
- 핵심 섹션: 카드 그리드 (사유, 신뢰도, 대상 타입)
- 현재 상태: 카드 UI + read/view 중심 화면

### `/admin/exceptions/[id]`
- 목적: 예외 항목 상세
- 핵심 섹션: 수정 사유 (ModificationReason), 정책 위반 사항
- 현재 상태: AdminDetailLayout + ExceptionDetailContent 구현

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
