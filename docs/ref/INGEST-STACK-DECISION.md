# Ingest Stack Decision

## Decision Date
- 2026-03-22

## Decision Summary
- 현재 구현된 collector는 RSS/API + GitHub Releases fetch다.
- `Crawl4AI`는 render-required source 확장 시의 목표 primary stack으로 둔다.
- `Firecrawl`은 hosted fallback 또는 특정 source에서만 쓰는 secondary collector 후보로 둔다.
- HTML/article cleanup는 Phase 1에서 `Defuddle`를 실제 연결한다.
- document/PDF primary는 `Docling`을 목표 stack으로 두되, 실제 PDF/doc source 도입 전까지는 gated 상태로 둔다.
- PDF fallback은 `OpenDataLoader PDF`를 목표 fallback으로 두되, 실제 PDF/doc source 도입 전까지는 gated 상태로 둔다.
- utility fallback은 `MarkItDown` 후보로 남긴다.
- `Unstructured`는 v1 primary stack에 넣지 않고, P3 ETL 후보로만 남긴다.

## Why This Stack
### Collector Primary: `Crawl4AI`
- self-hosted 전제가 강해 VibeHub의 로컬/하이브리드 운영과 맞는다.
- browser renderer, crawler, dashboard를 한 stack으로 묶기 쉽다.
- `render-required` source를 자동 범위 안에서 다루기 좋다.
- **2026-04-07 업데이트**: v0.8.6 (2026-03-24). 3-tier anti-bot + proxy escalation, Shadow DOM flattening, 60+ bug fix 포함. v0.8.0부터 내장 MCP 서버 탑재 — AI agent에서 직접 호출 가능. 62k+ GitHub stars. 결정 유지.

### Collector Fallback: `Firecrawl`
- managed 환경과 search/browser API까지 포함한 운영 편의성이 강하다.
- 특정 source나 급한 운영 상황에서 hosted fallback으로 쓰기 좋다.
- v1 기본값으로 두면 비용/lock-in이 커질 수 있어 primary로는 두지 않는다.

### HTML Cleanup Primary: `Defuddle`
- article/body cleanup에 집중돼 있어 brief/discover 초안 입력으로 바로 쓰기 좋다.
- crawler 자체를 대체하지 않고 parser 후처리기로 붙이기 좋다.
- Phase 1에서는 RSS article URL 후속 fetch 결과를 markdown으로 정규화하는 범위까지만 실제 적용한다.
- **2026-04-07 업데이트**: v0.15.0 (2026-04-01) 기준으로 linkedom이 권장 DOM 파서로 전환됨. `defuddle/node`에 JSDOM 인스턴스 또는 raw HTML 문자열을 직접 전달하는 방식은 deprecated — 다음 major 버전에서 제거 예정. `live-source-fetch.ts` 통합 시 linkedom 경로로 맞출 것.

### Document/PDF Primary: `Docling`
- PDF 외에 DOCX, PPTX, HTML 등 다형식 대응이 가능하다.
- VibeHub의 `contest`, `event`, `report`, `grant` 축을 하나의 parser 계열로 묶기 좋다.
- 현재 repo에는 PDF/doc source가 없어 아직 실제 연결하지 않는다.

### PDF Fallback / Benchmark Candidate: `OpenDataLoader PDF`
- PDF 구조 추출과 bbox/read-order 성격이 강해 일부 문서형 source에서 비교 가치가 있다.
- v1 primary로 바로 고정하기보다 `Docling` 실패 또는 품질 이슈 시 fallback으로 둔다.
- **2026-04-01 업데이트**: v2.0.2 (2026-03-18)에서 라이선스가 Apache 2.0으로 전환됨. 오픈소스 PDF 벤치마크 1위(0.90). OCR·Table·Formula·Chart AI add-on 무료 제공. PDF source 실제 도입 시 Docling과 나란히 benchmark 대상으로 올릴 근거가 생김.
- 현재 repo에는 PDF/doc source가 없어 아직 실제 연결하지 않는다.

### Utility Fallback: `MarkItDown`
- 가볍고 빠른 file-to-markdown fallback으로 유용하다.
- parser stack 전체를 대체하는 primary는 아니다.

### Deferred Candidate: `Unstructured`
- ETL와 대형 문서 처리 쪽 확장성은 있으나 v1에는 무겁다.
- P3 이상에서 ingest volume이 커질 때 다시 검토한다.

## Stack by Source Tier
### `auto-safe`
- primary:
  - `Crawl4AI`
  - RSS/API client
- post-process:
  - `Defuddle`
- fallback:
  - `Firecrawl`

### `render-required`
- primary:
  - `Crawl4AI` browser renderer
- fallback:
  - `Firecrawl` browser/search stack
- rule:
  - 로그인 없는 페이지까지만 자동 대상

### `manual-review-required`
- 자동 collector를 기본값으로 두지 않는다.
- 사람이 source를 열고, 필요한 경우만 parser를 보조적으로 사용한다.

### `blocked`
- 수집 제외
- 링크와 메모만 저장한다.

## Parser Positioning
### HTML / Article
1. 현재 구현은 RSS/API 또는 GitHub Releases fetch
2. article RSS source만 Phase 1에서 `Defuddle`로 본문 cleanup
3. 이후 local LLM 또는 Claude로 classify/draft

### PDF / Document
1. source 도입 전까지 planned only
2. source 도입 시 `Docling` primary
3. 실패 또는 품질 저하 시 `OpenDataLoader PDF`
4. 가벼운 markdown conversion 필요 시 `MarkItDown`

## Non-Goals
- v1에서 모든 source를 하나의 universal parser로 밀어붙이지 않는다.
- 로그인/강한 anti-bot source를 자동화 대상으로 무리하게 넣지 않는다.
- OCR-heavy, long-tail enterprise ETL까지 v1 scope로 잡지 않는다.

## Observability/Eval Stack Notes

### Langfuse v4 — Experiment Candidate (2026-04-14)
- v4.2.0 (2026-04-10) 출시. SDK 전면 재작성, observations-first 아키텍처로 전환.
- 대형 time-range 조회 성능 대폭 개선. brief/critic 단계 trace 붙이기에 가장 적합한 후보.
- 자가호스팅 가능, feature gate 없음.
- 소규모 실험 후보: critic stage 1개에 trace 연결 후 품질 drift 여부 관찰.
- 규칙 적용: 한 번에 하나의 실험 후보 — 현재 사이클은 Langfuse v4만 올림.

### Promptfoo — Hold (2026-04-14)
- 2026-03 OpenAI가 인수. 오픈소스/MIT 유지 선언했으나 로드맵과 거버넌스가 불확실해짐.
- 현재 live eval 체인(stage-level regression suite)이 없어 실험 근거 부족.
- 재검토 트리거: VibeHub에 critic/classifier stage regression suite 필요성이 생길 때.

### LiteLLM — Hold (2026-04-14)
- 2026-03 공급망 침해 사건: v1.82.7~v1.82.8이 PyPI에 백도어 포함 배포됨(TeamPCP via Trivy CI/CD 취약점).
- 이후 stable 태그로 패치 완료(v1.82.3-stable.patch.2). Crawl4AI도 이 사건으로 litellm을 교체함.
- 독립 도입 보류. provider abstraction이 필요해질 때 재평가. 안정성 추적 지속.

### Phoenix (Arize) — Watchlist (2026-04-14)
- Claude Agent SDK 통합 지원 확인. 자가호스팅 가능, 오픈소스.
- Langfuse와 역할이 겹침. Langfuse 실험 후 비교 필요 시 2순위 후보.

## Review Trigger
- collector/tool primary를 바꾸는 결정은 아래 중 하나가 있을 때만 다시 연다.
  - `render-required` source 성공률이 반복적으로 낮음
  - PDF parse 품질 이슈가 반복됨
  - hosted fallback 비용이 self-hosted 운영보다 유리해짐
  - source volume 증가로 `Unstructured` 급 ETL이 필요해짐
