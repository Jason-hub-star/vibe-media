# publish.program.md

## Goal
- 승인된 항목을 `scheduled/private queue`까지 안전하게 등록한다.

## Success Conditions
- publish metadata complete
- policy flags 없음
- queue registration 성공

## Failure Conditions
- metadata 부족
- uploader failure
- policy ambiguity

## Allowed Surface
- `brief`
- `discover`
- `video`

## Escalation
- 모호한 공개 판단은 `review` 또는 `exceptions`

## Discard
- queue 등록이 의미 없어진 stale item
