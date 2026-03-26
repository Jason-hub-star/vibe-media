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
- [x] `/admin/inbox` 스캐폴드 구현
- [x] `/admin/runs` 스캐폴드 구현
- [x] `/admin/review` 스캐폴드 구현
- [x] `/admin/publish` 스캐폴드 구현
- [x] `/admin/exceptions` 스캐폴드 구현
- [x] `/admin/policies` 스캐폴드 구현
- [x] `/admin/programs` 스캐폴드 구현
- [x] `video_jobs` 상태 모델을 `auto analysis -> CapCut -> parent review -> private upload` 흐름으로 확장
- [x] `target_surface = brief | discover | both | archive | discard` 흐름을 UI와 데이터에 연결
- [x] `human-on-exception` 큐 조건을 실제 상태값으로 반영
- [x] `watch folder -> auto analysis -> CapCut -> parent review` 워커 계약 문서화
- [x] `video_jobs`를 publish queue / exceptions와 연결
- [x] `Brief + Discover` dry-run worker를 실제 실행 가능한 스크립트로 추가
- [x] `auto-safe` live source fetch worker 추가
- [x] live fetch 결과를 로컬 ingest spine snapshot에 저장
- [x] Supabase remote migrate/sync 스크립트 준비
- [x] brief/discover editorial draft 테이블 스키마 추가
- [x] ingest 결과를 brief/discover/admin review 원격 테이블로 확장 저장
- [x] editorial lifecycle 컬럼과 retry/failure attempt 테이블 추가
- [x] media public tables RLS enable
- [x] legacy public table SQL backup + cleanup worker 추가
- [x] `admin_reviews` / editorial lifecycle / blocked video 기준 Supabase read projection 전환
- [x] `watch folder` 워커 실제 구현 (`fs.watch` + `fs.watchFile` fallback)
- [x] review decision / publish transition backend action handler 추가
- [x] pipeline → UI end-to-end 검증 (pipeline-to-ui.spec.ts 8 tests)
- [x] Supabase query timeout 보호 (connect_timeout + Promise.race 15s)

## P1 — LLM / Orchestration
- [x] `LLM-ORCHESTRATION-MAP.md` 기준으로 단계별 실험표 작성
- [x] `classifier` shadow 비교 규칙 문서화
- [x] `brief draft` shadow 비교 규칙 문서화
- [x] `discover draft` shadow 비교 규칙 문서화
- [x] `critic` shadow 비교 규칙 문서화
- [x] `telegram-orchestrator`와 VibeHub 연동 계약 정리
- [x] `telegram-orchestrator` activation 경계를 role/stage로 분리
- [x] 로컬/Claude/hybrid 실험 로그 포맷 정의
- [x] `classifier` fixture-backed shadow trial 실행기 추가
- [x] `brief draft` fixture-backed shadow trial 실행기 추가
- [x] `discover draft` fixture-backed shadow trial 실행기 추가
- [x] `critic` fixture-backed shadow trial 실행기 추가
- [x] 첫 stage shadow trial 실행
- [x] first promote / keep-active decision 기록
- [x] classifier stage pointer activate
- [x] `brief draft` / `discover draft` / `critic` stage pointer activate
- [x] orchestration 기본값을 `hybrid`로 확정

## P1 — Source Research
- [x] 수집기 후보 조사
- [x] parser/PDF 후보 조사
- [x] source catalog 1차 배치 선정
- [x] source tier 분류표 작성
- [x] fallback 정책 확정
- [x] Phase 1 `Defuddle` article enrichment 연결
- [x] fixture-backed `trial:all` 운영 요약 추가

## P2 — Frontend / UX
- [x] public UX 내부 용어 제거 + 사용자 언어 전환 (hero/패널/status/footer/newsletter)
- [x] showcase sidecar lane foundation (`/` teaser + `/radar` picks + `/admin/showcase`)
- [x] admin 사이드바 탭 통합 15→12개 (`/admin/rules`, `/admin/collection`, `/admin/pending` 신규; 기존 6개 route redirect)
- [~] page-level loading/empty/error 상태 강화 (route-group level 구현 완료, brief loading.tsx 추가, 나머지 page-level은 미완)
- [x] 디자인 토큰 통일 (RGB 채널, purple, radius/type-scale 확장, CSS hardcode 141건 제거)
- [x] 모바일 반응성 강화 (누락 브레이크포인트, 터치 타겟 44px, 햄버거 메뉴, 테이블 스크롤, 파이프라인 패널)
- [x] `brief` UI 개선 (freshness badge, lead card, skeleton loading, prev/next nav, source chips, read time, hover preview)
- [x] brief detail page redesign (MetaBar, section parsing, source panel, insight callout)
- [x] admin brief quality checklist (title/summary/body/source/URL/internal-term 6항목)
- [x] review detail brief body preview (previewBody via title lookup)
- [x] admin dashboard AutomationTrail infinite loop fix (useSyncExternalStore snapshot caching)
- [x] Supabase connection pool deadlock fix (max:1→10, timeout 15s→8s) + timestamp string parse
- [x] review / publish mutation 버튼 (Server Actions)
- [x] exception retry action (retryable run/video 재시도 버튼)
- [x] admin 카드 가독성 개선 (제목 크기/굵기, 메타 grid, overflow 수정, 대시보드 카운트)
- [x] admin 사이드바 탭 통합 15→12개 + 파이프라인 흐름순 정렬
- [x] admin 탭 데이터 분리 (발행 필터, 수신함 필터, 브리프 상태 필터)
- [x] brief 검수 요청 + 예외 재시도 승격 액션
- [x] brief cover image 파이프라인 (RSS → DB → 프론트)
- [x] 레퍼런스 브리프 등록 (Quality Check 6/6 기준)
- [x] SEO 기반 구축 (favicon, robots.ts, sitemap.ts, per-page metadata, JSON-LD 3종, GA4, RSS, 공유 버튼, Footer 확장, Privacy/Terms)
- [x] 동적 OG 이미지 (opengraph-image.tsx + twitter-image.tsx, root + brief detail)
- [x] 검색 + 카테고리 필터 (공용 FilterBar, brief topic 필터, radar group 필터)
- [ ] admin 상태 UI 명확성 강화
- [ ] design docs route-by-route 확장
- [ ] placeholder asset -> real asset 교체 흐름 문서화
- [ ] `admin/video-jobs`를 CapCut handoff와 parent review 체크리스트 기준으로 고도화

## P2 — Discover / Brief Surface
- [x] discover 공개 발행 게이트 (`isPublished` 가드 — approved + published만 `/radar` 노출)
- [x] brief quality gate CLI 적용 (`review:decision`, `publish:action`에 `runBriefQualityCheck` 추가)
- [x] discover 자동 발행 (`daily-auto-publish`에 discover 경량 검증 + auto-publish 통합)
- [x] Category SSOT (`DISCOVER_CATEGORIES` 배열 1개로 타입/허용목록/라벨 통일)
- [x] radar 카테고리 그룹 UI (Featured 중복 제거 + 카테고리별 그룹 섹션 + 색상 pill + New 뱃지)
- [ ] `radar` 카테고리 필터 설계
- [ ] `tracked / watching / featured` 노출 규칙 정리
- [ ] `brief`와 `discover` 동시 노출 기준 고정
- [ ] action link 검증 규칙 정리

## P3 — Hardening
- [x] auto-publish 워커 구현 (`publish:auto`, `publish:auto-dry`) — approved 브리프 quality check → scheduled → published 자동 전환
- [x] auto-publish skip recovery + editorial integrity guard (`publish:repair-state`, `automation:check`, Supabase retry/backoff)
- [x] Channel Publish Pipeline v2 설계 문서 — `CHANNEL-PUBLISH-PIPELINE.md` 전면 개편
- [ ] admin 실제 인증/권한 모델 설계
- [ ] showcase submission/auth flow 설계
- [ ] observability / failure alert 설계
- [ ] retry / rollback / blocked 승격 정책 구체화
- [ ] 운영 주간 점검 루틴 문서화

## P3 — Pipeline Self-Improvement (Phase A, media-engine 조인 전)
- [x] A-1: 30개 소스 feed_url 검증 → 23개 활성 / 7개 비활성화 (404/403)
- [x] A-1: Source Registry DB SSOT 전환 (`loadSourcesFromDb()`) — 수집량 9→63건 (7배)
- [x] A-2: Brief Quality Score 확장 (pass/fail → 0~100 + A/B/C/D/F) — 레퍼런스 90점 vs 부실 60점 검증
- [x] A-2: 레퍼런스 brief [REFERENCE] 태깅 (GPT-5.4 mini) — 추가 레퍼런스는 editorial-review 자동화가 A등급 자동 태깅
- [x] Full Cycle 검증 — FK 버그 4건 수정, draft+approved 5건 리셋, 191건 로컬/19건 Supabase sync 확인
- [ ] A-3: classifier/draft/critic 프롬프트 구체화 + few-shot 레퍼런스 투입
- [ ] A-4: brief 간 의미적 유사도 중복 감지 (Gemini embedding)
- [ ] A-5: 소스→brief 품질 상관분석 + maxItems 자동 조정
- [ ] A-5: 주간 품질 리포트 → Telegram 발송
- [ ] 소스 자동 발견 cron (기존 brief source_links 역추적 + HN/GitHub Trending)
- [ ] 비활성 소스 월 1회 재검증 (사이트 리뉴얼 후 URL 변경 대응)
- [ ] 소스 자동 비활성화 (3회 연속 실패 → enabled=false)

## P3 — Channel Publish (v2 설계 완료, 검증 후 구현)
- [ ] P1: Threads API 연동 (`threads-publisher.ts`) — 공식 API, 250건/일
- [~] P2: NotebookLM CLI → 팟캐스트 M4A 생성 — CLI 실동작 검증 완료 (17분 2인대화, loudnorm 후처리 확정). `notebooklm-bridge.ts` 코드 구현 미완
- [ ] P3a: Gemini 섹션별 이미지 생성 (`gemini-image.ts`, 무료 $0)
- [ ] P3b: Remotion BriefPodcast Composition + 로컬 저장 (`BriefPodcast.tsx`)
- [ ] P4: Ghost/WP API 연동 (`ghost-publisher.ts`)
- [ ] P5: 팟캐스트 메타데이터 + Spotify 직접 업로드 가이드 (`spotify-metadata.ts`)
- [ ] P6: 크로스 프로모션 2-pass + 3rd pass (`cross-promo-sync.ts`)
- [ ] P7: 티스토리 Playwright (보조) (`tistory-publisher.ts`)
- [ ] P8: YouTube Analytics + GA4 피드백 수집기 (`analytics-collector.ts`)
- [ ] P9: insight-generator 주간 리포트 (`insight-generator.ts`)
- [ ] Supabase 스키마 확장 (channel_results, cross_promo, channel_metrics)

## Current Snapshot
- [x] 공개 사이트 기본 shell
- [x] admin 기본 shell
- [x] discovery/radar 기본 구조
- [x] 운영 문서 세트
- [x] LLM 병행 오케스트레이션 문서
- [x] video pipeline SSOT + `video_jobs` 상태 모델
- [x] video worker contract + queue routing
- [x] 파이프라인 실제 구현
- [x] live fetch 결과를 Supabase ingest spine에 저장
- [x] backend/admin read path를 Supabase-first fallback 구조로 연결
- [x] brief/discover read path를 Supabase-first 구조로 연결
- [x] `Brief + Discover` dry-run 실행기
- [x] Supabase SQL 실제 구현
- [x] admin 파이프라인 화면 실제 구현
- [x] admin sidebar 서랍 그룹화 (Pipeline / Editorial / Registry / Reference)
- [x] Pipeline Monitor를 `/admin` 메인 페이지로 승격 (`/admin/pipeline` redirect)
- [x] 노드 클릭 상세 패널, 실행 결과 요약, 실행 이력 (localStorage)
- [x] Source reliability 자기개선 패널
- [x] Telegram pipeline report module
- [x] daily pipeline automation script + cron
- [x] discover -> Obsidian sidecar export + Telegram 저장 경로 보고
- [x] Source 확장 전략 문서 (`docs/ref/SOURCE-EXPANSION-STRATEGY.md`)
- [x] article RSS source의 `contentMarkdown / parserName / parseStatus` 저장
- [x] `trial:all` baseline suite (`classifier / brief draft / discover draft / critic`)
- [ ] `/self-review` 커스텀 명령어
- [x] source/tool 최종 채택
- [x] orchestration 최종 채택
- [x] Channel Publish Pipeline v2 설계 문서 (`CHANNEL-PUBLISH-PIPELINE.md`)

## Recommended Next Sequence
1. ~~review / publish mutation과 schedule/publish action handler를 닫는다.~~ done
2. ~~Source Registry DB SSOT + Quality Score 확장~~ done (23개 활성, 63건/실행, 0~100 스코어)
3. **Pipeline Self-Improvement Phase A 나머지** — 레퍼런스 brief 선정(A-2) → 프롬프트 구체화(A-3) → 중복 감지(A-4) → 소스 피드백 루프(A-5) → 소스 자동 발견/비활성화
4. **Channel Publish Phase B (텍스트 채널 먼저)** — Threads(P1) → Ghost(P4). 텍스트만으로 발행, 성과 데이터 수집 시작
5. **Channel Publish Phase C (미디어 채널)** — NotebookLM(P2) → Gemini 이미지(P3a) → Remotion(P3b) → 크로스 프로모션(P6) → 피드백 루프(P8~P9)
6. `Defuddle`로 저장된 `contentMarkdown`을 classifier/draft 품질 규칙에 더 직접 반영할지 결정한다.
7. watch folder worker 뒤의 auto-analysis / proxy / transcript / highlight 단계를 실제 작업기로 연결한다.
8. admin auth + admin role gating을 Supabase SSR auth로 교체한다.
9. observability / rollback / storage cleanup routine을 운영 문서와 함께 닫는다.
