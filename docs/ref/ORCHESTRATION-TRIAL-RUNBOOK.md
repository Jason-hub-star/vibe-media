# Orchestration Trial Runbook

## Purpose
- VibeHub의 LLM 병행 운영은 감으로 고정하지 않는다.
- `classifier`, `brief draft`, `discover draft`, `critic`는 stage별 shadow 실험을 통해 active를 정한다.
- 이 문서는 실험 순서, 표본 기준, promote 조건, rollback 기준을 고정한다.

## Global Rule
- `/model-eval <model>` pass 전에는 shadow를 시작하지 않는다.
- 한 번에 한 stage만 승격 판단을 한다.
- 승격 후에도 fallback provider는 남긴다.
- `router/search/memory`는 이 runbook의 대상이 아니며, 기본 active는 로컬로 유지한다.

## Trial Order
1. `classifier`
2. `brief draft`
3. `discover draft`
4. `critic`

## Shared Evaluation Axes
- task success rate
- confidence stability
- p95 latency
- remote delegation drift
- search over-trigger
- memory false positive drift
- exception queue inflow

## Shared Promote Gate
- 최소 표본 수:
  - `classifier`: 40 items
  - `brief draft`: 20 items
  - `discover draft`: 20 items
  - `critic`: 25 items
- 또는 최대 경과 시간:
  - 3일
- 승격 후보는 아래를 모두 만족해야 한다.
  - success rate가 현재 active보다 낮지 않음
  - exception queue inflow가 현재 active보다 악화되지 않음
  - p95 latency가 운영 허용 범위를 넘지 않음
  - 명백한 policy regression이 없음

## Rollback Gate
- promote 후 아래 중 하나가 발생하면 rollback 후보로 본다.
  - p95 latency 급증
  - remote delegation drift 급증
  - search over-trigger 급증
  - memory false positive drift 급증
  - exception queue inflow 악화
  - human review에서 반복 reject

## Stage Table
| Stage | Active baseline | Shadow candidate | Primary score | Secondary score | Human gate |
| --- | --- | --- | --- | --- | --- |
| `classifier` | local | Claude | target surface accuracy | confidence stability | dual-surface / low-confidence mismatch |
| `brief draft` | conservative current active | opposite provider | source fidelity | exception inflow, latency | editor review only on exception |
| `discover draft` | conservative current active | opposite provider | category + action link quality | length stability, latency | operator review only on exception |
| `critic` | conservative current active | opposite provider | true positive precision | false positive rate, latency | operator review on disputed flags |

## Stage-Specific Rules
### `classifier`
- 비교 입력:
  - 같은 parsed content
  - 같은 source tier
  - 같은 dedupe context
- pass 조건:
  - `target_surface` 분기가 운영 의도와 크게 어긋나지 않음
  - `archive/discard` 과다 판정 없음
  - `both` 과다 판정 없음
- reject 조건:
  - `brief`/`discover` 분기 오류 반복
  - low-confidence 항목 폭증

### `brief draft`
- 비교 입력:
  - 같은 source item
  - 같은 classification output
  - 같은 source list
- 주요 체크:
  - 출처 충실도
  - 요약 품질
  - 과장 표현 여부
  - 예외 큐 유입률
- reject 조건:
  - source omission
  - policy-sensitive overclaim
  - critic fail 반복

### `discover draft`
- 비교 입력:
  - 같은 source item
  - 같은 category
  - 같은 action link candidates
- 주요 체크:
  - category 적합성
  - action link label 품질
  - CTA 명확성
  - summary 길이 안정성
- reject 조건:
  - broken action link
  - generic summary 반복
  - irrelevant CTA

### `critic`
- 비교 입력:
  - 같은 draft
  - 같은 source set
  - 같은 policy flags
- 주요 체크:
  - true positive precision
  - false positive rate
  - 놓친 policy 위험
  - 예외 큐 과다 유입 여부
- reject 조건:
  - 정상 항목을 과다 차단
  - 위험 항목을 반복 통과

## Orchestration Mode Comparison
- `local only`, `Claude only`, `hybrid`는 stage 승격과 별도로 end-to-end 비교한다.
- 비교 단위:
  - 같은 source set
  - 같은 publish rules
  - 같은 exception policy
- 채택 기준:
  - 가장 적은 human interrupts
  - 가장 높은 queue 도달률
  - 허용 가능한 비용/latency

## Output Requirement
- 모든 실험은 `docs/status/ORCHESTRATION-TRIAL-LOG.md`에 기록한다.
- 한 stage를 끝내면 decision log를 갱신한다.
