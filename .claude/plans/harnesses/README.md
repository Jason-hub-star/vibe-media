# VibeHub Harness Plans

`.claude` 운영면에 추가할 하네스 설계 문서 모음이다.
이 문서 세트는 바로 실행되는 스킬이나 자동화가 아니라, 현재 VibeHub 구조를 기준으로 다음 하네스들을 안전하게 도입하기 위한 설계안이다.

## Why This Exists

현재 레포에는 이미 아래 운영 자산이 있다.

- 자동화: `daily-pipeline`, `daily-editorial-review`, `daily-drift-guard`, `weekly-self-critique`, `weekly-source-health`
- 스킬: `doc-sync`, `pipeline-check`, `design-sync`, `ui-audit`, `big-task`, `vibehub-youtube-link-intake`
- SSOT 문서: `PIPELINE-OPERATING-MODEL`, `AGENT-OPERATING-MODEL`, `ROUTE-SPECS`, `REVIEW-POLICY`, `AUTO-PUBLISH-RULES`, `PROJECT-STATUS`, `EXECUTION-CHECKLIST`

하지만 아직 비어 있는 운영 루프도 있다.

- 코드 변경과 문서 변경을 더 촘촘히 묶는 루프
- Obsidian Radar 저장물이 실제 개선 작업으로 환원되는 루프
- 발행 결과에서 프롬프트/정책/소스 품질 개선으로 닫히는 루프
- 새 기능을 본선과 sidecar lane 중 어디에 붙일지 먼저 판정하는 루프

## Harness Set

1. `doc-sync-harness-plan.md`
2. `obsidian-curation-harness-plan.md`
3. `editorial-retrospective-harness-plan.md`
4. `sidecar-safety-harness-plan.md`

## Recommended Build Order

1. 문서 같이 고치기 하네스
이 하네스가 먼저 있어야 이후 하네스 도입 중 생기는 문서 drift를 잡을 수 있다.

2. 새 기능 안전하게 붙이기 하네스
VibeHub는 본선과 sidecar lane이 이미 섞여 있으므로, 새 기능의 경계 판정 장치를 먼저 세우는 편이 안전하다.

3. 발행 후 회고 하네스
현재 `weekly-self-critique`를 더 운영 친화적으로 확장해 품질 개선 루프를 만든다.

4. 옵시디언 정리 하네스
이미 export는 되고 있으므로 마지막에는 저장된 레이더를 source/prompt/design 개선으로 환원하는 루프를 붙인다.

## Skill Mapping

| 하네스 | 바로 기대는 기존 스킬 | 비고 |
| --- | --- | --- |
| 문서 같이 고치기 | `doc-sync`, `big-task`, `self-review` | 가장 직접적으로 기존 스킬을 확장 |
| 옵시디언 정리 | `pipeline-check`, `design-sync`, `ui-audit`, `big-task` | 저장 이후 triage가 핵심 |
| 발행 후 회고 | `doc-sync`, `big-task` | 전용 스킬은 아직 없고, 현재 자동화 문서가 주 기반 |
| 새 기능 안전하게 붙이기 | `big-task`, `doc-sync`, `design-sync`, `ui-audit`, `pipeline-check` | 기능 성격에 따라 스킬 조합 |

## Rule Of Thumb

- 본선 보호가 먼저다.
- sidecar는 본선 의미를 바꾸지 않는다.
- 자동화는 제안과 집행을 분리한다.
- 문서는 구현과 충돌하면 구현을 먼저 확인하고 맞춘다.
- 사람은 전수 검수가 아니라 예외 판단과 규칙 소유자다.
