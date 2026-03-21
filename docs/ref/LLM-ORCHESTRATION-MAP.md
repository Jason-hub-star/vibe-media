# LLM Orchestration Map

## Purpose
- VibeHub 자동화 파이프라인은 로컬 LLM과 Claude를 병행 사용한다.
- 병행 사용은 즉시 고정 분업이 아니라, `eval -> shadow -> activate -> rollback` 안전장치를 통해 단계별로 역할을 확정하는 방식으로 운영한다.
- 기본 운영 원칙은 `human-on-exception`이며, 오케스트레이션은 하이브리드가 기본 후보다.

## Why Parallel Operation Is Allowed
- 현재 `telegram-orchestrator`에는 아래 안전장치가 이미 구현되어 있다.
  - 역할별 active 포인터: `chat / router / search / memory`
  - `/model-eval`
  - `/model-shadow`
  - `/model-activate`
  - `/model-rollback`
  - SQLite 상태 저장
  - 자동 롤백 지표:
    - p95 latency
    - remote delegation rate
    - search over-trigger
    - memory write rate

## Default Role Map
### `router`
- 기본 active: 로컬 LLM

### `search decision`
- 기본 active: 로컬 LLM

### `memory extraction`
- 기본 active: 로컬 LLM

### `collector`
- 기본 active: LLM 비의존 우선
- 보조: 로컬 LLM 허용

### `parser`
- 기본 active: LLM 비의존 우선
- 보조: 로컬 LLM 허용

### `classifier`
- 초기 active: 로컬 LLM
- shadow: Claude 비교

### `draft-writer (brief)`
- 초기 정책: 로컬과 Claude를 shadow 비교
- 기본 active는 promote 데이터가 쌓이기 전까지 보수적으로 유지한다.

### `draft-writer (discover)`
- 초기 정책: 로컬과 Claude를 shadow 비교
- 기준: category 적합성, action link 품질, 길이 안정성, 속도

### `critic`
- 유력 후보: Claude
- 초기 정책: 로컬도 shadow 비교

### `publisher`
- 기본 active: 규칙 엔진
- LLM은 publish 결정의 직접 소유자가 아니다.

### `watchdog`
- 기본 active: 규칙 + 상태 기반
- LLM은 보조 해석만 허용한다.

## Stage-Level Evaluation Policy
- `Brief`와 `Discover`는 둘 다 shadow 비교 대상이다.
- 어느 한쪽을 먼저 영구 고정하지 않는다.
- 단계별로 promote 조건을 만족한 모델만 active로 승격시킨다.
- 승격 후 drift가 기준을 넘으면 rollback한다.
- stage별 표본 수와 promote gate는 `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`를 따른다.
- control plane 경계는 `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`를 따른다.

## Fallback Rule
- 한쪽 모델이 더 우월해도 다른 한쪽은 fallback으로 유지한다.
- 최종 운영은 single-provider lock-in이 아니라 hybrid resilience를 지향한다.
