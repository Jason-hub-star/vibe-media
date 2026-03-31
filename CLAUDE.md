# VibeHub Media Orchestration Index

이 레포는 VibeHub Media Hub의 문서, 프론트엔드, 백엔드, `.claude` 운영 자산을 함께 관리한다.
이 문서는 진입점 인덱스이며, 세부 규칙은 각 SSOT와 `.claude` 하위 문서를 따른다.

## Loading Order

### Tier 1: Always Read (매 세션 필수)
1. `CLAUDE.md`
2. `docs/status/PROJECT-STATUS.md`
3. `docs/ref/ARCHITECTURE.md`

### Tier 2: On-Demand (해당 영역 작업 시)
4. `docs/ref/SCHEMA.md`
5. `docs/ref/ROUTE-SPECS.md`
6. `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`
7. `docs/ref/PIPELINE-OPERATING-MODEL.md`
8. `docs/ref/ASSET-GUIDE.md`
9. `docs/ref/VIDEO-PIPELINE.md`
10. `docs/ref/PRD.md`

### Tier 3: Reference (필요 시 검색)
- `docs/ref/DISCOVERY-TAXONOMY.md`
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
- `docs/ref/VIDEO-WORKER-CONTRACT.md`
- `docs/ref/STITCH-WORKFLOW.md`
- `docs/ref/SEO-COMMERCIALIZATION-AUDIT.md`
- `docs/ref/SOURCE-EXPANSION-STRATEGY.md`
- `docs/status/DECISION-LOG.md`
- `docs/status/ORCHESTRATION-TRIAL-LOG.md`
- `docs/status/PAGE-UPGRADE-BOARD.md`
- `docs/status/PIPELINE-DIAGRAM.md`
- `docs/status/SELF-CRITIQUE-LOG.md`

## Doc Update Principle
- **정본 1곳 원칙**: 하나의 사실은 한 문서에만 기록한다. 나머지는 링크로 참조.
- 코드 변경 시 필수 갱신: `PROJECT-STATUS.md` (상태 반영) + 해당 Tier 2 문서 (있으면)
- 결정 변경 시: `DECISION-LOG.md`에 기록, resolved되면 archive로 이동
- EXECUTION-CHECKLIST는 PROJECT-STATUS.md에 통합됨

## Execution Rules
1. 추측하지 말고 실제 파일과 비교하며 작업한다.
2. 중요한 도구 호출이나 상태 변경 전 한 줄 목적을 먼저 밝힌다.
3. 도구 호출 또는 코드 수정 직후 1-2줄 검증한다.
4. 절대경로는 문서/응답에 쓰지 않는다.
5. 스크린샷과 생성 HTML 원본은 영구 보존하지 않는다.
6. 테스트는 필수이며 `lint`, `typecheck`, `build`, 관련 단위 테스트를 우선 실행한다.
7. 파일이 300줄에 가까워지면 분리 검토, 400줄 전에는 사용자에게 알린다.

## `.claude` Complete Index

`.claude`는 실행 규칙 자체의 SSOT가 아니라, VibeHub 운영을 보조하는 자동화·스킬·커맨드·계획 문서 모음이다.
문서/코드와 충돌하면 구현과 `docs/ref`, `docs/status`를 먼저 확인한다.

### Automations
- `README.md` — 자동화 팩 인덱스와 daily execution order
- `HANDOFF.md` — 현재 운영 handoff
- `HANDOFF-TEMPLATE.md` — 새 handoff 작성 템플릿
- `daily-pipeline.md` — fetch -> ingest -> sync -> obsidian export
- `daily-dedup-guard.md` — brief 중복 감지
- `daily-editorial-review.md` — draft brief 가공 + review 전달 + auto-approve 연계
- `daily-drift-guard.md` — 파이프라인/오케스트레이션 회귀 감시
- `daily-auto-publish.md` — approved brief/discover publish 전환
- `daily-media-publish.md` — 채널 미디어 생성 및 배포 후속
- `weekly-source-health.md` — 소스 건강성 점검 + 신규 후보 탐색
- `weekly-ingest-research.md` — parser/source/tool 조사
- `weekly-autoresearch-loop.md` — 작은 keep/discard 실험 루프
- `weekly-self-critique.md` — 발행 brief 회고 및 개선 제안
- `weekly-seo-audit.md` — 공개 사이트 SEO 건강성 주간 점검
- `youtube-link-intake.md` — YouTube URL을 brief에 수동 연결

### Skills
- `skills/doc-sync/SKILL.md` — 코드 변경에 필요한 문서 동기화 점검
- `skills/pipeline-check/SKILL.md` — live fetch -> ingest -> sync -> UI 검증
- `skills/design-sync/SKILL.md` — content-contracts -> design-tokens -> CSS 정합성 점검
- `skills/ui-audit/SKILL.md` — admin/public overflow, 가독성, 반응성 점검
- `skills/big-task/SKILL.md` — 대규모 작업 플랜 및 마일스톤 오케스트레이션
- `skills/vibehub-youtube-link-intake/SKILL.md` — Telegram/CLI 기반 YouTube 링크 intake
- `skills/media-publish/prompt.md` — 미디어 발행 프롬프트
- `skills/shorts-render/prompt.md` — Shorts 렌더 프롬프트
- `skills/screenshot-check/SKILL.md` — Playwright 기반 시각 점검

### Commands
- `commands/doc-update.md` — 코드 변경 후 문서 자동 갱신 (`/doc-update`)
- `commands/self-review.md` — 현재 변경사항 자기 리뷰
- `commands/seo-check.md` — route별 SEO 점검
- `commands/token-lint.md` — CSS/token 하드코딩 탐지

### Harness Plans
- `plans/harnesses/README.md` — 하네스 계획 인덱스
- `plans/harnesses/doc-sync-harness-plan.md` — 문서 같이 고치기 하네스 설계
- `plans/harnesses/obsidian-curation-harness-plan.md` — Radar triage 및 환원 설계
- `plans/harnesses/editorial-retrospective-harness-plan.md` — 발행 후 회고 루프 설계
- `plans/harnesses/sidecar-safety-harness-plan.md` — 새 기능 lane preflight 설계

### Infra / Local Helpers
- `settings.json` — Claude 로컬 설정
- `hooks/frontend-screenshot-check.sh` — 프론트엔드 시각 점검 훅
- `worktrees/` — 실험용 worktree 보관소, SSOT 아님

## When To Read Which `.claude` Entry

- 문서 누락이 걱정되면 `skills/doc-sync/SKILL.md`
- 파이프라인 end-to-end 확인이 필요하면 `skills/pipeline-check/SKILL.md`
- design token/category 변경이면 `skills/design-sync/SKILL.md`
- UI 변경이면 `skills/ui-audit/SKILL.md`
- 큰 작업이면 `skills/big-task/SKILL.md`
- 새 기능이 본선인지 sidecar인지 헷갈리면 `plans/harnesses/sidecar-safety-harness-plan.md`
- Obsidian Radar를 실제 개선 과제로 환원하려면 `plans/harnesses/obsidian-curation-harness-plan.md`
- 발행 결과를 다음 prompt/policy 개선으로 잇고 싶으면 `plans/harnesses/editorial-retrospective-harness-plan.md`

## Post-Implementation Doc Sync
코드 수정이 끝나면 문서를 감으로 고치지 말고 먼저 `skills/doc-sync/SKILL.md` 기준으로 필요한 문서를 좁힌다.

### 기본 순서
1. 변경 파일 범위를 확인한다.
2. `/doc-sync` 기준으로 change class를 분류한다.
3. 필수 문서만 골라 업데이트한다.
4. 구현과 문서가 충돌하면 구현을 먼저 확인하고 `docs/status/*`부터 맞춘다.
5. 경계 결정이 바뀌었으면 `DECISION-LOG`를 남긴다.

### 기본 문서 세트
- `docs/status/PROJECT-STATUS.md`
- `docs/status/EXECUTION-CHECKLIST.md`
- `docs/status/DECISION-LOG.md`
- `docs/ref/ROUTE-SPECS.md`
- `docs/ref/SCHEMA.md`
- `docs/ref/PIPELINE-OPERATING-MODEL.md`
- `docs/ref/AUTO-PUBLISH-RULES.md`
- `docs/ref/REVIEW-POLICY.md`
- `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`

### Lane / automation 변경 시 참고
- 문서 동기화 규칙 강화안: `plans/harnesses/doc-sync-harness-plan.md`
- lane 분류가 불명확할 때: `plans/harnesses/sidecar-safety-harness-plan.md`

## Local Runtime Prerequisites
- `vibehub-media` 검증에는 Node 런타임이 필요하다.
- 검증 전 최소 확인 항목:
  - `node` 실행 가능
  - `npm` 또는 팀이 채택한 패키지 매니저 실행 가능
  - 루트 workspace 스크립트 실행 가능
- `apps/web` typecheck는 Next 16 공식 흐름에 맞춰 `next typegen` 이후 `tsc --noEmit`로 실행한다.

## Workspace Roles
- `apps/web`: Codex 우선 프론트엔드 구현
- `apps/backend`: Codex 우선 백엔드 골격 및 후속 구현
- `packages/*`: 프론트/백엔드 공용 계약과 토큰
- `docs/*`: SSOT와 증빙 문서
- `tools/stitch`: Stitch 시안 생성 워크플로

## Current Build Reality
- 공개 IA와 admin IA 기본 골격은 구현 완료
- `radar` 공개 route와 `admin/discover` 운영 route가 discovery 확장면으로 추가됨
- 검증 전에는 로컬 JS 런타임 전제부터 확인해야 하며, `apps/web` typecheck는 `next typegen` 선행이 필요함
- 일부 페이지는 현재 happy-path 중심이며 `loading/empty/error`는 다음 프론트 작업 웨이브에서 강화 예정
- 문서의 상태와 구현 상태가 충돌하면 구현을 확인하고 `docs/status/*`를 먼저 동기화한다

## Source Of Truth
- `docs/ref/PRD.md`
- `docs/ref/SCHEMA.md`
- `docs/ref/ARCHITECTURE.md`
- `docs/ref/ASSET-GUIDE.md`
- `docs/ref/DISCOVERY-TAXONOMY.md`
- `docs/ref/PIPELINE-OPERATING-MODEL.md`
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
- `docs/ref/VIDEO-PIPELINE.md`
- `docs/ref/VIDEO-WORKER-CONTRACT.md`
- `docs/ref/STITCH-WORKFLOW.md`
- `docs/ref/ROUTE-SPECS.md`
- `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`
- `docs/ref/SEO-COMMERCIALIZATION-AUDIT.md`
- `docs/ref/SOURCE-EXPANSION-STRATEGY.md`
- `docs/status/PROJECT-STATUS.md`
- `docs/status/EXECUTION-CHECKLIST.md`
- `docs/status/PAGE-UPGRADE-BOARD.md`
- `docs/status/DECISION-LOG.md`
- `docs/status/ORCHESTRATION-TRIAL-LOG.md`
- `docs/status/PIPELINE-DIAGRAM.md`
- `docs/status/SELF-CRITIQUE-LOG.md`
