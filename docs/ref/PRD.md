# VibeHub Media Hub PRD

## Product Definition
- 공개 사이트는 AI Brief 허브다.
- 공개 사이트는 `radar`를 통해 오픈소스, 스킬, 플러그인, 디자인 레퍼런스, OS, 웹사이트, 이벤트, 공모전도 큐레이션할 수 있다.
- 공개 사이트의 라우트 SSOT는 `apps/web/app/[locale]/(public)/`다.
- legacy `apps/web/app/(public)/` route group은 제거 완료다.
- `video`는 공개 콘텐츠가 아니라 `/admin` 내부 운영 기능이다.
- `showcase`는 자동 `brief/discover` 파이프라인과 분리된 수동 큐레이션 sidecar lane으로 운영한다.
- 아들 게임 영상은 `watch folder -> auto analysis -> CapCut finishing -> parent review -> private upload` 흐름으로 운영한다.
- 핵심 운영 흐름은 `수집 -> 가공 -> 초안 -> 검수 -> 배포`다.
- 공개 사용자 흐름은 `discover radar item -> inspect briefs -> submit tool or subscribe`다.
- 운영자 흐름은 `sources / inbox / classification / review / publish queue`를 따른다.
- 영상 운영 흐름은 `video-jobs / parent review / private upload queue`를 따른다.
- `Brief`와 `Discover`는 같은 ingest spine을 공유하며 동시 운영한다.
- 사람은 전수 검수가 아니라 예외만 본다.
- 기본 자동 진행 한계는 `scheduled/private publish queue`까지다.
- 로컬 LLM과 Claude 병행 사용은 허용되며, 역할 분업은 shadow 비교 후 확정한다.

## Core Routes
- `/:locale`
- `/:locale/brief`
- `/:locale/brief/[slug]`
- `/:locale/radar`
- `/:locale/radar/[id]`
- `/:locale/sources`
- `/:locale/newsletter`
- `/:locale/about`
- `/:locale/editorial-policy`
- `/:locale/team`
- `/:locale/contact`
- `/:locale/privacy`
- `/:locale/terms`
- `/admin`
- `/admin/inbox`
- `/admin/runs`
- `/admin/review`
- `/admin/briefs`
- `/admin/discover`
- `/admin/video-jobs`
- `/admin/publish`
- `/admin/exceptions`
- `/admin/policies`
- `/admin/programs`
- `/admin/sources`
- `/admin/assets`
- `/admin/showcase`
- `/admin/submissions`
- `/admin/submissions/[id]`

## Quality Rules
- 스타일은 ExpeditionHub 기반 개선형
- 아이콘 중심 구성, 과도한 AI 일러스트 금지
- 상태 UI 명확성 우선
- 이미지 영역은 모두 교체 가능한 플레이스홀더를 갖는다

## Operating Model Reference
- 전체 운영 흐름은 `docs/ref/PIPELINE-OPERATING-MODEL.md`를 기준으로 유지한다.
- 에이전트 역할과 예외 검수 규칙은 아래 문서를 함께 본다.
  - `docs/ref/AGENT-OPERATING-MODEL.md`
  - `docs/ref/REVIEW-POLICY.md`
  - `docs/ref/AUTO-PUBLISH-RULES.md`
  - `docs/ref/SOURCE-TIER-POLICY.md`
  - `docs/ref/ORCHESTRATION-EVALUATION.md`
  - `docs/ref/SOURCE-RESEARCH-METHOD.md`
  - `docs/ref/INGEST-STACK-DECISION.md`
  - `docs/ref/SOURCE-CATALOG.md`
  - `docs/ref/LLM-ORCHESTRATION-MAP.md`
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`

## Current Delivery Status
- 공개 허브 기본 화면 구현 완료
- localized public route tree 정리 완료: `[locale]/(public)` 22개 파일 (`21 tsx + 1 CLAUDE.md`)
- discovery 확장을 위한 `radar` 공개 route와 `admin/discover` 운영 route 추가
- AdSense 재심사 대응 public review window 잠금 적용: home/brief/trust/legal 중심 index 정책, `radar`/`sources`/`newsletter`는 public reachable + noindex/sitemap 제외
- `design_token` category와 design inspiration source 확장으로 radar가 디자인 레퍼런스 허브 역할도 수행
- 홈 티저 + `radar` 전시 섹션 + `/admin/showcase`로 이어지는 showcase sidecar lane foundation 추가
- admin 개요, inbox, runs, review, briefs, discover, publish, exceptions, policies, programs, video-jobs, sources, assets 화면 구현 완료
- video는 운영 기능으로만 유지되고 public navigation에는 없음
- `Brief + Discover` non-video 파이프라인은 `npm run pipeline:brief-discover`로 dry-run 실행 가능
- loading/empty/error 강화는 다음 프론트 고도화 작업 범위
