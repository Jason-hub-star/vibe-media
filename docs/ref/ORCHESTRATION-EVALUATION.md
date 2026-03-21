# Orchestration Evaluation

## Decision Policy
- 오케스트레이션은 문서에서 미리 고정하지 않는다.
- 로컬 only, Claude only, hybrid를 실제로 돌려 본 뒤 결정한다.
- 현재 기본 후보는 `hybrid`다.

## Candidates
- `local only`
- `Claude only`
- `hybrid`

## Evaluation Criteria
- latency
- cost
- failure recovery
- observability
- human interrupts
- session persistence

## Experiment Design
- 동일한 source set과 동일한 target surface로 3가지 방식을 비교한다.
- 비교 항목:
  - end-to-end 완료 시간
  - 실패율
  - retry 회복률
  - 사람이 개입한 횟수
  - queue까지 자동 진행된 비율

## Stage-Level Shadow Trials
- 실험 단위:
  - `classification`
  - `brief draft`
  - `discover draft`
  - `critic`
- 각 단계는 shadow 비교 후 promote 여부를 판정한다.
- `/model-eval` pass 전 shadow는 허용하지 않는다.
- shadow 완료 조건:
  - 표본 수 충족 또는 최대 경과 시간 충족
- promote 후 active 상태에서는 아래 drift를 모니터링한다.
  - p95 latency
  - remote delegation drift
  - search over-trigger
  - memory false positive drift
  - exception queue inflow

## Acceptance
- 가장 적은 human interrupts로 가장 높은 queue 도달률을 보인 방식을 우선 채택한다.
- hybrid가 각 단계별로 더 나은 경우 하이브리드 채택을 기본값으로 허용한다.
- `router/search/memory`는 현재 구조상 로컬 active 유지가 기본값이다.
- `brief/discover/critic`은 shadow 결과 누적 전까지 보수적으로 active를 유지한다.
