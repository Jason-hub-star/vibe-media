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
  - 원격은 `origin = git@github.com:kimjuyoung1127/vibe-media.git`를 canonical remote로 둔다.
- 메모:
  - 로컬 초기화와 첫 커밋은 완료했다.
  - 현재 SSH-authenticated 환경에서 push도 확인했다.

### 2026-03-22 — Ingest Stack v1
- 상태: resolved
- 결정:
  - collector primary: `Crawl4AI`
  - collector fallback: `Firecrawl`
  - HTML/article cleanup primary: `Defuddle`
  - document/PDF primary: `Docling`
  - PDF fallback: `OpenDataLoader PDF`
  - utility fallback: `MarkItDown`
  - `Unstructured`는 v1 primary에서 제외하고 P3 ETL 후보로 남긴다.
- 기준 문서:
  - `docs/ref/INGEST-STACK-DECISION.md`

### 2026-03-22 — Source Catalog v1
- 상태: resolved
- 결정:
  - brief source 1차 배치는 공식 AI product/research source 중심으로 묶는다.
  - discover source 1차 배치는 GitHub/launch/event/contest 축으로 묶는다.
  - event/contest/grant는 `Devpost`, `Kaggle Competitions`, `AI Engineer World’s Fair`, `MLH`를 기본 source로 둔다.
- 기준 문서:
  - `docs/ref/SOURCE-CATALOG.md`

## Pending

### Orchestration Final Choice
- 상태: pending
- 결정 필요:
  - `local only` / `Claude only` / `hybrid` 중 최종 운영 기본값
  - stage별 active 모델 승격 순서
  - `classifier`, `brief draft`, `discover draft`, `critic`의 shadow 종료 조건
- 기준 문서:
  - `docs/ref/ORCHESTRATION-EVALUATION.md`
  - `docs/ref/LLM-ORCHESTRATION-MAP.md`
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`

### Stage-Level Model Winners
- 상태: pending
- 결정 필요:
  - `classifier` 기본 active
  - `brief draft` 기본 active
  - `discover draft` 기본 active
  - `critic` 기본 active
- 기준 문서:
  - `docs/ref/LLM-ORCHESTRATION-MAP.md`
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`
  - `telegram-orchestrator` shadow/eval 결과

## Next Review Order
1. orchestration comparison run
2. stage-level promote / rollback 기준 재검토
3. source catalog quality review after first live ingest
