# Telegram Orchestrator Contract

## Purpose
- `telegram-orchestrator`는 VibeHub의 LLM active/shadow/promote/rollback control plane으로 쓴다.
- VibeHub는 자체 파이프라인을 유지하고, 모델 승격과 관찰은 `telegram-orchestrator`를 통해 수행한다.

## Assumed Capabilities
- SQLite model registry
- role별 active 포인터
  - `chat`
  - `router`
  - `search`
  - `memory`
- eval / shadow / activate / rollback command
  - `/model-eval <model>`
  - `/model-shadow <model>`
  - `/model-activate <model> [targets]`
  - `/model-rollback [targets]`
- drift guard
  - p95 latency
  - remote delegation rate
  - search overuse
  - memory write rate

## Contract Boundary
### `telegram-orchestrator` 책임
- 모델 registry와 active 포인터 관리
- eval 결과 저장
- shadow 시작/중단
- promote / rollback 실행
- drift 감시

### `VibeHub` 책임
- stage input generation
- source/item/draft/critic 결과 저장
- queue routing
- human-on-exception policy
- publish queue control

## Stage Mapping
### `classifier`
- orchestrator role:
  - `router` 또는 classification-specific candidate run
- VibeHub input:
  - parsed content
  - source tier
  - prior dedupe context
- VibeHub output:
  - `target_surface`
  - confidence
  - category
  - review reason

### `brief draft`
- orchestrator role:
  - draft writer candidate run
- VibeHub input:
  - source item
  - source list
  - classification output
- VibeHub output:
  - title
  - summary
  - body
  - exception flag

### `discover draft`
- orchestrator role:
  - draft writer candidate run
- VibeHub input:
  - category
  - source item
  - action link candidates
- VibeHub output:
  - summary
  - action links
  - category validity
  - exception flag

### `critic`
- orchestrator role:
  - critic candidate run
- VibeHub input:
  - draft
  - source set
  - policy flags
- VibeHub output:
  - pass/fail
  - exception reason
  - correction note

## Command Sequence
1. candidate model 등록 확인
2. `/model-eval <model>`
3. eval pass 확인
4. stage별 shadow 시작
5. `docs/status/ORCHESTRATION-TRIAL-LOG.md`에 결과 기록
6. promote 조건 충족 시 `/model-activate <model>`
7. drift guard 위반 시 `/model-rollback [targets]`

## Guardrails
- eval pass 전 shadow 금지
- 한 번에 여러 stage promote 금지
- active 변경 후 최소 관찰 윈도우 없이 다음 promote 금지
- VibeHub의 publish rule보다 orchestrator가 앞서지 않는다

## Data Handshake
- VibeHub는 stage별 비교 가능한 입력 세트를 유지해야 한다.
- orchestrator 결과는 아래 필드를 남길 수 있어야 한다.
  - `stage`
  - `active_model`
  - `candidate_model`
  - `mode`
  - `sample_count`
  - `result_summary`
  - `rollback_trigger`

## Default Mode
- 최종 운영 기본값은 `hybrid`
- 기본 active:
  - `chat/router/search/memory`: `mistral-small3.1`
  - `classifier`: `claude-sonnet-4-6`
  - `brief draft`: `claude-sonnet-4-6`
  - `discover draft`: `claude-sonnet-4-6`
  - `critic`: `claude-sonnet-4-6`

## Activation Boundary
- `router/search/memory`는 role activation 대상으로 유지한다.
- `classifier`, `brief draft`, `discover draft`, `critic`는 stage pointer activation 대상으로 분리한다.
- stage pointer activation은 runtime chat/search/memory active를 바꾸지 않는다.
- automatic rollback monitor는 runtime role activation에서만 켠다.
- 현재 상태:
  - runtime role active는 `mistral-small3.1`
  - stage pointer 4개는 모두 `claude-sonnet-4-6`
