# source.policy.md

## Goal
- source tier와 retry 경계를 운영자가 일관되게 조정한다.

## Success Conditions
- source tier가 현재 위험도와 접근성에 맞다.
- 반복 실패 source는 적절히 강등된다.

## Failure Conditions
- blocked source를 자동 루프에 다시 넣음
- render-required를 manual 없이 방치

## Allowed Surface
- `sources`
- `runs`
- `exceptions`

## Escalation
- anti-bot, paywall, login-required는 운영자 판단 필요

## Discard
- 장기간 가치가 없거나 접근 불가능한 source
