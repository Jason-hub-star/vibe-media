# 옵시디언 정리 하네스 플랜

## Goal

Obsidian Radar에 저장된 노트를 단순 보관에서 끝내지 않고, VibeHub 개선 작업으로 환원하는 운영 하네스를 만든다.
핵심은 "더 많이 저장"이 아니라 "저장된 것 중 무엇을 실제로 쓸지 좁혀주는 것"이다.

## Why Now

현재 구조는 export까지는 잘 되어 있다.

- `daily-pipeline`이 `obsidian-export`를 sidecar step으로 실행
- `run-obsidian-discover-export.ts`가 요약과 폴더 카운트를 보고
- `obsidian-discover-export.ts`가 `AUTO-GENERATED`와 `MANUAL-NOTES`를 분리해 보존
- `PIPELINE-OPERATING-MODEL.md`가 Obsidian export를 sidecar lane으로 명시

문제는 export 이후다.

- 저장된 Radar 노트가 source 후보, prompt 개선, UI 참고, discard 중 어디로 갈지 후속 분류가 없다
- 가치가 낮은 노트와 운영에 바로 도움이 되는 노트가 같은 레벨에 쌓인다
- `weekly-source-health`와 `weekly-ingest-research`가 있어도 Obsidian에 저장된 레이더가 거기로 환원되는 고리가 약하다

## Current Assets To Reuse

### Existing skills
- `.claude/skills/pipeline-check/SKILL.md`
- `.claude/skills/design-sync/SKILL.md`
- `.claude/skills/ui-audit/SKILL.md`
- `.claude/skills/big-task/SKILL.md`
- `.claude/skills/doc-sync/SKILL.md`

### Existing automations
- `.claude/automations/daily-pipeline.md`
- `.claude/automations/weekly-source-health.md`
- `.claude/automations/weekly-ingest-research.md`
- `.claude/automations/weekly-autoresearch-loop.md`

### Existing code / docs
- `apps/backend/src/shared/obsidian-discover-export.ts`
- `docs/ref/PIPELINE-OPERATING-MODEL.md`
- `docs/ref/SOURCE-CATALOG.md`
- `docs/status/PROJECT-STATUS.md`

## Core Design

이 하네스는 "export 후 triage"를 담당한다.

1. 새로 생성/갱신된 Radar 노트 수집
2. 운영 가치 기준으로 분류
3. 제안 대상 문서나 큐로 연결
4. 아무 데도 가지 않을 노트는 명시적으로 보류

## Triage Buckets

모든 Radar 노트를 아래 5개 바구니 중 하나로 보낸다.

### 1. Source candidate
- 의미: 실제 `sources` 후보가 될 수 있는 사이트나 피드
- 연결 대상:
  - `weekly-source-health`
  - `docs/ref/SOURCE-CATALOG.md`
- 예시:
  - 공식 블로그
  - release feed
  - 안정적 RSS/API

### 2. Prompt / few-shot candidate
- 의미: editorial-review, critic, categorization에 참고할 만한 표현 패턴
- 연결 대상:
  - `.claude/automations/daily-editorial-review.md`
  - `weekly-self-critique`
  - 향후 prompt reference log
- 예시:
  - 훌륭한 설명 구조
  - 좋은 title/summary framing

### 3. Design / UI reference
- 의미: public/admin surface 개선에 참고할 디자인 패턴
- 연결 대상:
  - `ui-audit`
  - `design-sync`
  - route-specific design decision 작업
- 예시:
  - 정보 밀도 배치
  - CTA 구조
  - accessibility pattern

### 4. Product / lane candidate
- 의미: 새 sidecar lane, channel adapter, submission flow 아이디어
- 연결 대상:
  - sidecar safety harness
  - `docs/ref/ROUTE-SPECS.md`
  - `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`

### 5. No action / archive
- 의미: 저장 가치는 있지만 현재 운영 과제로 환원하지 않음
- 규칙:
  - 그냥 쌓아두는 것이 아니라 "지금 안 씀"을 명시

## Required Metadata

기존 노트 frontmatter를 유지하되, triage 단계에서는 아래 필드를 별도 보고에 담는 것이 좋다.

- `bucket`
- `confidence`
- `why now`
- `candidate destination`
- `next action`
- `expiry or revisit`

이 정보는 노트 원문에 바로 쓰기보다, 처음에는 별도 triage 보고서에 적는 편이 안전하다.
이유는 export note는 sidecar 산출물이고, 운영 판단은 또 다른 층이기 때문이다.

## Strengthened Workflow

### Phase A — Weekly triage
- 지난 7일간 생성/수정된 Radar 노트만 읽는다
- 노트 전체가 아니라 title, summary, tags, folder, manual notes를 먼저 본다
- 필요한 경우에만 원문 URL을 연다

### Phase B — Bucket assignment
- 노트마다 1개 primary bucket만 준다
- 복수로 걸치더라도 "이번 주에 실제로 쓸 한 가지"를 우선한다

### Phase C — Operational output
- source candidate는 `weekly-source-health`의 후보 섹션으로
- prompt candidate는 editorial retrospective 제안 항목으로
- design reference는 UI task backlog 또는 design decision 초안으로
- product/lane candidate는 sidecar safety preflight 대상으로 보낸다

### Phase D — Review loop
- 채택된 후보와 미채택 후보를 다음 주에 다시 비교한다
- 같은 아이디어가 3주 연속 미채택이면 archive로 내린다

## Guardrails

- `MANUAL-NOTES`는 절대 덮어쓰지 않는다
- 자동으로 새 source를 등록하지 않는다
- 자동으로 prompt를 교체하지 않는다
- 단순히 흥미로운 노트라는 이유로 운영 백로그를 오염시키지 않는다
- sidecar export 실패와 triage 실패는 본선 파이프라인 실패로 취급하지 않는다

## Skill Integration

### `pipeline-check`
- export가 정상 생성되는지 확인할 때 사용
- triage 전에 sidecar 입력이 유효한지 검증

### `design-sync`
- design/UI reference가 실제 토큰 변경으로 이어질 때 사용

### `ui-audit`
- design reference를 실제 화면 개선 후보로 좁힌 뒤 검증에 사용

### `doc-sync`
- triage 결과가 `SOURCE-CATALOG`, `ROUTE-SPECS`, `PROJECT-STATUS` 수정으로 이어질 때 사용

### `big-task`
- triage 결과가 여러 파일/여러 lane 변경으로 커질 때 사용

## Implementation Plan

### Phase 1 — Report-only harness
- 새 자동화보다 먼저 운영 문서 형태로 만든다
- 출력만 정한다:
  - 새 노트 N개
  - source 후보 N개
  - prompt 후보 N개
  - design 후보 N개
  - no action N개

### Phase 2 — Weekly automation prompt
- `.claude/automations/weekly-obsidian-curation.md` 같은 프롬프트 후보 검토
- 이 단계에서도 자동 반영은 금지, 제안만 생성

### Phase 3 — Downstream hooks
- source candidate는 `weekly-source-health`
- prompt candidate는 `weekly-self-critique`
- design reference는 UI task backlog
- lane candidate는 sidecar safety harness

## Suggested Output Shape

```md
## Weekly Obsidian Curation

### Intake
- created: N
- updated: N

### Source candidates
- ...

### Prompt candidates
- ...

### Design references
- ...

### Lane candidates
- ...

### No action
- ...
```

## Success Metrics

- Radar 노트 중 실제 운영 액션으로 이어지는 비율
- 신규 source 후보 발굴의 품질
- editorial prompt 개선 제안에 쓰인 노트 수
- UI 개선 근거로 연결된 레퍼런스 수

## Non-Goals

- Obsidian 전체를 다시 설계하지 않는다
- 모든 레이더 노트에 triage 메타데이터를 강제하지 않는다
- 노트 저장 자체를 더 복잡하게 만들지 않는다

## Recommended First Cut

가장 먼저 할 일은 주간 triage 보고 형식 하나를 고정하는 것이다.
노트를 자동 수정하는 것보다 "이번 주에 실제로 쓸 후보 3개만 뽑는다"가 더 중요하다.
