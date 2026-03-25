# VibeHub Media Orchestration Index

이 레포는 VibeHub Media Hub의 문서, 프론트엔드, 백엔드 골격을 함께 관리한다.

## Loading Order
1. `CLAUDE.md`
2. `docs/ref/PRD.md`
3. `docs/ref/SCHEMA.md`
4. `docs/ref/ARCHITECTURE.md`
5. `docs/ref/ASSET-GUIDE.md`
6. `docs/ref/DISCOVERY-TAXONOMY.md`
7. `docs/ref/PIPELINE-OPERATING-MODEL.md`
8. `docs/ref/AGENT-OPERATING-MODEL.md`
9. `docs/ref/REVIEW-POLICY.md`
10. `docs/ref/AUTO-PUBLISH-RULES.md`
11. `docs/ref/SOURCE-TIER-POLICY.md`
12. `docs/ref/ORCHESTRATION-EVALUATION.md`
13. `docs/ref/SOURCE-RESEARCH-METHOD.md`
14. `docs/ref/INGEST-STACK-DECISION.md`
15. `docs/ref/SOURCE-CATALOG.md`
16. `docs/ref/LLM-ORCHESTRATION-MAP.md`
17. `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
18. `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`
19. `docs/ref/VIDEO-PIPELINE.md`
20. `docs/ref/VIDEO-WORKER-CONTRACT.md`
21. `docs/ref/STITCH-WORKFLOW.md`
22. `docs/ref/SOURCE-EXPANSION-STRATEGY.md`
23. `docs/ref/ROUTE-SPECS.md`
24. `docs/status/PROJECT-STATUS.md`
25. `docs/status/EXECUTION-CHECKLIST.md`
26. `docs/status/DECISION-LOG.md`
27. `docs/status/ORCHESTRATION-TRIAL-LOG.md`

## Execution Rules
1. 추측하지 말고 실제 파일과 비교하며 작업한다.
2. 중요한 도구 호출이나 상태 변경 전 한 줄 목적을 먼저 밝힌다.
3. 도구 호출 또는 코드 수정 직후 1-2줄 검증한다.
4. 절대경로는 문서/응답에 쓰지 않는다.
5. 스크린샷과 생성 HTML 원본은 영구 보존하지 않는다.
6. 테스트는 필수이며 `lint`, `typecheck`, `build`, 관련 단위 테스트를 우선 실행한다.
7. 파일이 300줄에 가까워지면 분리 검토, 400줄 전에는 사용자에게 알린다.

## Post-Implementation Doc Sync
코드 수정이 완료되면 반드시 다음 문서 동기화를 수행한다. 커밋 전에 완료해야 한다.

### 자동 체크리스트
1. **`docs/status/PROJECT-STATUS.md`** — Active Tracks/Open Follow-ups에 변경 요약 추가
2. **`docs/status/EXECUTION-CHECKLIST.md`** — 해당 체크 항목 상태 업데이트 (`[ ]` → `[x]`)
3. **`docs/status/DECISION-LOG.md`** — 설계 결정이 포함된 변경이면 새 항목 추가
4. **`docs/status/FRONTEND-HANDOFF.md`** — 프론트엔드 토큰/CSS/컴포넌트 변경 시 §2(토큰 표)와 §6(마일스톤) 동기화
5. **`docs/ref/ROUTE-SPECS.md`** — route 추가/변경 시 동기화
6. **`docs/ref/SCHEMA.md`** — DB 스키마 변경 시 동기화

### 트리거 조건
| 변경 유형 | 반드시 업데이트할 문서 |
|-----------|----------------------|
| CSS/디자인 토큰 | FRONTEND-HANDOFF, PROJECT-STATUS |
| 새 route 추가 | ROUTE-SPECS, PROJECT-STATUS, EXECUTION-CHECKLIST |
| DB 스키마 변경 | SCHEMA, PROJECT-STATUS |
| 설계 결정 | DECISION-LOG |
| 기능 구현 완료 | PROJECT-STATUS, EXECUTION-CHECKLIST |
| 버그 수정 | PROJECT-STATUS (Open Follow-ups에서 제거) |

## Local Runtime Prerequisites
- `vibehub-media` 검증에는 Node 런타임이 필요하다.
- 검증 전 최소 확인 항목:
  - `node` 실행 가능
  - `npm` 또는 팀이 채택한 패키지 매니저 실행 가능
  - 루트 workspace 스크립트 실행 가능
- `apps/web` typecheck는 Next 16 공식 흐름에 맞춰 `next typegen` 이후 `tsc --noEmit`로 실행한다.

## Workspace Roles
- `apps/web`: Claude 우선 프론트엔드 구현
- `apps/backend`: Codex 우선 백엔드 골격 및 후속 구현
- `packages/content-contracts`, `packages/design-tokens`, `packages/ui-patterns`: 프론트/백엔드 공용 계약과 토큰
- `packages/media-engine`: 도메인 무관 미디어 엔진 (Kie.ai, Gemini, Sharp, Remotion spawn, Supabase Storage)
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
- `docs/ref/SOURCE-EXPANSION-STRATEGY.md`
- `docs/ref/ROUTE-SPECS.md`
- `docs/status/EXECUTION-CHECKLIST.md`
- `docs/status/PAGE-UPGRADE-BOARD.md`
- `docs/status/DECISION-LOG.md`
- `docs/status/ORCHESTRATION-TRIAL-LOG.md`
