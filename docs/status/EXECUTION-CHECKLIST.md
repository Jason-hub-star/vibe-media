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
- [~] page-level loading/empty/error 상태 강화 (route-group level 구현 완료, brief/radar/home loading.tsx 추가, 나머지 page-level은 미완)
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
- [x] 검색 + 카테고리 필터 (공용 FilterBar, brief topic 필터, radar category 필터)
- [x] `/radar/[id]` 공개 상세 페이지 (JSON-LD Thing, 동적 OG/Twitter 이미지, sitemap 확장)
- [x] URL 기반 필터 동기화 (brief `topic`+`q`, radar `group`+`q`, debounce 300ms)
- [x] 관련 브리프 섹션 (brief 상세 하단 topic 기반 매칭, discover 상세 relatedBriefSlugs 매칭)
- [x] favicon + apple-touch-icon (ImageResponse 동적 생성)
- [x] OG 이미지 브랜드 하드코딩 제거 (6파일 → colorTokens + brandTokens + categoryAccentHex)
- [x] URL 필터 공용 훅 추출 (useFilterUrlSync — BriefList/DiscoverList 중복 제거)
- [x] `/seo-check` 스킬 추가 (route별 SEO 완성도 점검)
- [x] SEO 하드닝 (sitemap `lastModified` 안정화, `/admin` noindex/disallow, Naver verification + Organization `sameAs` env 구조)
- [x] Editorial guardrail auto-approve (`review:auto-approve`, qualityScore/dedup/confidence/source-tier hold, daily-editorial-review 연동)
- [x] i18n 다국어 라우트 재구성 (`[locale]/(public)/` prefix, middleware, hreflang, sitemap × 2)
- [x] 구 `(public)/` 라우트 제거 → `[locale]/(public)/`만 유일 정본
- [x] i18n Translation Worker + Quality Gates + Video Fan-out + Channel Publish per Locale
- [x] `/admin/translations` 번역 대시보드
- [x] Submit Tool 허브 (`/sources` → 3레인 허브 + `tool_submissions` + admin submissions)
- [x] Imported Candidates sidecar lane (`tool_candidate_imports` + `/admin/imported-tools` + source registry lane 분리)
- [x] imported candidate source seed hardening (`tool_candidate` source registry migration seed/upsert + GitHub query 기본값 교정)
- [x] Vercel 프로덕션 배포 (`vibehub.tech` 도메인 연결, 빌드 에러 수정, 환경변수 설정)
- [x] **M11-A**: Brief 카드 텍스트 절단 + 위계 정리 (max-width, line-clamp, 2-tier 구조)
- [x] **M11-B**: Brief 카드 전체 클릭 영역화 (stretch link overlay + a11y)
- [x] **M11-C**: Discover 카드 미세 조정 (26ch→32ch, line-height 통일)
- [x] **M11-D**: Newsletter CTA 홈페이지 삽입 + slug dedup 방어
- [x] public hub page overhaul (body 1rem, muted 0.82, button 600, card line-height, showcase/custom 빈 섹션 제거, 카피 리뉴얼, locale prefix, lead card, shadow 경감, skeleton loading, 2-step responsive 900→768)
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
- [x] design inspiration 확장 (`design_token` category + Obsidian `Design Tokens` export + editorial RSS 8개 seed)
- [x] live ingest snapshot source UUID 보존 (`public.sources.id` 유지로 sync/export/source linkage 안정화)
- [x] discover sync publish hydration (approved discover row에 `published_at` 자동 채움, `/radar` 공개 gate와 일치)
- [x] `radar` 카테고리 필터 URL 동기화 (`/radar?category=X&q=Y`)
- [x] Featured discover 재노출 규칙 정리 (기본 index에서는 중복 제거, category/search 필터 시 결과 목록에 포함)
- [x] `tracked / watching / featured` 노출 규칙 정리 — DISCOVERY-TAXONOMY.md Exposure Rules 섹션 추가
- [x] `brief`와 `discover` 동시 노출 기준 고정 — relatedBriefSlugs 자동 매칭 구현 (태그/카테고리 교차)
- [x] action link 검증 규칙 정리 — isValidActionHref() 유틸 + DiscoverCard/radar detail 필터 적용

## P3 — Hardening
- [x] auto-publish 워커 구현 (`publish:auto`, `publish:auto-dry`) — approved 브리프 quality check → scheduled → published 자동 전환
- [x] auto-publish skip recovery + editorial integrity guard (`publish:repair-state`, `automation:check`, Supabase retry/backoff)
- [x] Supabase migration replay 안전화 (`channel_publish_results`, `locale variant` migration에 idempotent guard 추가)
- [x] Supabase retention worker (`pipeline:supabase-retention`) — 오래된 publish/retry/run log prune + `archive` / `discard` ingest payload compaction
- [x] Supabase read-path slimming — inbox summary-only projection, public latest limited query, `/admin/submissions` + `/admin/imported-tools` 200건 cap
- [x] Channel Publish Pipeline v2 설계 문서 — `CHANNEL-PUBLISH-PIPELINE.md` 전면 개편
- [ ] admin 실제 인증/권한 모델 설계
- [x] showcase submission intake flow (`tool_submissions` + 비로그인 폼 + 자동 심사 + promote/reject)
- [ ] showcase submission auth flow 설계 (로그인 기반 제출 + accounts 연결)
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
- [x] A-4a: brief Jaccard 중복 감지 워커 (`dedup:guard`) — title/summary Jaccard + 동일 source_links 비교 + `[DUPLICATE]` 태깅 + Telegram 보고
- [ ] A-4b: brief 간 의미적 유사도 중복 감지 (Gemini embedding) — Jaccard 위에 추가 레이어
- [x] A-5a: 소스→brief 품질 상관분석 + maxItems 자동 조정 제안 (`source:health`) — 제안만, 자동 실행 아님
- [x] A-5b: 주간 품질 리포트 → Telegram 발송 (`source:health` 워커에 통합)
- [x] 소스 자동 발견 (`source:health`) — brief source_links 역추적으로 신규 도메인 후보 발견
- [ ] 소스 자동 발견 cron 확장 (HN/GitHub Trending)
- [x] 비활성 소스 자동 비활성화 (`source:health`) — 최근 7일 실패 소스 자동 비활성화
- [ ] 비활성 소스 월 1회 재검증 (사이트 리뉴얼 후 URL 변경 대응)

## P3 — Channel Publish (v2 설계 완료 → 코드 구현 완료)
- [x] P1: Threads API 연동 (`threads-publisher.ts`) — 공식 API, 250건/일, dryRun 지원
- [x] ~~P2: NotebookLM CLI → 팟캐스트 M4A 생성~~ — 레거시 (2026-03-31 동결, 코드 삭제)
- [x] P3a: Whisper STT + Gemini 번역 (`whisper-stt.ts`, `srt-utils.ts`) — SRT 파싱/생성/번역
- [x] P3b: Remotion BriefAudiogram (`BriefAudiogram.tsx`, `render-audiogram.ts`) — 웨이브폼+자막+커버 Composition
- [x] P3c: 썸네일 생성 (`thumbnail-gen.ts`) — Sharp SVG 브랜드 + 커버 리사이즈 1280×720
- [ ] P3d: 섹션별 AI 이미지 (후순위 — YouTube retention 데이터 보고 결정)
- [x] P4: Ghost/WP API 스텁 (`ghost-publisher.ts`) — 인터페이스 구현, API 연동 미완
- [x] P5: 팟캐스트 메타데이터 (`spotify-metadata.ts`) — JSON 생성 완전 구현
- [x] P6: 크로스 프로모션 2-pass + 3rd pass (`cross-promo-sync.ts`) — 완전 구현
- [x] P7: 티스토리 스텁 (`tistory-publisher.ts`) — 인터페이스 구현, API 연동 미완
- [x] Publish Dispatcher (`publish-dispatcher.ts`) — Promise.allSettled 병렬 + 실패 격리
- [x] Backend CLI (`publish:channels`, `publish:link-youtube`, `youtube:setup`)
- [x] YouTube Data API v3 자동 업로드 (`youtube-api.ts`) — OAuth2 비공개 업로드 + brief 자동 링크 + 로컬 fallback
- [ ] P8: YouTube Analytics + GA4 피드백 수집기 (`analytics-collector.ts`)
- [ ] P9: insight-generator 주간 리포트 (`insight-generator.ts`)
- [x] Supabase 스키마 확장 — channel_publish_results + publish_dispatches 테이블 생성 (2026-03-26)
- [x] 채널 발행 DB 저장 + Telegram 보고 연결 (channel-publish-report.ts)
- [x] daily-auto-publish.md §9 채널 발행 단계 추가
- [x] 크로스프로모 본문 발행에서 분리 (skipCrossPromo 옵션) — 채널 2개 이상 시 별도 워커 예정
- [ ] channel_metrics 테이블 (YouTube Analytics + GA4 피드백 연동 시)
- [ ] Ghost/Tistory 실제 API 연동 — 티스토리 API 2023-11 폐쇄 (신규 불가), Ghost는 셀프호스팅 시 연동 가능
- [x] Threads 실제 토큰 확보 + 라이브 테스트 — @vibehub1030 발행 성공 (2026-03-26)
- [x] Threads 토큰 갱신 + 만료일 추적 — 2026-05-25 만료, THREADS_TOKEN_EXPIRES 환경변수 추가
- [x] 오디오/비디오 E2E 검증 완료 (2026-03-27) — ~~NLM+아바타 경로 레거시 (2026-03-31 삭제)~~
  - 현재 메인: Shorts (Pexels+MimikaStudio+Remotion BriefShort V3) + Longform (동일 엔진, 16:9)
- [x] daily-media-publish.md 자동화 프롬프트 — Shorts/Longform 트랙으로 갱신 (2026-03-31)
- [x] Shorts/Longform 통합 렌더 워커 (`video:render <slug>`) — Chatterbox 2문장 청크 + hallucination 가드 + whisper-cpp + 프레임 균등 + 타이틀/자막/CTA 타이밍 분리 + 80-100w ES 스크립트, 83 테스트 (2026-03-31)
- [x] Remotion 인트로/아웃트로 검증 — BrandIntro(3초) + BrandOutro(5초)
- [x] 전체 자동화 체인 실전 검증: 9건 published + 미디어 합성
- [x] approved+draft 상태 꼬임 방지 DB 트리거 (trg_fix_approved_draft)
- [x] MimikaStudio 1인 나레이션 경로 검증 (Qwen3-TTS + 주인님 목소리 복제) — 완료, Shorts TTS 엔진으로 채택
- [x] @remotion/captions 워드바이워드 자막 애니메이션 — BriefShort V2에 spring 바운스 구현 완료
- [ ] Threads 토큰 자동 갱신 워커 (만료 7일 전 Telegram 경고 + refresh API 호출)

## P3 — Shorts Pipeline (9:16, 50-58초)
- [x] MimikaStudio Qwen3-TTS 목소리 클론 등록 (woman-es, 10초 클린 클립)
- [x] Gemini 60초 나레이션 스크립트 자동 생성
- [x] MimikaStudio REST API → 클론 음성 WAV 생성
- [x] Whisper STT word-level 타임스탬프 추출
- [x] Remotion BriefShort V2 Composition (1080×1920, 30fps)
  - [x] 씬별 배경 이미지 + Ken Burns 줌/팬 (zoom-in, zoom-out, pan-left, pan-right)
  - [x] 워드바이워드 하이라이트 자막 (spring 바운스 + 금색 active)
  - [x] 프로그레스 바 (상단, 그라데이션)
  - [x] 타이틀 카드 (첫 3초, spring 등장 + 페이드아웃)
  - [x] CTA 엔딩 (마지막 4초, pulse 효과 + 서브텍스트)
  - [x] 브랜드 워터마크 (상시 표시)
- [x] ffmpeg 합성 (map 0:v + map 1:a, loudnorm -16 LUFS)
- [x] 프로토타입 풀 파이프라인 성공 (51.8초, Brief → 최종 MP4)
- [x] Pexels API 키 발급 + 키워드 기반 자동 배경 수집
- [ ] shorts:render CLI 워커 자동화 (`npm run shorts:render`)
- [ ] daily pipeline 자동 연결 (Long-form과 병렬)
- [x] YouTube 자동 업로드 — publish:channels가 shorts/longform.mp4 자동 감지 → YouTube API v3 (unlisted) + brief 자동 연결 + Shorts #Shorts 태그

## P3 — 스페인어 올인 + 7채널 확장 (2026-03-30)
### Phase 1: 스페인어 기반 전환
- [x] M1: MimikaStudio 스페인어 TTS 검증 — `language: "Spanish"` + `woman-es` 12.88초 WAV 성공 (temp 0.3)
- [x] M1-fallback: Edge TTS 스페인어 검증 — `es-MX-DaliaNeural` 7.97초 MP3 성공
- [x] M2: Pexels Video API 연동 — portrait 1,060건/landscape 8,000건, HD h264 1080x1920 확인
- [x] M2: BriefShort V4 (`videoSrc` + `OffthreadVideo`) Remotion 비디오 배경 지원
- [x] M3: shorts-render 스킬 프롬프트 스페인어 모드 추가

### Phase 2: 7채널 확장
- [ ] M4: YouTube ES 채널 생성 + OAuth 토큰 발급
- [x] M5: X/Twitter Publisher (`x-publisher.ts`) — OAuth 1.0a + API v2 스레드 + Media Upload
- [x] M6: Instagram Reels Publisher (`instagram-publisher.ts`) — Graph API Container → Publish
- [x] M7: Podcast RSS Publisher (`podcast-rss-publisher.ts`) — RSS XML 자동 생성/갱신
- [x] M8: LinkedIn Publisher (`linkedin-publisher.ts`) — ugcPosts + REST API fallback
- [x] run-publish-channels.ts 7채널 등록 + VALID_CHANNELS 확장

### Phase 3: 멀티니치 기반
- [x] M9: `sources.brand` 필드 추가 + `loadSourcesFromDb(lane, brand)` 필터
- [ ] M10: 스페인어 RSS 소스 추가 (Xataka, Hipertextual, Genbeta 등)

### Phase 4: 썸네일 + 수익화
- [x] M11: 썸네일 자동화 — ffmpeg 비디오 프레임 추출 + Sharp 텍스트 오버레이
- [ ] M12: 스폰서 슬롯 자동 삽입 (구독자 1,000명 달성 후)

## P3 — Newsletter Pipeline
- [x] Resend API 키 발급 + 환경변수 설정 (`RESEND_API_KEY`)
- [x] Resend Audience 생성 (EN / ES 분리)
- [x] 뉴스레터 HTML 템플릿 구현 (inline-CSS, brief 카드 레이아웃)
- [x] published brief 자동 수집 → Broadcast 본문 생성 워커
- [x] Resend Broadcasts API 발송 (`newsletter:send` CLI)
- [x] dual-locale 발송 (EN + ES 각각 별도 Broadcast)
- [x] 홈페이지 CTA → Resend Contacts API 구독자 등록 연결
- [x] 발송 결과 Telegram 보고 (발송 완료/실패/스킵 + 구독자 알림)
- [x] unsubscribe 링크 + CAN-SPAM 준수 footer (`{{{RESEND_UNSUBSCRIBE_URL}}}`)
- [x] daily pipeline 자동 연결 (`blocking: false`, 맨 끝 스텝)
- [x] dry-run 지원 (`npm run newsletter:send-dry`)

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
4. **Channel Publish Phase B (텍스트 채널)** — Threads(P1) 라이브 완료. Ghost는 셀프호스팅 결정 후 연동. 티스토리 API 폐쇄로 보류. 네이버는 반자동만 현실적
5. **Channel Publish Phase C (미디어 채널)** — Shorts/Longform (Pexels+MimikaStudio+Remotion) 메인 트랙 전환 완료. NLM+아바타 레거시 삭제 (2026-03-31). 크로스 프로모션(P6) → 피드백 루프(P8~P9)
6. `Defuddle`로 저장된 `contentMarkdown`을 classifier/draft 품질 규칙에 더 직접 반영할지 결정한다.
7. watch folder worker 뒤의 auto-analysis / proxy / transcript / highlight 단계를 실제 작업기로 연결한다.
8. admin auth + admin role gating을 Supabase SSR auth로 교체한다.
9. observability / rollback / storage cleanup routine을 운영 문서와 함께 닫는다.
