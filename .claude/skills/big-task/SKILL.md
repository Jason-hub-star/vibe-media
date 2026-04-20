---
name: big-task
description: 규모가 큰 작업을 플랜 → 페이즈별 병렬 실행 → 자기 리뷰 → 요약 설명까지 체계적으로 진행한다. 마일스톤이 3개 이상이거나 파일 변경이 10개 이상 예상될 때 사용.
argument-hint: "<task description>"
user_invocable: true
---

# Big Task — 대규모 작업 오케스트레이터

## Model Tier 전략 (항상 적용)

메인 세션은 기본값(sonnet)을 유지하고, 서브에이전트 호출 시 아래 티어를 **명시적으로 오버라이드**한다.

| 용도 | 모델 | 호출 방법 |
|------|------|-----------|
| 코드/문서 탐색, grep, 파일 읽기 | **haiku** | `Agent` 호출 시 `model: "haiku"` 명시 (Explore 포함) |
| 플랜 작성, 아키텍처 결정, 트레이드오프 | **opus** | `Plan` 서브에이전트를 `model: "opus"` 로 호출 |
| 구현, 리팩터, 테스트 작성 | **sonnet** | 메인 세션 기본값 그대로 (별도 지정 불필요) |
| 막혔을 때 2차 진단/구현 | **opus** | `codex:codex-rescue` 를 `model: "opus"` 로 호출 |

**플랜 출력 제약**: `plan length ≤ 40 lines, bullet form only, no risk inventory unless explicitly asked`. Opus가 플랜을 과도하게 부풀리지 않도록 Plan 호출 프롬프트에 포함한다.

## 실행 흐름

### Phase 0 — 탐색 & 플랜 수립
1. **현황 탐색**: Explore 에이전트(`model: "haiku"`)로 관련 코드/문서를 병렬 조사
2. **공식 문서 확인**: 필요 시 WebSearch/WebFetch로 Next.js, Supabase 등 공식 문서 참조
3. **변경 성격 분류**: 플랜 전에 이번 작업의 change class를 먼저 적는다
   - route/surface
   - schema/migration
   - pipeline/agent flow
   - automation/prompt
   - source/editorial policy
   - design/token/UX
   - sidecar/lane/channel
   - lane 분류가 애매하면 `plans/harnesses/sidecar-safety-harness-plan.md`를 먼저 읽는다
4. **플랜 작성**: `Plan` 서브에이전트(`model: "opus"`)로 마일스톤 구조화 후 EnterPlanMode
   - 각 마일스톤에 독립성 표시 (병렬 가능 여부)
   - 마일스톤별 예상 변경 파일 목록
   - 의존 관계 명시
   - 마일스톤별 companion check 후보도 같이 적는다
   - 길이 제약: ≤40 lines bullet form (상단 Model Tier 전략 참조)
5. **사용자 확인**: 플랜을 보여주고 승인받은 후 진행

### Phase 1~N — 마일스톤 실행
각 마일스톤에 대해:

1. **병렬 실행**: 독립적인 마일스톤은 Agent 도구로 서브에이전트를 병렬 생성
   - 각 에이전트에 명확한 범위와 변경 대상 파일 지정
   - 의존 마일스톤은 순차 실행
2. **검증**: 마일스톤 완료 후
   - `npx tsc --noEmit` (typecheck)
   - `npm run lint` (lint)
   - 관련 단위 테스트
3. **실패 시 수정**: 테스트 실패 → 원인 분석 → 수정 → 재검증 (최대 3회)
   - 3회 재시도 후에도 막히면 `codex:codex-rescue` 를 `model: "opus"` 로 호출해 2차 진단 위임
4. **체크포인트**: 마일스톤 완료마다 진행 상태를 사용자에게 1줄 보고

### Phase Final — 자기 리뷰 & 설명

1. **자기 리뷰**: `/self-review` 스킬의 체크리스트 수행
   - typecheck, 300줄 규칙, 보안, 미사용 코드, 문서 정합성
2. **문서 동기화**: `/doc-sync` 스킬 수행
   - change class별 필수 문서
   - missing docs
   - section hint
   - companion checks
3. **추가 검증 연결**: `/doc-sync` 결과에 따라 companion check를 붙인다
   - route/public/admin 변경: `/ui-audit`
   - design token/CSS 변경: `/design-sync`
   - pipeline/data path 변경: `/pipeline-check`
   - automation 변경: `npm run automation:check`
4. **문서 반영 또는 누락 보고**: 필요한 문서를 수정했는지, 아직 남은 문서가 있는지 명시한다
5. **변경 요약**: 비개발자도 이해할 수 있는 쉬운 설명 작성
   - "무엇이 바뀌었나" — 사용자 관점 1-3줄
   - "왜 바꿨나" — 동기 1줄
   - "어떻게 확인하나" — 확인 방법 1-2줄

## 스킬 조합 규칙

| 상황 | 사용 스킬 |
|------|----------|
| 코드 탐색 필요 | Explore 에이전트 (병렬) |
| 외부 API/프레임워크 문법 확인 | WebSearch → WebFetch |
| CSS/컴포넌트 변경 포함 | Phase Final에서 `/ui-audit` |
| design token/category/CSS 변경 포함 | Phase Final에서 `/design-sync` |
| route 추가/변경 포함 | Phase Final에서 `/doc-sync` |
| pipeline/worker/data path 변경 포함 | Phase Final에서 `/pipeline-check` |
| automation 문서/프롬프트 변경 포함 | `npm run automation:check` |
| 마일스톤이 독립적 | Agent 도구로 병렬 실행 |
| 마일스톤이 의존적 | 순차 실행, 이전 결과 전달 |

## 병렬 에이전트 사용 기준
- 서로 다른 파일을 수정하면 → 병렬
- 같은 파일을 수정하면 → 순차
- 탐색/조사 작업은 → 항상 병렬

## 출력 포맷

### 플랜 단계
```
## Big Task Plan: {task name}

### Change classes
- route/surface
- automation/prompt

### M1 — {title} [독립]
- 변경: file1.ts, file2.tsx
- 검증: typecheck + unit test

### M2 — {title} [M1 의존]
- 변경: file3.ts
- 검증: typecheck + lint

### M3 — {title} [독립, M1과 병렬 가능]
- 변경: file4.css
- 검증: ui-audit + design-sync

예상 변경: N파일, 약 M줄
```

### 완료 단계
```
## 변경 요약 (쉬운 설명)

**무엇이 바뀌었나**: ...
**왜 바꿨나**: ...
**어떻게 확인하나**: ...

## Doc Sync Summary
- change classes: ...
- missing docs: none | ...
- companion checks run: ...

## 기술 변경 상세
| 마일스톤 | 상태 | 변경 파일 |
|---------|------|----------|
| M1 ... | ✅ | 3파일 |
| M2 ... | ✅ | 2파일 |
```
