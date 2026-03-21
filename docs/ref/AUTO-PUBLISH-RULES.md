# Auto Publish Rules

## Default Goal
- 기본 자동화 목표는 `scheduled/private publish queue`까지다.
- 즉시 공개는 기본값이 아니며 별도 운영 판단이 필요하다.

## Auto Queue Conditions
- source tier가 허용 범위다
- critic pass를 통과했다
- confidence 기준을 충족한다
- 정책 플래그가 없다
- duplicate가 아니다
- action links가 유효하다
- active 모델은 promote 이후 rollback 기준을 벗어나지 않아야 한다

## Default Route
1. 수집
2. 가공
3. 초안
4. critic
5. auto-queue 등록
6. scheduled/private 상태 유지

## Human Escalation Conditions
- publish metadata 부족
- policy ambiguity
- source provenance 부족
- category와 surface가 충돌
- uploader failure

## Immediate Publish
- 기본값 아님
- 별도 실험/정책 문서에서만 허용 가능
