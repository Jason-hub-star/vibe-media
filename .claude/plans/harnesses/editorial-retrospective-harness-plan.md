# 발행 후 회고 하네스 플랜

## Goal

발행된 brief와 자동 보류/실패 사례를 함께 회고해, editorial prompt와 review rule을 더 좋아지게 만드는 하네스를 만든다.
핵심은 "이번 주 결과를 보고 다음 주의 자동화를 조금 더 똑똑하게 만드는 것"이다.

## Why Now

현재 VibeHub에는 이미 좋은 재료가 있다.

- `weekly-self-critique` 자동화
- `daily-editorial-review` 자동 가공 프롬프트
- `AUTO-PUBLISH-RULES`와 `REVIEW-POLICY`
- quality score, dedup, source health, auto-approve hold 규칙

하지만 현재 회고 루프는 아직 분산돼 있다.

- 발행 브리프의 질적 회고는 있으나, hold/fail/exception 데이터와 함께 보지 않는다
- prompt 수정 제안은 있지만 운영 우선순위가 약하다
- 어떤 제안이 실제 적용됐는지, 적용 후 좋아졌는지 추적하는 구조가 약하다
- 미래의 채널 피드백은 설계돼 있지만 현재는 콘텐츠 자체 평가와 운영 지표를 묶는 편이 더 현실적이다

## Current Assets To Reuse

### Existing automations
- `.claude/automations/weekly-self-critique.md`
- `.claude/automations/daily-editorial-review.md`
- `.claude/automations/daily-auto-publish.md`
- `.claude/automations/daily-dedup-guard.md`

### Existing rules
- `docs/ref/REVIEW-POLICY.md`
- `docs/ref/AUTO-PUBLISH-RULES.md`
- `docs/ref/PIPELINE-OPERATING-MODEL.md`
- `docs/status/PROJECT-STATUS.md`

### Existing skills
- `.claude/skills/doc-sync/SKILL.md`
- `.claude/skills/big-task/SKILL.md`

현재 스킬 셋에는 이 하네스를 바로 소유하는 전용 스킬이 없다.
즉, 이 하네스는 existing automation을 더 운영 친화적으로 연결하는 역할이다.

## Core Design

이 하네스는 발행물만 보는 회고가 아니라, 아래 4개 집단을 같이 본다.

1. published brief
2. auto-approved brief
3. hold / pending brief
4. quality fail / duplicate flagged / exception escalated brief

## Review Axes

### A. Content quality
- 제목 명확성
- 제목 흡입력
- 요약 밀도
- 본문 깊이
- 톤 일관성

현재 `weekly-self-critique`의 5개 축을 유지하되, 점수보다 패턴 발견에 더 무게를 둔다.

### B. Operational quality
- auto-approve hold 사유 반복 여부
- source tier별 예외 유입
- duplicate false positive/false negative 의심 패턴
- quality score 분포
- source coverage 부족 패턴

### C. Prompt quality
- 특정 문장 프레이밍이 반복되는지
- 비슷한 제목 템플릿이 과다한지
- 본문 구조가 기계적으로 굳어졌는지
- Why it matters 섹션이 업계 관점이 아닌 내부 운영 관점으로 새는지

### D. Policy quality
- 지금 규칙이 너무 빡세서 좋은 글을 잡는지
- 지금 규칙이 너무 느슨해서 약한 글을 통과시키는지
- 특정 source/category에만 과도한 예외가 몰리는지

## Strengthened Workflow

### Step 1 — Cohort collection
지난 7일 기준으로 아래를 함께 수집한다.

- published brief
- review approved brief
- review pending brief
- duplicate flagged brief
- quality fail로 `draft + pending` 복귀한 brief

발행만 보면 "무엇이 빠졌는지"가 보이지 않기 때문이다.

### Step 2 — Pattern finding
브리프별 점수보다 아래 패턴을 우선 찾는다.

- 같은 제목 구조 반복
- source diversity 낮음
- body depth가 특정 소스에서 계속 약함
- auto-hold 사유가 특정 규칙에서 과도함
- duplicate guard가 너무 보수적이거나 너무 느슨함

### Step 3 — Action classification
발견 사항은 반드시 3종으로 나눈다.

1. prompt tweak
- 대상: `daily-editorial-review.md`

2. policy tweak
- 대상: `REVIEW-POLICY.md`, `AUTO-PUBLISH-RULES.md`

3. source action
- 대상: `SOURCE-CATALOG.md`, `weekly-source-health`

이 분류가 없으면 회고가 "좋은 말"로 끝난다.

### Step 4 — Proposal queue
모든 개선 제안은 아래 상태 중 하나를 가진다.

- `observe`
- `propose`
- `approved`
- `applied`
- `rejected`

즉시 적용은 로그 문서만 허용하고, 정책/프롬프트 수정은 운영자 승인 후 반영한다.

## Suggested Output Shape

```md
## Weekly Editorial Retrospective

### Cohorts
- published: N
- auto-approved: N
- pending-hold: N
- quality-failed: N
- duplicate-flagged: N

### Patterns
- ...

### Proposal queue
| type | target | summary | status |
| --- | --- | --- | --- |
| prompt | daily-editorial-review.md | 제목 규칙 보강 | propose |
| policy | AUTO-PUBLISH-RULES.md | hold 조건 조정 | observe |
```

## File Strategy

### Phase 1 output
- 새 로그 문서 후보:
  - `docs/status/EDITORIAL-RETROSPECTIVE-LOG.md`

### Phase 2 update targets
- `.claude/automations/weekly-self-critique.md`
- `.claude/automations/daily-editorial-review.md`
- `docs/ref/REVIEW-POLICY.md`
- `docs/ref/AUTO-PUBLISH-RULES.md`
- 필요 시 `docs/ref/SOURCE-CATALOG.md`

## Guardrails

- 발행물만 보고 규칙을 바꾸지 않는다
- 최소 2회 이상 반복된 패턴만 policy proposal로 승격한다
- prompt와 policy를 한 번에 같이 크게 바꾸지 않는다
- automatic application은 로그와 상태 문서 외에는 금지한다
- 아직 없는 analytics를 가정하지 않는다

## Skill Integration

### `doc-sync`
- 회고 결과가 실제 문서 변경으로 이어질 때 필수

### `big-task`
- prompt, rule, source catalog를 함께 건드리는 복합 변경으로 커질 때 사용

현재는 이 둘만 직접 연결된다.
즉, 이 하네스는 새로운 실행 스킬을 만들기 전의 운영 설계층이다.

## Implementation Plan

### Phase 1 — Strengthen existing weekly-self-critique
- published-only 시야를 cohort-based 회고로 넓힌다
- proposal queue 개념을 추가한다
- "개선 제안 없음"보다 "observe 상태"를 허용한다

### Phase 2 — Dedicated log
- `EDITORIAL-RETROSPECTIVE-LOG`를 둬서 제안의 수명주기를 추적한다
- 어떤 제안이 적용됐고, 다음 주에 어떤 결과가 나왔는지 남긴다

### Phase 3 — Small change policy
- 한 주에 하나의 prompt tweak 또는 하나의 policy tweak만 적용
- 다음 주 회고에서 keep / rollback 관찰

### Phase 4 — Future channel feedback
- 나중에 `channel_metrics`가 생기면 YouTube/Threads/Newsletter 반응을 보조 지표로 합친다
- 하지만 현재 하네스의 기본값은 여전히 content + operations다

## Success Metrics

- 반복되는 hold 사유 감소
- published brief의 평균 quality score 안정화
- 제목 구조 다양성 증가
- source diversity 개선
- "왜 이 규칙을 바꿨지?"를 설명할 수 있는 근거 축적

## Non-Goals

- engagement 최적화 엔진을 지금 당장 만들지 않는다
- 모든 발행물에 대한 사람 전수 평가로 되돌아가지 않는다
- 매주 큰 프롬프트 개편을 하지 않는다

## Recommended First Cut

가장 먼저 할 일은 `weekly-self-critique`를 "발행물 감상"에서 "published + hold + fail을 함께 보는 회고"로 바꾸는 것이다.
그래야 실제 운영 병목과 품질 개선이 한 문서에서 만난다.
