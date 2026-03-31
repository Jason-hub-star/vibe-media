---
name: doc-sync
description: git diff 기반으로 VibeHub의 ref/status/automation 문서 drift를 change class 단위로 점검하고, 어떤 문서를 어느 섹션까지 봐야 하는지 좁혀준다.
user_invocable: true
---

# Doc Sync Check

코드 변경에 따라 어떤 문서를 같이 고쳐야 하는지 점검한다.
목표는 문서를 많이 쓰게 만드는 것이 아니라, 필수 문서 누락과 잘못된 문서 선택을 줄이는 것이다.

## When To Use

- 코드 변경 후 최종 정리 직전
- route, schema, pipeline, automation, policy, sidecar, channel 변경 직후
- "PROJECT-STATUS만 고치면 되나?"가 헷갈릴 때
- 큰 작업을 끝낸 뒤 `/self-review` 전에

## Inputs

- 현재 working tree 변경사항
- staged 변경사항
- untracked 파일
- 관련 SSOT 문서
- 필요 시 `.claude/automations/README.md`, `CLAUDE.md`

## Steps

### 1. 변경 파일 수집
```bash
git diff --name-only HEAD
git diff --name-only --cached
git status --porcelain
```
위 결과를 합쳐 변경된 파일 목록을 만든다.

### 2. trivial 변경인지 먼저 걸러내기

아래에만 해당하면 보통 문서 업데이트가 불필요하다.

- 주석만 변경
- 오탈자/포맷팅만 변경
- 테스트 fixture, snapshot, 로그 파일만 변경
- generated file만 재생성

단, trivial처럼 보여도 동작/상태/경계가 바뀌었으면 trivial로 보지 않는다.

### 3. change class 분류

변경 파일을 아래 class로 묶는다. 한 변경이 여러 class에 걸칠 수 있다.

#### A. Route / surface
- 예시: `apps/web/app/**`, public/admin page, metadata, redirect, navigation
- 필수 문서:
  - `docs/ref/ROUTE-SPECS.md`
  - `docs/status/PROJECT-STATUS.md`
  - `docs/status/PROJECT-STATUS.md` (Execution Checklist 섹션 포함)
- 추가 문서:
  - public 목적/가치 변경이면 `docs/ref/PRD.md`
  - 구조 변경이면 `docs/ref/ARCHITECTURE.md`
- 섹션 힌트:
  - 해당 route 항목
  - Public/Admin 목적
  - Current status

#### B. Schema / migration
- 예시: `supabase/migrations/**`, DB write path, read projection
- 필수 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 문서:
  - 상태 전이 또는 queue semantics 변경이면 `docs/ref/PIPELINE-OPERATING-MODEL.md`
  - 경계 결정이면 `docs/status/DECISION-LOG.md`
- 섹션 힌트:
  - table/column
  - lifecycle/status field
  - validation snapshot

#### C. Pipeline / agent flow
- 예시: `apps/backend/src/workers/**`, fetch/ingest/classifier/draft/critic/publish shared code
- 필수 문서:
  - `docs/ref/PIPELINE-OPERATING-MODEL.md`
  - `docs/ref/AGENT-OPERATING-MODEL.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 문서:
  - stage shadow/promote 기준이면 `docs/ref/LLM-ORCHESTRATION-MAP.md`
  - eval/trial 기준이면 `docs/ref/ORCHESTRATION-EVALUATION.md`
  - 결과 로그 기준이면 `docs/status/ORCHESTRATION-TRIAL-LOG.md`
- 섹션 힌트:
  - Step Definitions
  - Agent handoff
  - Active Tracks / Open Follow-ups

#### D. Automation / prompt
- 예시: `.claude/automations/**`, 관련 worker, Telegram 보고 semantics
- 필수 문서:
  - `.claude/automations/README.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 문서:
  - 승인/발행 경계 변경이면 `docs/ref/AUTO-PUBLISH-RULES.md`
  - 예외 진입 변경이면 `docs/ref/REVIEW-POLICY.md`
  - 스킬/지시 체계 변경이면 `CLAUDE.md`
- companion check:
  - `npm run automation:check`
- 섹션 힌트:
  - Recommended Set
  - Execution Order
  - Current delivery status

#### E. Source / editorial policy
- 예시: source registry, dedup, quality scoring, auto-approve, source health
- 필수 문서:
  - `docs/ref/SOURCE-CATALOG.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 문서:
  - source tier 경계면 `docs/ref/SOURCE-TIER-POLICY.md`
  - hold/review entry 조건이면 `docs/ref/REVIEW-POLICY.md`
  - publish gate면 `docs/ref/AUTO-PUBLISH-RULES.md`
- 섹션 힌트:
  - source list / health rule
  - Human Review Entry Conditions
  - Auto Approve Conditions

#### F. Design / token / UX
- 예시: `packages/design-tokens/**`, CSS, presentational component, card layout, filter UX
- 필수 문서:
  - `docs/status/PROJECT-STATUS.md`
  - `docs/status/PROJECT-STATUS.md` (Execution Checklist 섹션 포함)
- 추가 문서:
  - route 목적/핵심 섹션 변화면 `docs/ref/ROUTE-SPECS.md`
- companion checks:
  - `design-sync`
  - `ui-audit`
- 섹션 힌트:
  - P2 Frontend / UX
  - 해당 route 목적/핵심 섹션

#### G. Sidecar / lane / channel
- 예시: showcase, Obsidian export, imported tools, newsletter lane, Threads/YouTube publishing
- 필수 문서:
  - `docs/ref/PIPELINE-OPERATING-MODEL.md`
  - `docs/status/PROJECT-STATUS.md`
- 추가 문서:
  - public/admin surface 생기면 `docs/ref/ROUTE-SPECS.md`
  - channel semantics면 `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`
  - DB 변경이면 `docs/ref/SCHEMA.md`
  - 기존 본선 의미를 건드리면 `docs/status/DECISION-LOG.md`
- companion checks:
  - lane 분류가 불명확하면 `plans/harnesses/sidecar-safety-harness-plan.md`
- 섹션 힌트:
  - Sidecar Lanes
  - Channel adapter stages
  - rollout/guardrail notes

### 4. 필수 문서 누락 점검

각 class에서 필요한 문서가 실제 변경 목록에 들어 있는지 확인한다.

- 포함되어 있으면 `updated`
- 변경은 없지만 현재 구현과 문서가 이미 일치하면 `not needed`
- 빠졌으면 `missing`

`missing`으로 판단할 때는 반드시 이유와 섹션 힌트를 함께 적는다.

### 5. companion skill / command 제안

문서만 볼 일이 아닐 때는 바로 관련 스킬도 붙인다.

| 상황 | 같이 제안할 것 |
| --- | --- |
| route/public/admin 변경 | `ui-audit` |
| design token/category/CSS 변경 | `design-sync` |
| pipeline/data path 변경 | `pipeline-check` |
| automation prompt 변경 | `npm run automation:check` |
| 여러 class가 동시에 걸침 | `big-task` |
| 작업 종료 직전 | `commands/self-review.md` |

### 6. 결과 보고

```
## Doc Sync Report

### Change classes
- route/surface
- automation/prompt

### Must update
| 문서 | 이유 | 상태 | 섹션 힌트 |
| --- | --- | --- | --- |
| docs/ref/ROUTE-SPECS.md | `/newsletter` 목적/핵심 섹션 변경 | missing | `/newsletter` |
| docs/status/PROJECT-STATUS.md | 사용자 동작 변화 반영 필요 | missing | Current Delivery Status |
| .claude/automations/README.md | execution order 변경 | updated | Execution Order |

### Companion checks
- ui-audit
- npm run automation:check

### Safe skips
- docs/ref/SCHEMA.md — DB 변경 없음

### Verdict
- ⚠️ Doc sync: 2 doc(s) need update
```

### 7. 판정
- 누락 0건: `✅ Doc sync: all required docs updated`
- 누락 1건 이상: `⚠️ Doc sync: N doc(s) need update`
- class 분류 자체가 애매하면:
  - `CLAUDE.md`
  - `plans/harnesses/doc-sync-harness-plan.md`
  - `plans/harnesses/sidecar-safety-harness-plan.md`
  를 함께 읽고 다시 분류한다

## 규칙
- `docs/status/*`는 구현과 충돌하면 구현을 먼저 확인하고 맞춘다
- `PROJECT-STATUS.md`는 기능/동작 변화가 있으면 거의 항상 후보에 넣는다
- `EXECUTION-CHECKLIST`는 `PROJECT-STATUS.md`에 통합됨 — 별도 파일 수정 불필요
- `DECISION-LOG.md`는 경계/원칙/상태 의미가 바뀌었을 때만 요구한다
- `ROUTE-SPECS.md`는 route 파일만이 아니라 route 목적/핵심 섹션이 바뀌어도 후보가 된다
- `PIPELINE-OPERATING-MODEL.md`는 lane, blocking semantics, step order가 바뀌면 본다
- `CHANNEL-PUBLISH-PIPELINE.md`는 채널 어댑터/미디어 publish 규칙이 바뀌면 본다
- `automation:check`는 자동화 문서와 스크립트 참조 drift를 잡는 companion check다
- 이 검사는 advisory다. 위반이 있어도 커밋을 막지는 않지만, evidence-first로 누락을 알린다
