# Review Policy

## Core Principle
- VibeHub의 기본 검수 정책은 `예외만 검수`다.
- 사람은 모든 결과물을 보지 않고, 예외 조건에 해당하는 항목만 본다.
- 단, 미성년자 영상은 공개 전 부모 검수를 항상 남긴다.

## Human Review Entry Conditions
- low confidence
- policy risk
- duplicate ambiguity
- source tier issue
- publish rule failure
- broken action link
- category mismatch
- source coverage insufficiency

## What Humans Review
- source 원문과 parsed output의 차이
- target surface 결정이 적절한지
- brief 제목/요약/본문 톤
- discover action links와 CTA 품질
- 정책/노출 위험
- 미성년자 영상의 개인정보, 친구 음성, 채팅 노출, 공개 범위

## Sampling Review
- auto-queue 통과 항목도 샘플링 검수를 한다.
- 기본 샘플링 규칙:
  - source별 1건 이상
  - 새 category 첫 진입 항목 100%
  - 새 source 첫 3건 100%
  - critic score 하위 구간 우선 샘플링

## Not Default
- 전수 검수는 기본 정책이 아니다.
- 즉시 공개는 기본 정책이 아니다.
- 예외: 미성년자 영상의 최종 공개 전 부모 검수는 기본값이다.

## Review Outputs
- `approve`
- `send-back`
- `archive`
- `discard`
- `policy-hold`
