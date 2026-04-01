# Weekly Ingest Research — 2026-04-01

## Keep

- **Defuddle v0.14.0** (released ~2026-03-29): HTML/article cleanup primary 유지. Node-native, 꾸준한 릴리스 주기. Phase 1 RSS article cleanup 역할 그대로. 변경 없음.
- **Crawl4AI v0.8.6** (released 2026-03-24): render-required source primary 유지. 이번 릴리스에서 text-only mode(JS/이미지 비활성화로 3–4× 속도 향상), crash recovery, session reuse가 추가됨. self-hosted 전제와 계속 맞음.
- **Docling v2.82.0 / docling-parse v5.5.0**: PDF/doc primary 유지 (gated). 이번 분기에 CSV 백엔드, hybrid chunker, timeout limit 추가. Python sidecar 필요 전제는 유지. 실제 PDF source 도입 전까지 planned only.
- **MarkItDown v0.1.5** (released 2026-02-20): 가벼운 fallback 유지. PDF table extraction 개선 포함. 91K+ stars. MIT license.

## Experiment Next

- **OpenDataLoader PDF v2.0.2** (released 2026-03-18): 라이선스가 **MIT → Apache 2.0**으로 전환됨. 오픈소스 PDF 파서 벤치마크에서 0.90으로 1위 달성. OCR, Table, Formula, Chart 무료 AI add-on 4종 추가. 기존 INGEST-STACK-DECISION에서는 Docling fallback 후보였으나, 이번 v2.0 기점으로 Docling과 실제 PDF source 연결 시 **나란히 benchmark 대상**으로 올릴 근거가 생김. 실험 범위: PDF source 1개 도입 시 Docling vs OpenDataLoader PDF 추출 품질 비교.

## Hold

- **Promptfoo**: 2026-03-16 OpenAI에 인수됨. MIT 라이선스와 오픈소스 상태는 유지된다고 공식 발표. 그러나 소유권 변경 이후 라이선스·방향성 리스크가 남아 있어 당장 도입보다 관망. stage-level regression suite 필요 시점에 다시 검토.
- **Langfuse**: OTEL-native SDK v3, self-host MIT. 기능은 충분하나 VibeHub 파이프라인에 아직 live LLM chain trace가 없음. trace 대상이 생기면 그때 도입. 지금 연결해도 비울 데이터만 쌓임.
- **LiteLLM v1.82.5**: MCP 지원 추가, 100+ provider 지원. Python-heavy. 현재 Claude 단일 provider 구조에서 multi-provider abstraction이 필요해지기 전까지 보류.
- **Firecrawl**: 98.5K+ stars, 관리형 서비스 성격이 강함. /interact endpoint, parallel agents, CLI 등 기능은 좋으나 managed cost risk. secondary collector fallback 포지션 유지.
- **Phoenix (Arize)**: arize-phoenix-evals v2.11.0. Langfuse와 역할 겹침. Python-heavy. hold.
- **Prefect 3**: Python workflow orchestration. MCP server 지원 추가. 현재 파이프라인 규모에서 도입 이득이 불명확. hold.

## Proposed Doc Updates

- `docs/ref/INGEST-STACK-DECISION.md`: OpenDataLoader PDF v2.0의 Apache 2.0 전환과 벤치마크 결과 반영 필요. "PDF fallback 후보"에서 "PDF source 도입 시 Docling과 나란히 benchmark 대상"으로 격상 근거 추가.

## Sources

- [Defuddle npm](https://www.npmjs.com/package/defuddle)
- [Docling releases](https://github.com/docling-project/docling/releases)
- [Crawl4AI docs](https://docs.crawl4ai.com/)
- [Promptfoo GitHub](https://github.com/promptfoo/promptfoo)
- [Langfuse GitHub](https://github.com/langfuse/langfuse)
- [LiteLLM releases](https://github.com/BerriAI/litellm/releases)
- [MarkItDown releases](https://github.com/microsoft/markitdown/releases)
- [OpenDataLoader PDF v2.0 announcement](https://medium.com/data-and-beyond/opendataloader-pdf-v2-0-is-out-bb233a668ca8)
- [Firecrawl GitHub](https://github.com/firecrawl/firecrawl)
- [Phoenix Arize](https://github.com/Arize-ai/phoenix)
- [Prefect releases](https://github.com/PrefectHQ/prefect/releases)
