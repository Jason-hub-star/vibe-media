# 새 기능 안전하게 붙이기 하네스 플랜

## Goal

새 기능이 들어올 때 그것이 본선 파이프라인인지, sidecar lane인지, 채널 어댑터인지 먼저 판정하고 안전한 연결 방식을 정리해 주는 하네스를 만든다.
핵심은 "기능을 빨리 붙이는 것"보다 "붙인 뒤 본선 의미가 안 꼬이게 하는 것"이다.

## Why Now

VibeHub는 이미 여러 레인을 함께 운영 중이다.

- 본선: fetch -> ingest -> draft -> review -> publish
- sidecar: Obsidian export, showcase, imported tools
- channel: Threads, YouTube, newsletter, future Ghost/Tistory

현재 `PIPELINE-OPERATING-MODEL.md`에는 sidecar 개념이 있고, `run-daily-pipeline.ts`도 sidecar 단계를 `blocking: false`로 분리하고 있다.
하지만 새 기능이 들어올 때마다 매번 "이건 본선이야 sidecar야?"를 다시 판단해야 한다.

## Current Assets To Reuse

### Existing docs
- `docs/ref/PIPELINE-OPERATING-MODEL.md`
- `docs/ref/ROUTE-SPECS.md`
- `docs/ref/ARCHITECTURE.md`
- `docs/ref/SCHEMA.md`
- `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`
- `docs/status/PROJECT-STATUS.md`
- `docs/status/EXECUTION-CHECKLIST.md`
- `docs/status/DECISION-LOG.md`

### Existing skills
- `.claude/skills/big-task/SKILL.md`
- `.claude/skills/doc-sync/SKILL.md`
- `.claude/skills/design-sync/SKILL.md`
- `.claude/skills/ui-audit/SKILL.md`
- `.claude/skills/pipeline-check/SKILL.md`

### Existing pattern source
- Obsidian template `Sidecar Lane Plan Template`

## Core Question Set

새 기능을 붙이기 전에 반드시 아래 7개를 답한다.

1. 이 기능은 본선인가, sidecar인가, channel adapter인가
2. 어떤 기존 상태값이나 queue 의미를 재사용하는가
3. 실패했을 때 본선 진행을 막아야 하는가
4. 사람이 소유하는 판단은 어디에 남는가
5. public/admin route가 새로 필요한가
6. DB에 새 테이블/컬럼이 필요한가
7. 문서 기준은 무엇이 바뀌는가

## Lane Classification

### Mainline
- 본선 산출물의 의미를 직접 바꾼다
- 상태 모델, queue, review semantics에 영향을 준다
- 예시:
  - classifier/draft/critic/publish 규칙 변경
  - core editorial lifecycle 변경

### Sidecar
- 본선 산출물을 읽어 추가 저장/노출만 한다
- 실패해도 본선 의미를 바꾸지 않는다
- 예시:
  - Obsidian export
  - showcase
  - imported candidate registry

### Channel adapter
- 공통 draft를 채널별 포맷으로 변환한다
- 본문 생성과 채널 발행을 분리한다
- 예시:
  - Threads
  - YouTube
  - newsletter
  - future Ghost

## Boundary Rules

### Rule 1
sidecar는 기존 `target_surface` 의미를 바꾸지 않는다.

### Rule 2
sidecar 실패는 본선 ingest/sync/publish meaning failure로 승격하지 않는다.

### Rule 3
manual curation lane은 auto-generated core queue와 섞지 않는다.

### Rule 4
channel adapter는 content generation 규칙을 소유하지 않는다.

### Rule 5
새 route나 상태 모델이 생기면 문서가 먼저 따라와야 한다.

## Preflight Template

하네스는 새 기능 제안마다 아래 형식을 채우게 해야 한다.

```md
## Feature Preflight

- feature:
- lane type: mainline | sidecar | channel
- owner state:
- input:
- output:
- blocking behavior:
- human checkpoint:
- docs to update:
- validation:
```

## Decision Matrix

### 본선으로 가야 하는 경우
- 기존 review/publish 상태를 직접 바꾼다
- 예외 진입 조건을 바꾼다
- core queue를 재정의한다

### sidecar로 가야 하는 경우
- 기존 row를 읽어 외부 저장/보조 노출만 한다
- 장애가 나도 본선 상태값은 그대로여야 한다
- 수동 큐레이션 책임이 분리돼 있다

### channel adapter로 가야 하는 경우
- 같은 brief/discover를 다른 채널 문법으로 변환한다
- publish 결과 저장은 별도 메타데이터여야 한다
- 채널 실패가 본문 품질 실패와 혼동되면 안 된다

## Required Skill Stack By Case

### mainline feature
- `big-task`
- `doc-sync`
- 필요 시 `pipeline-check`

### sidecar feature
- `big-task`
- `doc-sync`
- public/admin UI가 있으면 `ui-audit`

### design-heavy sidecar
- `design-sync`
- `ui-audit`
- `doc-sync`

### pipeline-touching feature
- `pipeline-check`
- `doc-sync`
- 필요 시 `big-task`

## Validation Matrix

### 본선 불변성
- 새 기능이 없을 때와 있을 때 core fetch/ingest/sync/publish 의미가 같은가

### Failure isolation
- sidecar 또는 channel 실패가 core state를 오염시키지 않는가

### Queue clarity
- 수동 큐와 자동 큐가 섞이지 않는가

### Route clarity
- public/admin 목적이 `ROUTE-SPECS`와 일치하는가

### State integrity
- 승인/예약/발행 수동 상태를 자동 sync가 덮어쓰지 않는가

## Document Obligations

### Always
- `docs/status/PROJECT-STATUS.md`

### If route changes
- `docs/ref/ROUTE-SPECS.md`

### If DB changes
- `docs/ref/SCHEMA.md`

### If lane semantics change
- `docs/ref/PIPELINE-OPERATING-MODEL.md`
- 필요 시 `docs/ref/ARCHITECTURE.md`

### If publish/channel changes
- `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`

### If decision boundary changes
- `docs/status/DECISION-LOG.md`

## Implementation Plan

### Phase 1 — Plan-only harness
- `.claude/plans/harnesses/sidecar-safety-harness-plan.md`를 기준 문서로 사용
- 새 기능 논의 시 이 preflight를 먼저 채운다

### Phase 2 — Reusable command or prompt
- 나중에 `.claude/commands/feature-preflight.md` 형태로 승격 검토
- 입력은 기능 설명 1개
- 출력은 lane type, docs, validation, risk

### Phase 3 — Big-task integration
- `big-task` 시작 전에 "lane classification"을 1단계로 강제
- 대규모 작업일수록 먼저 본선/sidecar/channel 판정을 하게 한다

## Success Metrics

- 새 기능 도입 후 queue/state 오염 사고 감소
- 문서 없는 route/schema 변경 감소
- sidecar failure가 본선 장애로 오판되는 사례 감소
- 기능 제안 단계에서 설계 경계가 더 빨리 선명해짐

## Non-Goals

- 기능 개발을 느리게 만드는 승인 절차를 만들지 않는다
- 모든 작은 UI tweak까지 preflight를 강제하지 않는다
- sidecar를 "덜 중요한 것"으로 취급하지 않는다

## Recommended First Cut

가장 먼저 할 일은 새 기능 아이디어를 받았을 때 "무조건 preflight 7문항을 먼저 채운다"는 운영 습관을 만드는 것이다.
이 한 단계만 있어도 VibeHub 본선과 sidecar lane의 경계가 훨씬 덜 흔들린다.
