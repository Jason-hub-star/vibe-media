# Orchestration Trial Log

이 문서는 `local only`, `Claude only`, `hybrid` 비교와 stage-level shadow 결과를 기록하는 운영 로그다.

## Log Template

### Trial
- date:
- stage:
- mode:
- active model:
- candidate model:
- sample count:
- source set:
- target surface:

### Metrics
- task success rate:
- confidence stability:
- p95 latency:
- remote delegation drift:
- search over-trigger:
- memory false positive drift:
- exception queue inflow:

### Outcome
- result:
  - `keep active`
  - `promote candidate`
  - `rollback`
  - `need more samples`
- notes:
- next action:

## Current Entries
- none yet
