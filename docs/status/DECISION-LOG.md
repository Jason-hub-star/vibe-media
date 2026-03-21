# Decision Log

이 문서는 `source`, `tool`, `orchestration` 관련 보류 결정을 한 곳에 모아두는 운영 로그다.

## Resolved

### 2026-03-22 — JS Runtime Baseline
- 상태: resolved
- 결정:
  - `vibehub-media` 검증에는 Node 런타임이 필요하다.
  - `apps/web` typecheck는 `next typegen` 이후 `tsc --noEmit`를 canonical flow로 사용한다.
- 근거:
  - Next 16 App Router 타입 생성은 빌드 산출물 의존보다 `typegen` 선행이 더 안정적이다.

### 2026-03-22 — Git Bootstrap Strategy
- 상태: resolved
- 결정:
  - `vibehub-media`는 로컬 git repository로 초기화한다.
  - 기본 브랜치는 `main`을 사용한다.
  - 원격은 `origin = https://github.com/kimjuyoung1127/vibe-media.git`로 둔다.
- 메모:
  - 로컬 초기화와 첫 커밋은 완료했다.
  - 원격 push는 GitHub 인증이 준비된 세션에서 다시 시도해야 한다.

## Pending

### Source Research
- 상태: pending
- 결정 필요:
  - collector/tool 1차 채택
  - parser/tool 1차 채택
  - PDF parser 1차 채택
  - source catalog 1차 배치
  - fallback 정책
- 기준 문서:
  - `docs/ref/SOURCE-RESEARCH-METHOD.md`

### Orchestration Final Choice
- 상태: pending
- 결정 필요:
  - `local only` / `Claude only` / `hybrid` 중 최종 운영 기본값
  - stage별 active 모델 승격 순서
  - `classifier`, `brief draft`, `discover draft`, `critic`의 shadow 종료 조건
- 기준 문서:
  - `docs/ref/ORCHESTRATION-EVALUATION.md`
  - `docs/ref/LLM-ORCHESTRATION-MAP.md`

### Stage-Level Model Winners
- 상태: pending
- 결정 필요:
  - `classifier` 기본 active
  - `brief draft` 기본 active
  - `discover draft` 기본 active
  - `critic` 기본 active
- 기준 문서:
  - `docs/ref/LLM-ORCHESTRATION-MAP.md`
  - `telegram-orchestrator` shadow/eval 결과

## Next Review Order
1. Source research 결과 수집
2. orchestration comparison run
3. stage-level promote / rollback 기준 재검토
