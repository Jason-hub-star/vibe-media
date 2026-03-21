# Route Specs

## Public
### `/`
- 목적: 브랜드 허브, 최근 브리프 진입점, 자산 전략 소개
- 핵심 섹션: hero, selected briefs, custom assets
- 상태 강화 예정: brief empty state

### `/brief`
- 목적: 브리프 아카이브
- 핵심 섹션: brief card grid
- 상태 강화 예정: list loading/empty/error

### `/radar`
- 목적: 오픈소스, 스킬, 플러그인, 사이트, 이벤트, 공모전 discovery 허브
- 핵심 섹션: hero, featured picks, discovery index
- 현재 상태: scaffold cards + fast action links

### `/brief/[slug]`
- 목적: 브리프 상세와 출처 확인
- 핵심 섹션: summary/body, sources
- 현재 상태: not found만 구현

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
- 목적: 운영자 개요
- 핵심 섹션: pipeline overview, queue counts, failure summary
- 현재 인증 성격: 로컬 스캐폴드 게이트, production auth 아님

### `/admin/briefs`
- 목적: 브리프 검수
- 핵심 섹션: status table
- 현재 상태: empty state 분기 구현, 실제 review mutation은 후속 작업

### `/admin/discover`
- 목적: 디스커버리 레지스트리 운영
- 핵심 섹션: registry table
- 현재 상태: scaffold table + outbound actions

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
- 핵심 섹션: publish queue
- 현재 상태: scaffold table 구현, brief / discover / video queue를 한 화면에서 보여줌

### `/admin/review`
- 목적: 예외 검수와 send-back 판단
- 핵심 섹션: source / parsed / preview 3면 레이아웃
- 현재 상태: scaffold 3면 레이아웃 구현, 실제 approve/send-back mutation은 후속 작업

### `/admin/exceptions`
- 목적: human-on-exception 큐 운영
- 핵심 섹션: exception reason, confidence, retry or hold action
- 현재 상태: scaffold table 구현, brief / discover / video 예외를 한 화면에서 보여줌

### `/admin/policies`
- 목적: review policy, source tier, publish policy 확인
- 핵심 섹션: policy summary cards and rule table
- 현재 상태: scaffold summary cards 구현, review / source tier / publish rule을 한 화면에서 참조

### `/admin/programs`
- 목적: program-style rule files 관리
- 핵심 섹션: brief/discover/publish/source policy references
- 현재 상태: scaffold reference cards 구현, program-style markdown 파일 위치와 역할을 보여줌

### `/admin/video-jobs`
- 목적: 비디오 자동화 상태 확인
- 핵심 섹션: placeholder banner, job board, CapCut handoff notes, parent review gate
- 현재 상태: scaffold board가 `auto analysis -> CapCut -> parent review -> private upload` 흐름을 반영

### `/admin/sources`
- 목적: source registry 확인
- 핵심 섹션: source rows

### `/admin/assets`
- 목적: asset slot 확인
- 핵심 섹션: slot cards
- 현재 상태: empty state 분기 구현
