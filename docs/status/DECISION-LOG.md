# Decision Log

이 문서는 `source`, `tool`, `orchestration` 관련 보류 결정을 한 곳에 모아두는 운영 로그다.

## Resolved

### 2026-03-22 — Showcase Sidecar Lane Boundary
- 상태: resolved
- 결정:
  - `showcase`는 자동 `brief/discover` 파이프라인과 분리된 수동 큐레이션 sidecar lane으로 운영한다.
  - 첫 공개 surface는 홈 티저와 `/radar` showcase picks 섹션이다.
  - 운영 surface는 `/admin/showcase`를 사용한다.
  - 향후 로그인 기반 사용자 submission도 ingest/classify 본선이 아니라 showcase lane 안에서만 처리한다.
- 근거:
  - 기존 `target_surface = brief | discover | both | archive | discard`는 자동화 파이프라인 의미를 유지해야 한다.
  - discovery와 showcase를 같은 저장 레일에 섞으면 human-on-exception, publish queue, projection 해석이 흐려진다.
  - 별도 `showcase_entries` / `showcase_links` 레인이 public/admin 브랜드 경험은 확장하면서 파이프라인 안정성은 유지한다.

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

### 2026-03-22 — Auto-Safe Live Fetch v0 Start Set
- 상태: resolved
- 결정:
  - 첫 live source fetch 연결은 `auto-safe` 중 `OpenAI News`, `Google AI Blog`, `GitHub Releases`부터 연다.
  - `OpenAI API Changelog`, `Anthropic Research`는 registry에는 남기되 stable endpoint 확인 전까지 disabled로 둔다.
- 근거:
  - `OpenAI News` RSS, `Google AI Blog` RSS, `GitHub Releases` API는 실제 fetch 검증에 성공했다.
  - `Anthropic Research` 후보 RSS endpoint는 404를 반환했다.
  - `OpenAI API Changelog`는 stable RSS/API endpoint가 아직 정리되지 않아 첫 live spine에는 넣지 않았다.
- 다음 작업:
  - live fetched item을 `ingest_runs -> ingested_items -> item_classifications` 저장 spine에 연결
  - disabled source의 stable endpoint를 다시 조사
- 기준 문서:
  - `docs/ref/SOURCE-CATALOG.md`
  - `docs/ref/INGEST-STACK-DECISION.md`

### 2026-03-22 — Local Ingest Spine Snapshot v0
- 상태: resolved
- 결정:
  - live fetch 결과는 우선 로컬 snapshot 형태로 `sources -> ingest_runs -> ingested_items -> item_classifications` 구조에 맞춰 저장한다.
  - backend의 `sources / runs / inbox / review / publish / exceptions` 조회는 snapshot이 있으면 그것을 우선 읽고, 없으면 기존 mock으로 fallback한다.
  - web의 동일 화면도 backend use case를 통해 snapshot-backed 데이터를 읽는다.
- 근거:
  - `pipeline:live-ingest` 실행으로 5 source row, 3 run row, 9 ingested item row, 9 classification row가 생성됐다.
  - backend 조회 결과도 `sources 5 / runs 3 / inbox 9 / review 4 / publish 5 / exceptions 4`로 snapshot 값을 읽는 것을 확인했다.
  - Supabase apply 전에도 저장 spine과 화면 소비 경로를 먼저 검증할 수 있다.
- 다음 작업:
  - snapshot을 Supabase 실제 테이블 write로 교체
  - dedupe, retry, failure history를 row 수준으로 정교화
- 기준 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/ref/ARCHITECTURE.md`

### 2026-03-22 — Supabase Remote Write Path v0
- 상태: resolved
- 결정:
  - `pipeline:supabase-migrate`와 `pipeline:supabase-sync` 스크립트를 추가해 원격 Supabase에 migration apply와 live ingest sync를 실행할 수 있게 준비한다.
  - `SUPABASE_DB_URL`에 placeholder가 남아 있으면 실행을 즉시 중단한다.
  - sync 레이어는 `public.*` schema-qualified upsert와 stable UUID mapping을 사용해 로컬 snapshot id를 원격 UUID 스키마에 맞춰 저장한다.
- 근거:
  - migration runner는 현재 `supabase/migrations/*.sql`을 순서대로 적용하도록 구성했다.
  - sync runner는 live ingest snapshot을 `sources / ingest_runs / ingested_items / item_classifications`에 upsert하도록 구성했다.
  - 실제 원격 migration apply와 live ingest sync를 실행했고 `sources 5 / ingest_runs 3 / ingested_items 9 / item_classifications 9` row count를 확인했다.
  - 첫 원격 sync에서 local snapshot id가 UUID 형식이 아니라 실패했고, 이를 stable UUID mapping으로 보정했다.
- 다음 작업:
  - Supabase read path 전환 적용
  - dedupe, retry, failure history를 row 수준으로 정교화
- 기준 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/status/PROJECT-STATUS.md`

### 2026-03-22 — Supabase Read Path v0
- 상태: resolved
- 결정:
  - backend의 `sources / runs / inbox / review / publish / exceptions` 조회는 `SUPABASE_DB_URL`이 있으면 Supabase projection을 우선 사용한다.
  - Supabase read가 불가능하면 live snapshot, 그다음 mock 순서로 fallback한다.
  - web의 admin/public source 화면도 같은 backend use case를 통해 이 경로를 사용한다.
- 근거:
  - remote row를 `source / run / inbox / review / publish / exceptions` projection으로 재구성하는 read module을 추가했다.
  - 실제 원격 read 확인 결과 현재 enabled source 기준 `sources 3 / runs 3 / inbox 9 / review 9 / publish 0 / exceptions 9`를 반환했다.
  - typecheck, build, unit test가 모두 통과했다.
- 다음 작업:
  - drafted stage와 publish queue를 원격 테이블 기준으로 분리 저장
  - read/write 모두에서 dedupe, retry, failure history를 row 수준으로 정교화
- 기준 문서:
  - `docs/ref/ARCHITECTURE.md`
  - `docs/ref/SCHEMA.md`

### 2026-03-22 — Editorial Draft Spine v0
- 상태: resolved
- 결정:
  - ingest 결과를 `brief_posts / discover_items / discover_actions / admin_reviews`까지 확장 저장한다.
  - public `brief`, `brief/[slug]`, `radar`와 admin `briefs`, `discover`는 이 editorial spine을 Supabase-first로 읽는다.
  - brief는 `source_links`, `source_count`를 함께 저장하고, discover는 action rows를 별도 테이블로 저장한다.
- 근거:
  - 새 migration으로 `discover_items`, `discover_actions`, `brief_posts` 확장 컬럼을 추가했다.
  - 실제 원격 sync 후 row count는 `brief_posts 9 / discover_items 4 / discover_actions 8 / admin_reviews 8`이었다.
  - 실제 read 확인 결과 `briefs 9`, `brief detail ok`, `discover 4`, `first discover actions 2`를 반환했다.
  - lint, typecheck, build, unit test가 모두 통과했다.
- 다음 작업:
  - `scheduled/published` 기준 publish queue를 editorial 테이블 중심으로 재구성
  - discovery status와 action-link 품질 규칙을 운영 정책에 맞춰 정교화
- 기준 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/ref/PIPELINE-OPERATING-MODEL.md`

### 2026-03-22 — Classifier Stage Winner
- 상태: resolved
- 결정:
  - `classifier` stage candidate는 `claude-sonnet-4-6`로 승격한다.
  - active baseline이던 `mistral-small3.1`은 fallback으로 유지한다.
- 근거:
  - Sonnet으로 Claude runner를 고정한 뒤 40-sample classifier shadow trial을 다시 기록했다.
  - active `mistral-small3.1` exact match는 57.5%, candidate `claude-sonnet-4-6` exact match는 95.0%였다.
  - exception queue inflow는 active 52.5%, candidate 10.0%로 candidate가 더 낮았다.
  - runbook의 minimum sample gate를 충족했다.
- 다음 작업:
  - `telegram-orchestrator` activate step 실행
  - 최소 observation window 유지
  - 다음 stage인 `brief draft` shadow trial 시작
- 기준 문서:
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Claude Runner Default To Sonnet
- 상태: resolved
- 결정:
  - `telegram-orchestrator`의 Claude runner 기본 모델은 `claude-sonnet-4-6`를 사용한다.
  - 필요하면 `ROUTER_CLAUDE_MODEL` 환경 변수로 override할 수 있다.
- 근거:
  - `../telegram-orchestrator/bin/run-claude.sh`에 `--model "$CLAUDE_MODEL"`을 추가했고 기본값을 `claude-sonnet-4-6`로 설정했다.
  - Claude runner smoke test는 `SONNET_OK` 응답으로 통과했다.
  - Sonnet 기준 classifier shadow trial 재기록도 완료했다.
- 기준 문서:
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`
  - `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`

### 2026-03-22 — Brief Draft Stage Winner
- 상태: resolved
- 결정:
  - `brief draft` stage candidate는 `claude-sonnet-4-6`로 승격한다.
  - active baseline이던 `mistral-small3.1`은 fallback으로 유지한다.
- 근거:
  - 20-sample `brief draft` shadow trial gate를 충족했다.
  - active `mistral-small3.1` task success는 0.0%, candidate `claude-sonnet-4-6` task success는 100.0%였다.
  - exception queue inflow는 active 90.0%, candidate 10.0%로 candidate가 더 낮았다.
  - brief source fidelity와 summary quality가 candidate 쪽에서 더 안정적으로 유지됐다.
- 다음 작업:
  - `discover draft` shadow trial 시작
  - classifier activate step과 observation window는 `telegram-orchestrator`에서 계속 추적
- 기준 문서:
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Discover Draft Stage Winner
- 상태: resolved
- 결정:
  - `discover draft` stage candidate는 `claude-sonnet-4-6`로 승격한다.
  - active baseline이던 `mistral-small3.1`은 fallback으로 유지한다.
- 근거:
  - 20-sample `discover draft` shadow trial gate를 충족했다.
  - active `mistral-small3.1` task success는 0.0%, candidate `claude-sonnet-4-6` task success는 100.0%였다.
  - confidence stability는 active 80.0%, candidate 100.0%였다.
  - exception queue inflow는 active 100.0%, candidate 0.0%로 candidate가 더 낮았다.
  - category fit, action-link quality, CTA clarity가 candidate 쪽에서 더 안정적으로 유지됐다.
- 다음 작업:
  - `critic` shadow trial 시작
  - classifier activate step과 observation window는 `telegram-orchestrator`에서 계속 추적
- 기준 문서:
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Critic Stage Winner
- 상태: resolved
- 결정:
  - `critic` stage candidate는 `claude-sonnet-4-6`로 승격한다.
  - active baseline이던 `mistral-small3.1`은 fallback으로 유지한다.
- 근거:
  - 25-sample `critic` shadow trial gate를 충족했다.
  - active `mistral-small3.1` task success는 64.0%, candidate `claude-sonnet-4-6` task success는 96.0%였다.
  - confidence stability는 active 92.0%, candidate 100.0%였다.
  - memory false positive drift는 active 16.0%, candidate 0.0%였다.
  - exception queue inflow는 active 36.0%, candidate 8.0%로 candidate가 더 낮았다.
- 다음 작업:
  - orchestration mode comparison 실행
  - classifier activate step과 observation window는 `telegram-orchestrator`에서 계속 추적
- 기준 문서:
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Telegram Orchestrator Stage Activation Boundary
- 상태: resolved
- 결정:
  - `telegram-orchestrator`의 `/model-activate`와 `/model-rollback`은 이제 role target과 stage target을 분리해서 받는다.
  - `router/search/memory`는 role activation 대상으로 유지한다.
  - `classifier`, `brief draft`, `discover draft`, `critic`는 stage pointer activation 대상으로 분리한다.
  - stage pointer activation은 runtime `chat/router/search/memory` active를 바꾸지 않는다.
- 근거:
  - 기존 activate 구현은 `chat/router/search/memory`를 한 번에 모두 바꿔서 VibeHub runbook과 충돌했다.
  - 수정 후 `classifier` stage pointer만 Sonnet으로 올려도 runtime roles는 모두 `mistral-small3.1`로 유지되는 것을 확인했다.
  - automatic rollback monitor는 runtime role activation에서만 켜도록 유지했다.
- 다음 작업:
  - classifier observation window 유지
  - `brief draft`, `discover draft`, `critic` stage activation 순서 확정
  - orchestration mode comparison 실행
- 기준 문서:
  - `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`
  - `docs/ref/ORCHESTRATION-TRIAL-RUNBOOK.md`

### 2026-03-22 — Legacy Public Cleanup
- 상태: resolved
- 결정:
  - legacy public table/trigger/function은 SQL backup 후 cleanup한다.
  - `handle_new_user`는 `auth.users` trigger를 살리기 위해 no-op 함수로 교체한다.
- 근거:
  - app code는 legacy public tables를 참조하지 않는다.
  - cleanup 전용 worker가 table data / function / trigger SQL backup을 생성했다.
  - cleanup commit 뒤 allowlist 외 public legacy table이 남지 않는 것을 확인했다.
- 기준 문서:
  - `docs/ref/SCHEMA.md`
  - `docs/status/PROJECT-STATUS.md`

### 2026-03-22 — Video Raw Storage Policy
- 상태: resolved
- 결정:
  - 원본 비디오는 Supabase DB에 저장하지 않는다.
  - raw video는 local disk 또는 NAS에 두고, DB `video_jobs`에는 metadata만 저장한다.
  - remote storage는 proxy / preview / transcript / final export 같은 파생 산출물 전용으로 둔다.
- 근거:
  - `video_jobs`는 상태 spine이며 raw blob 저장은 비용과 용량 면에서 비효율적이다.
  - watch folder worker와 schema expansion이 raw metadata fields를 기준으로 구현됐다.
- 기준 문서:
  - `docs/ref/VIDEO-PIPELINE.md`
  - `docs/ref/VIDEO-WORKER-CONTRACT.md`
  - `docs/ref/SCHEMA.md`

### 2026-03-22 — Orchestration Final Choice
- 상태: resolved
- 결정:
  - 최종 운영 기본값은 `hybrid`다.
  - runtime `chat/router/search/memory`는 `mistral-small3.1`로 유지한다.
  - `classifier`, `brief draft`, `discover draft`, `critic` stage pointer는 모두 `claude-sonnet-4-6`로 활성화한다.
- 근거:
  - stage-level shadow trial 4개가 모두 `claude-sonnet-4-6` 우세로 끝났다.
  - stage-scoped activation boundary가 이미 구현돼 runtime role과 stage pointer를 분리할 수 있다.
  - 실제 orchestrator SQLite 상태에서 4개 stage pointer가 모두 `claude-sonnet-4-6`로 활성화된 것을 확인했다.
- 기준 문서:
  - `docs/ref/TELEGRAM-ORCHESTRATOR-CONTRACT.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

### 2026-03-22 — Review And Publish Action Layer
- 상태: resolved
- 결정:
  - review decision과 publish transition은 backend action handler + admin UI Server Action 버튼으로 닫았다.
  - backend CLI (`review:decision`, `publish:action`)와 admin UI 양쪽에서 mutation 실행 가능.
- 근거:
  - `review / publish` read model은 이미 Supabase lifecycle 기준으로 전환돼 있었다.
  - `review:decision`, `publish:action` worker가 추가되어 approve / changes requested / reject / schedule / publish를 backend에서 바로 실행할 수 있다.
- 기준 문서:
  - `docs/status/PROJECT-STATUS.md`
  - `docs/status/EXECUTION-CHECKLIST.md`

### 2026-03-22 — News Pipeline Audit Stage Split
- 상태: resolved
- 결정:
  - 최신 IT 뉴스 파이프라인 `점검용` 프롬프트는 로컬 기본 경로가 아니라 agent runner 기본 경로로 둔다.
  - local `mistral-small3.1`는 `router/search/memory`와 짧은 후처리 요약에 남긴다.
  - repo-scale audit은 `Codex` 또는 `Claude`에 맡기고, 실제 수정/검증은 현재 기준 `Claude`를 우선한다.
- 근거:
  - `mistral-small3.1`로 30KB~40KB 수준의 실제 문서/코드 컨텍스트 audit을 시도했지만 수분 단위로 응답이 지연되어 실용적이지 않았다.
  - 같은 점검 프롬프트를 `Codex` read-only runner로 실행했을 때 약 `307150ms` 안에 실제 병목과 검증 포인트를 포함한 결과를 반환했다.
  - 실험 당시 snapshot, source registry, `typecheck`, `test:unit`까지 실제 상태 확인을 함께 수행했다.
- 기준 문서:
  - `docs/status/LOCAL-VS-AGENT-NEWS-PIPELINE-EVAL.md`
  - `docs/status/ORCHESTRATION-TRIAL-LOG.md`

## Next Review Order
1. ~~review / publish mutation 모델 확정~~ done — Server Action 버튼 구현 완료
2. ~~`SUPABASE_DB_URL` 환경변수 세팅 + end-to-end 검증~~ done — pipeline → UI E2E 검증 완료, Supabase query timeout 보호 적용
3. watch-folder auto-analysis output 연결
4. admin auth / observability hardening
