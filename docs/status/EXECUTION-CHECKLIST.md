# VibeHub Execution Checklist

이 문서는 현재 개발 상황을 빠르게 확인하고, 다음 작업 우선순위를 잃지 않기 위한 실행 체크리스트다.

## Priority Order
- `P0`: 지금 막지 않으면 다음 구현이 꼬이는 항목
- `P1`: 파이프라인 본체를 여는 핵심 항목
- `P2`: 공개/운영 품질을 올리는 항목
- `P3`: 운영 안정화와 확장 항목

## P0 — Immediate Blockers
- [x] JS 런타임 기준 확정 + `apps/web` typecheck 안정화
- [x] `PROJECT-STATUS.md`와 실제 검증 상태 다시 동기화
- [x] git 초기화 및 원격 연결 전략 확정
- [x] source/tool/orchestration research pending 상태를 decision log로 분리

## P1 — Pipeline Core
- [x] `sources` / `ingest_runs` / `ingested_items` / `item_classifications` SQL 초안 작성
- [ ] `/admin/inbox` 스캐폴드 구현
- [ ] `/admin/runs` 스캐폴드 구현
- [ ] `/admin/review` 스캐폴드 구현
- [ ] `/admin/publish` 스캐폴드 구현
- [ ] `/admin/exceptions` 스캐폴드 구현
- [ ] `/admin/policies` 스캐폴드 구현
- [ ] `/admin/programs` 스캐폴드 구현
- [ ] `target_surface = brief | discover | both | archive | discard` 흐름을 UI와 데이터에 연결
- [ ] `human-on-exception` 큐 조건을 실제 상태값으로 반영

## P1 — LLM / Orchestration
- [ ] `LLM-ORCHESTRATION-MAP.md` 기준으로 단계별 실험표 작성
- [ ] `classifier` shadow 비교 규칙 문서화
- [ ] `brief draft` shadow 비교 규칙 문서화
- [ ] `discover draft` shadow 비교 규칙 문서화
- [ ] `critic` shadow 비교 규칙 문서화
- [ ] `telegram-orchestrator`와 VibeHub 연동 계약 정리
- [ ] 로컬/Claude/hybrid 실험 로그 포맷 정의

## P1 — Source Research
- [ ] 수집기 후보 조사
- [ ] parser/PDF 후보 조사
- [ ] source catalog 1차 배치 선정
- [ ] source tier 분류표 작성
- [ ] fallback 정책 확정

## P2 — Frontend / UX
- [ ] page-level loading/empty/error 상태 강화
- [ ] `brief` / `radar` / `sources` 위계와 간격 품질 패스
- [ ] admin 상태 UI 명확성 강화
- [ ] design docs route-by-route 확장
- [ ] placeholder asset -> real asset 교체 흐름 문서화

## P2 — Discover / Brief Surface
- [ ] `radar` 카테고리 필터 설계
- [ ] `tracked / watching / featured` 노출 규칙 정리
- [ ] `brief`와 `discover` 동시 노출 기준 고정
- [ ] action link 검증 규칙 정리

## P3 — Hardening
- [ ] admin 실제 인증/권한 모델 설계
- [ ] observability / failure alert 설계
- [ ] retry / rollback / blocked 승격 정책 구체화
- [ ] publish policy와 YouTube 메타데이터 규칙 정교화
- [ ] 운영 주간 점검 루틴 문서화

## Current Snapshot
- [x] 공개 사이트 기본 shell
- [x] admin 기본 shell
- [x] discovery/radar 기본 구조
- [x] 운영 문서 세트
- [x] LLM 병행 오케스트레이션 문서
- [ ] 파이프라인 실제 구현
- [ ] Supabase SQL 실제 구현
- [ ] admin 파이프라인 화면 실제 구현
- [ ] source/tool/orchestration 최종 채택

## Recommended Next Sequence
1. `P0`를 먼저 닫는다.
2. 그 다음 `P1 Pipeline Core`와 `P1 LLM / Orchestration`을 같이 진행한다.
3. 파이프라인 골격이 열린 뒤 `P2 Frontend / UX`를 한다.
4. 마지막에 `P3 Hardening`으로 들어간다.
