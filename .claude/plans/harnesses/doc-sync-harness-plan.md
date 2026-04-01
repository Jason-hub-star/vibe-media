# 문서 같이 고치기 하네스 플랜

## Goal

코드 변경이 생겼을 때 어떤 문서를 같이 갱신해야 하는지 자동으로 좁혀 주는 하네스를 만든다.
목표는 "문서를 많이 쓰게 하기"가 아니라 "필수 문서 누락을 초기에 잡기"다.

## Why Now

현재 레포에는 이미 문서가 잘 분리돼 있다.

- 기준 문서: `docs/ref/*`
- 상태 문서: `docs/status/*`
- 자동화 문서: `.claude/automations/*`
- 스킬 문서: `.claude/skills/*`

하지만 현재 `doc-sync` 스킬은 규칙 밀도가 아직 낮다.

- route, schema, CSS 같은 전통적인 트리거는 잡지만
- pipeline lane, automation prompt, sidecar lane, channel publish, source catalog, locale/translation 같은 최근 확장면은 덜 촘촘하다
- 어떤 문서의 어떤 섹션을 봐야 하는지까지는 좁혀주지 못한다
- 실제 자동화 스크립트와 문서 drift는 `automation:check`가 잡지만, broader doc drift는 분산되어 있다

## Current Assets To Reuse

### Existing skills
- `.claude/skills/doc-sync/SKILL.md`
- `.claude/skills/big-task/SKILL.md`
- `.claude/commands/self-review.md`

### Existing scripts
- `scripts/check-automation-sync.mjs`

### Source documents
- `docs/ref/ROUTE-SPECS.md`
- `docs/ref/SCHEMA.md`
- `docs/ref/ARCHITECTURE.md`
- `docs/ref/PIPELINE-OPERATING-MODEL.md`
- `docs/ref/REVIEW-POLICY.md`
- `docs/ref/AUTO-PUBLISH-RULES.md`
- `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`
- `docs/ref/SOURCE-CATALOG.md`
- `docs/status/PROJECT-STATUS.md`
- `docs/status/EXECUTION-CHECKLIST.md`
- `docs/status/DECISION-LOG.md`

## Core Design

하네스는 4단계로 동작한다.

1. 변경 파일 수집
2. 변경 성격 분류
3. 문서 의무 매핑
4. 누락 및 근거 보고

## Change Classes

문서 매핑은 파일 경로보다 "변경 성격"을 기준으로 잡아야 한다.

### 1. Route / surface change
- 대상 예시: `apps/web/app/**`, public/admin page, layout, metadata, redirect
- 기본 문서:
  - `docs/ref/ROUTE-SPECS.md`
  - `docs/status/PROJECT-STATUS.md`
  - `docs/status/EXECUTION-CHECKLIST.md`
- 추가 조건:
  - 공개 surface 가치/목적이 바뀌면 `docs/ref/PRD.md`
  - 정보구조가 바뀌면 `docs/ref/ARCHITECTURE.md`

### 2. Schema / migration change
- 대상 예시: `supabase/migrations/**`, DB write path, projection read path
- 기본 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 조건:
  - lifecycle 또는 queue semantics 변경 시 `docs/ref/PIPELINE-OPERATING-MODEL.md`
  - 운영자 액션 규칙 변경 시 `docs/status/DECISION-LOG.md`

### 3. Pipeline / agent flow change
- 대상 예시: `apps/backend/src/workers/**`, `shared/*` 중 fetch/ingest/classify/draft/critic/publish
- 기본 문서:
  - `docs/ref/PIPELINE-OPERATING-MODEL.md`
  - `docs/ref/AGENT-OPERATING-MODEL.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 조건:
  - stage routing 변경이면 `docs/ref/LLM-ORCHESTRATION-MAP.md`
  - trial 기준 변경이면 `docs/ref/ORCHESTRATION-EVALUATION.md`, `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 4. Automation / prompt change
- 대상 예시: `.claude/automations/**`, 관련 worker, reporting semantics
- 기본 문서:
  - `.claude/automations/README.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 조건:
  - 자동 승인/발행 경계 변경이면 `docs/ref/AUTO-PUBLISH-RULES.md`
  - 예외 진입 조건 변경이면 `docs/ref/REVIEW-POLICY.md`
  - 스크립트/파일 참조 일치 여부는 `automation:check`

### 5. Source / editorial policy change
- 대상 예시: source registry, source tier, editorial scoring, dedup, source health
- 기본 문서:
  - `docs/ref/SOURCE-CATALOG.md`
  - `docs/ref/SOURCE-TIER-POLICY.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 조건:
  - review entry 조건 변경이면 `docs/ref/REVIEW-POLICY.md`
  - auto-hold / auto-publish 경계 변경이면 `docs/ref/AUTO-PUBLISH-RULES.md`

### 6. Design / token / UX change
- 대상 예시: `packages/design-tokens/**`, CSS, presentational components
- 기본 문서:
  - `docs/status/PROJECT-STATUS.md`
  - `docs/status/EXECUTION-CHECKLIST.md`
- 추가 조건:
  - public/admin UX 목적 변경이면 `docs/ref/ROUTE-SPECS.md`
  - token SSOT 변경이면 `design-sync` 체크 병행

### 7. Sidecar / channel lane change
- 대상 예시: showcase, imported-tools, Obsidian export, newsletter special, media publish
- 기본 문서:
  - `docs/ref/PIPELINE-OPERATING-MODEL.md`
  - `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`
  - `docs/ref/ROUTE-SPECS.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 조건:
  - 기존 본선 의미를 건드리면 `docs/status/DECISION-LOG.md` 필수

## Strengthened Output Shape

현재 `doc-sync`는 advisory 표 정도면 충분했지만, 강화판은 아래 형식을 기본으로 둔다.

```md
## Doc Sync Report

### Change classes
- route/public
- automation/publish

### Must update
| 문서 | 이유 | 상태 |
| --- | --- | --- |
| docs/ref/ROUTE-SPECS.md | `/newsletter` UX 목적 변경 | missing |
| docs/ref/AUTO-PUBLISH-RULES.md | publish 조건 변경 | updated |

### Section hints
- ROUTE-SPECS: `/newsletter`
- AUTO-PUBLISH-RULES: Auto Queue Conditions, Human Escalation Conditions

### Evidence
- changed files: ...
- related worker: ...
```

핵심은 문서 이름만 말하는 게 아니라 "어느 섹션을 볼지"까지 줄이는 것이다.

## Implementation Plan

### Phase 1 — Skill hardening
- `.claude/skills/doc-sync/SKILL.md`를 현재 VibeHub 구조 기준으로 재작성
- route/schema/pipeline/automation/source/sidecar/channel 분류표 추가
- `FRONTEND-HANDOFF`에 치우친 옛 규칙은 현재 문서 구조 기준으로 축소 또는 교체

### Phase 2 — Rule registry
- 추후 `.claude/doc-rules/` 같은 규칙 인덱스를 둬도 좋다
- 포맷은 markdown table 또는 json 중 단순한 쪽
- 목적은 스킬 본문을 짧게 하고 규칙을 데이터처럼 유지하는 것

### Phase 3 — Runnable check
- `npm run docs:check` 같은 얇은 실행 엔트리 추가 검토
- 입력: git diff
- 출력: missing docs report
- CI 강제는 아직 보류, 로컬 advisory부터

### Phase 4 — Self-review integration
- `/self-review`의 문서 정합성 섹션이 이 하네스 결과를 읽도록 연결
- `big-task` final phase에서 자동 호출

## Validation Scenarios

1. public route 추가
- 기대: `ROUTE-SPECS`, `PROJECT-STATUS`, `EXECUTION-CHECKLIST` 요구

2. Supabase migration 추가
- 기대: `SCHEMA`, `PROJECT-STATUS` 요구

3. auto-publish 규칙 변경
- 기대: `.claude/automations/README`, `AUTO-PUBLISH-RULES`, `PROJECT-STATUS` 요구

4. sidecar export 범위 변경
- 기대: `PIPELINE-OPERATING-MODEL`, `ROUTE-SPECS` 또는 `CHANNEL-PUBLISH-PIPELINE`, `PROJECT-STATUS` 요구

## Success Metrics

- route/schema 변경 후 문서 누락 경고의 적중률
- `PROJECT-STATUS`와 실제 구현 drift 감소
- PR/작업 종료 시 "어떤 문서 고쳐야 하지?" 질문 감소

## Non-Goals

- trivial formatting 변경까지 문서 수정 강제하지 않는다
- 사람이 반드시 모든 관련 문서를 수정하게 막는 enforcement는 아직 하지 않는다
- 문서 작성 자체를 자동 생성으로 대체하지 않는다

## Recommended First Cut

가장 먼저 할 일은 새 스크립트보다 `doc-sync` 스킬 규칙표를 현재 구조에 맞게 다시 쓰는 것이다.
이 단계만으로도 실사용 가치가 바로 생긴다.
