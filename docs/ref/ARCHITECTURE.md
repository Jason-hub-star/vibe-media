# VibeHub Media Hub Architecture

## Layers
- `apps/web`: public site + admin UI
- `apps/backend`: backend naming skeleton and future services
- `packages/content-contracts`: shared types and status values
- `packages/design-tokens`: visual tokens and asset specs
- `packages/media-engine`: 도메인 무관 미디어 처리 엔진
- `supabase`: schema and lightweight functions
- `tools/stitch`: design prompt and variant generation helpers

## Pipeline Spine
- pipeline reference: `docs/ref/PIPELINE-OPERATING-MODEL.md`
- source -> ingest run -> ingested item -> classification -> brief/discover -> review -> publish
- admin은 pipeline 중간 상태를 읽고 수정하는 control surface다.
- public은 v1에서 pipeline 최종 산출물뿐 아니라 Supabase editorial draft spine도 읽는다.
  - `/brief`, `/brief/[slug]`, `/radar`는 현재 Supabase-first editorial read를 사용한다.
- 역할 분리형 에이전트 팀은 `docs/ref/AGENT-OPERATING-MODEL.md`를 따른다.
- orchestration 최종 방식은 `docs/ref/ORCHESTRATION-EVALUATION.md` 실험 후 결정한다.
- source/tool 최종 채택은 `docs/ref/SOURCE-RESEARCH-METHOD.md` 결과를 따른다.
- LLM 역할 매핑은 `docs/ref/LLM-ORCHESTRATION-MAP.md`를 따른다.
- 현재 운영 기본값은 하이브리드다.
  - `chat/router/search/memory`: `qwen3.5-9b` (ollama, 로컬)
  - `classifier`, `brief draft`, `discover draft`, `critic`: `claude-sonnet-4-6`
- `packages/media-engine`: 도메인 무관 미디어 엔진 (이미지/텍스트/오디오/영상/스토리지/채널발행)
  - 기존 16개 모듈 구현 완료 (Kie.ai, Gemini, Sharp, Remotion spawn, Supabase Storage)
  - 채널 발행 모듈 구현 완료: `publish/` (Threads, Ghost/Tistory 스텁, dispatcher, cross-promo), `tts/` (NotebookLM bridge), `stt/` (Whisper STT, SRT 유틸), `remotion/` (BriefAudiogram), `brand.ts`, `spawn-async.ts`
  - 미완: `image/` (섹션별 AI 이미지, 후순위), `feedback/` (YouTube Analytics, 후순위)
  - 상세: `docs/ref/CHANNEL-PUBLISH-PIPELINE.md`

## Discovery Extension Surface
- public discovery lives at `/radar`
- admin curation registry lives at `/admin/discover`
- shared use case basename: `list-discover-items.ts`
- future category filters should extend contracts and presenters before splitting routes
- discovery items must keep direct actions such as `visit`, `download`, `docs`, `github`, or `apply`
- discovery taxonomy source: `docs/ref/DISCOVERY-TAXONOMY.md`
- discover export sidecar:
  - use case basename: `export-discover-to-obsidian.ts`
  - worker: `run-obsidian-discover-export.ts`
  - default sink: Obsidian vault markdown files under `Radar/*`
  - report sink: Telegram export summary with saved paths
  - source selection: Supabase approved discover items 우선, 내부 vault sync를 위해 unpublished approved row도 export 대상에 포함 가능
  - boundary: reads `discover_items` / `discover_actions`, never mutates ingest or classification state

## Showcase Sidecar Lane
- showcase는 자동 ingest/editorial spine과 분리된 수동 큐레이션 레인이다.
- public exposure:
  - `/` home teaser
  - `/radar` showcase picks section
- admin exposure:
  - `/admin/showcase`
- shared use case basename:
  - `list-showcase-entries.ts`
- `showcase_entries` / `showcase_links`는 `brief_posts` / `discover_items`와 다른 저장 레인을 사용한다.
- `supabase-editorial-sync`와 ingest sync는 showcase row를 생성하지 않는다.
- 향후 로그인 기반 submission도 이 lane에만 붙이고, `target_surface` 자동 분류 모델은 유지한다.

## Daily Pipeline Runtime
- 현재 `pipeline:daily`는 순차 배치 실행기이며 아래 순서를 따른다.
  1. `pipeline:live-fetch`
  2. `pipeline:live-ingest`
  3. `pipeline:supabase-sync`
  4. `pipeline:obsidian-export`
- Telegram은 pipeline stage report와 discover export summary를 별도 메시지로 보낸다.

## Supabase Read Protection
- `createSupabaseSql()`에 `connect_timeout: 10`, `idle_timeout: 20` 설정
- `readSupabaseProjectionBundle`, `readSupabaseSourceEntries`에 `Promise.race` 15s timeout 적용
- timeout 시 `null` 반환 → fallback chain (snapshot → mock) 동작

## Naming Policy
- domain basename must match across frontend API, backend service, and shared contracts
- example: `list-briefs.ts` in web and backend both exist for the same use case

## Frontend Ownership Rule
- Claude는 `apps/web`와 `docs/design/*`를 우선 책임진다
- 새 화면을 추가할 때는 대응하는 `docs/design/prompts`, `docs/design/decisions`, `docs/design/tokens` 문서를 함께 만든다
- 기능 확장 전 `packages/design-tokens`와 `packages/ui-patterns`를 먼저 확인한다
