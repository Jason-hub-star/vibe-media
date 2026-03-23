# VibeHub 주간 Ingest 리서치

## 목적

VibeHub의 source/tool 스택을 최신 상태로 유지하기 위해 주 1회 조사한다.
특히 parser, PDF/document, collector, eval/observability 계열 오픈소스를 추적하고
"당장 도입", "실험 후보", "보류"를 나눈다.

---

## 1. 조사 원칙

- 반드시 웹 검색 또는 공식 저장소 기준으로 확인한다.
- README, 공식 문서, 릴리스, 라이선스를 우선 본다.
- 예전 기억으로 결론 내리지 않는다.
- VibeHub 현재 구조와 맞는지부터 본다.

---

## 2. 우선 조사 후보

### Primary watchlist
- `Defuddle`
- `Docling`
- `OpenDataLoader PDF`
- `Crawl4AI`
- `Promptfoo`
- `Langfuse`
- `LiteLLM`
- `MarkItDown`

### Secondary watchlist
- `Firecrawl`
- `Phoenix`
- `Prefect`

---

## 3. 프로젝트 기준 평가

각 후보를 아래 기준으로 본다.

### Fit
- TypeScript/Node 현재 스택과 잘 붙는가
- self-host 또는 local-first 운영이 가능한가
- 기존 `collector -> parser -> classifier -> draft -> critic -> publisher -> watchdog` 흐름과 충돌이 적은가

### Value
- 정확도 향상
- 운영 안정성 향상
- 관측 가능성 향상
- 실험 자동화 가능성 향상

### Cost/Risk
- 무거운 새 런타임이 필요한가
- vendor lock-in이 생기는가
- 라이선스가 제품 운영에 부담이 되는가
- 기존 문서/코드 대비 이득이 충분한가

---

## 4. 조사 후 해야 할 일

### 4-1. 꼭 남길 산출물

아래 4개를 만든다.

1. 이번 주 신규 관찰
2. 유지 추천 도구
3. 새 실험 후보 1-2개
4. 보류 또는 제외 이유

### 4-2. 문서 반영 규칙

다음 문서만 필요 시 업데이트한다.
- `docs/ref/INGEST-STACK-DECISION.md`
- `docs/ref/SOURCE-EXPANSION-STRATEGY.md`
- `docs/status/DECISION-LOG.md`

업데이트 조건:
- 릴리스/기능/라이선스/통합성 변화가 명확할 때만
- "좋아 보여서"가 아니라 실제 근거가 있을 때만

---

## 5. 추천 조사 방향

### A. parser stack
- `Defuddle`를 HTML/article cleanup primary로 계속 유지할지 점검
- `Docling`과 `OpenDataLoader PDF`의 역할 분리를 유지할지 점검
- PDF source가 늘면 fallback이 아니라 benchmark 대상로 승격할지 검토

### B. observability/eval
- `Promptfoo`로 stage-level regression suite를 만들 수 있는지 검토
- `Langfuse`로 brief/discover/critic trace를 남길 가치가 있는지 검토
- `LiteLLM`로 provider abstraction과 비용/지연 추적을 단순화할 수 있는지 검토

### C. source expansion
- RSS/API source 추가 후보
- render-required source를 `Crawl4AI`로 자동화 가능한지
- anti-bot 또는 login-required source는 계속 자동 범위 밖에 둘지

---

## 6. 출력 형식

```md
## Weekly Ingest Research

### Keep
- tool: why

### Experiment Next
- tool: smallest useful experiment

### Hold
- tool: why not now

### Proposed Doc Updates
- file: reason

### Sources
- link
```

---

## 7. 중요한 제약

- 한 번에 하나의 새 도구만 실험 후보로 올린다.
- collector/parser/eval/observability를 동시에 다 갈아엎지 않는다.
- Python-heavy 도구는 sidecar 가치가 분명할 때만 올린다.
