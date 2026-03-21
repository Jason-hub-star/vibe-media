# VibeHub Media Hub Architecture

## Layers
- `apps/web`: public site + admin UI
- `apps/backend`: backend naming skeleton and future services
- `packages/content-contracts`: shared types and status values
- `packages/design-tokens`: visual tokens and asset specs
- `supabase`: schema and lightweight functions
- `tools/stitch`: design prompt and variant generation helpers

## Pipeline Spine
- pipeline reference: `docs/ref/PIPELINE-OPERATING-MODEL.md`
- source -> ingest run -> ingested item -> classification -> brief/discover -> review -> publish
- admin은 pipeline 중간 상태를 읽고 수정하는 control surface다.
- public은 pipeline 최종 산출물만 소비한다.
- 역할 분리형 에이전트 팀은 `docs/ref/AGENT-OPERATING-MODEL.md`를 따른다.
- orchestration 최종 방식은 `docs/ref/ORCHESTRATION-EVALUATION.md` 실험 후 결정한다.
- source/tool 최종 채택은 `docs/ref/SOURCE-RESEARCH-METHOD.md` 결과를 따른다.
- LLM 역할 매핑은 `docs/ref/LLM-ORCHESTRATION-MAP.md`를 따른다.
- 현재 기본 후보는 하이브리드이며, `router/search/memory`는 로컬 우선으로 둔다.

## Discovery Extension Surface
- public discovery lives at `/radar`
- admin curation registry lives at `/admin/discover`
- shared use case basename: `list-discover-items.ts`
- future category filters should extend contracts and presenters before splitting routes
- discovery items must keep direct actions such as `visit`, `download`, `docs`, `github`, or `apply`
- discovery taxonomy source: `docs/ref/DISCOVERY-TAXONOMY.md`

## Naming Policy
- domain basename must match across frontend API, backend service, and shared contracts
- example: `list-briefs.ts` in web and backend both exist for the same use case

## Frontend Ownership Rule
- Claude는 `apps/web`와 `docs/design/*`를 우선 책임진다
- 새 화면을 추가할 때는 대응하는 `docs/design/prompts`, `docs/design/decisions`, `docs/design/tokens` 문서를 함께 만든다
- 기능 확장 전 `packages/design-tokens`와 `packages/ui-patterns`를 먼저 확인한다
