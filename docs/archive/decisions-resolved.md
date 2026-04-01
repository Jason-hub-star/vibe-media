# Resolved Decisions Archive

완료·구현된 결정 기록. 현재 진행 중인 결정은 `docs/status/DECISION-LOG.md` 참조.

---

### 2026-04-01 — canonical brief는 영어만 허용하고 한글 copy는 승인 전 정규화
- 상태: resolved
- 배경: published brief 29건 중 4건이 한국어 title/summary로 canonical DB에 그대로 발행되었다. 한국 AI 매체 소스의 원문이 `brief_posts` canonical row에 직접 들어오고 있었고, 이후 sync도 같은 source item을 다시 덮어쓸 수 있었다.
- 결정:
  - canonical brief 품질 게이트에 English-only 규칙을 추가한다
  - auto-approve 단계에서 한글 brief를 만나면 Gemini로 영어 canonical copy를 정규화한 뒤 승인한다
  - 번역 키가 없거나 정규화가 실패하면 auto-approve hold로 멈춘다
  - scheduled/published 등 locked brief는 sync 시 기존 canonical copy를 보존해 수동 보정 내용이 덮어써지지 않게 한다
  - 이미 발행된 한글 canonical brief는 별도 repair worker와 수동 DB 보정으로 즉시 정리한다
- 영향: canonical `brief_posts`는 영어를 유지하고, locale 확장은 variant 테이블로만 가게 된다. 운영 환경에서 번역 키가 빠지면 한글 brief가 조용히 발행되지 않고 review 단계에서 멈춘다.

### 2026-04-01 — source-registry SQL 조건 분기 수정 (autoresearch keep)
- 상태: resolved
- 배경: `loadSourcesFromDb`의 조건부 `sql` fragment가 retry 프록시를 통해 fragment 대신 DB 쿼리로 처리되어 syntax error 발생 → 28개 활성 소스 대신 3개 하드코딩 fallback으로 강등
- 결정: 조건부 fragment 대신 brand 유무에 따라 두 개의 독립 쿼리로 분기
- 영향: 소스 로드 커버리지 3 → 28개 복구

### 2026-03-31 — Chatterbox TTS 전환 + NLM 팟캐스트 레거시 삭제
- 상태: resolved
- 배경: Qwen3 TTS가 hallucination/OOM/서버 크래시 반복 → Chatterbox 2문장 청크로 안정화. NLM 팟캐스트는 수동 다운로드 의존 + 더 이상 사용하지 않아 전체 삭제
- 결정: MimikaStudio Chatterbox 엔진을 Shorts/Longform TTS 기본으로 채택. NLM 관련 코드 전량 삭제 (커밋 b855935)
- 근거: Chatterbox 12/12 청크 성공, 크래시 0. Qwen3 1.7B OOM, 0.6B hallucinate(163초), 서버 크래시(6/12)
- 영향: tts/qwen3-client.ts가 Chatterbox 엔진 기본 사용. notebooklm-bridge.ts 삭제됨

### 2026-03-31 — 채널 크로스프로모 활성화 + locale-aware 발행
- 상태: resolved
- 배경: skipCrossPromo=true 하드코딩으로 Threads 답글 크로스프로모 미실행. YouTube/Podcast/Newsletter에 상호 링크 부재. Shorts YouTube 업로드 시 EN 메타데이터로 ES 영상 발행
- 결정: Pass 2 크로스프로모 활성화 (skipCrossPromo: false). YouTube 설명에 Podcast 링크 추가 + ES 레이블. Podcast 에피소드에 사이트/Threads/YouTube 링크. Newsletter 푸터에 소셜 링크. Shorts 업로드 시 render-meta.json locale 감지 → variant 메타데이터 적용
- 근거: 채널간 트래픽 순환이 발행 전략의 핵심인데, 크로스프로모가 전혀 작동하지 않았음
- 영향: publish:channels 실행 시 Threads에 크로스프로모 답글 자동 생성. brand.ts에 YOUTUBE_CHANNEL, PODCAST_URL 상수 추가

### 2026-03-31 — Shorts YouTube 업로드 locale 자동 감지
- 상태: resolved
- 배경: Shorts 영상은 ES로 생성되지만 Brief canonical locale은 EN → YouTube 제목/설명이 영어로 올라가는 미스매치
- 결정: `render-meta.json`의 `shorts.locale`을 읽어 canonical과 다르면 `brief_post_variants`에서 해당 locale의 제목/요약 조회 → YouTube 메타데이터(title, language, briefUrl, DB locale)에 반영
- 근거: 영상 내용과 메타데이터 언어가 일치해야 YouTube 추천 알고리즘이 올바른 시청자에게 노출함. variant 미존재 시 영어 fallback으로 안전
- 영향: `run-publish-channels.ts` Shorts 업로드 섹션 수정. 기존 EN-only brief에는 영향 없음 (shortsLocale === canonicalLocale이면 기존 동작 유지)

### 2026-03-30 — 발행 전략: EN 원본 유지 + ES 확장
- 상태: resolved
- 결정:
  - **EN 원본 유지**: Threads EN, Newsletter EN, 웹사이트 EN — 기존 영어 트래픽/구독자 보존
  - **ES 확장 추가**: YouTube ES 영상, Threads ES 별도 게시, Newsletter ES audience, Podcast ES
  - Brief 1건 → EN 원본 + ES 확장 동시 발행
  - 최종 발행 채널: YouTube (EN+ES 재생목록), Threads (EN+ES), Newsletter (EN+ES 별도 워커), Podcast (Spotify RSS)
  - 구현 상태: Threads ES ✅, YouTube ES ✅ (locale loop에서 publisher 재등록), Podcast ES ✅ (locale별 feed 업로드), Newsletter ES 별도 워커
  - X/Twitter 드롭: Free 티어에서 트윗 작성 불가, Basic $100/월 → $0 원칙 위반
  - Instagram Reels 드롭: Threads가 이미 Meta 생태계 커버. 별도 App Review + 공개 비디오 URL 호스팅 오버헤드 대비 가치 없음
  - LinkedIn 드롭: API 신청 1-2주 대기 + 토큰 60일 갱신. 수동 공유로 대체 가능
  - YouTube는 기존 채널에 ES 재생목록 추가 (별도 채널 불필요)
  - Podcast: Supabase Storage `podcast` bucket(public) → feed.xml 자동 갱신 → Spotify 자동 감지
  - MimikaStudio `language: "Spanish"` + `woman-es` TTS 기본 보이스 전환 (10초 클린 클립, temp 0.3, ffmpeg 후처리)
  - Edge TTS fallback 검증 완료 (`es-MX-DaliaNeural`, venv 필요)
  - Pexels Video API 연동 (portrait 1,060건, landscape 8,000건, HD h264)
  - BriefShort V4: `ShortScene.videoSrc` + Remotion `OffthreadVideo` 비디오 배경 지원
  - `sources.brand` 컬럼 추가 (멀티니치 복제 기반, DEFAULT 'vibehub')
- 근거: 6억 스페인어 사용자 시장에 AI 뉴스 채널 거의 없음 = 선점 기회. 채널 수보다 콘텐츠 품질과 지속성이 핵심. 4채널이면 Brief 1건 → 4채널 동시 발행으로 충분한 커버리지
- 영향: publish:channels 실행 시 YouTube + Threads + Newsletter + Podcast 4채널 자동 발행. X/Instagram/LinkedIn publisher 코드는 유지하되 기본 비활성

### 2026-03-29 — Shorts 파이프라인 도입: MimikaStudio + Remotion BriefShort V2
- 상태: resolved (production done 2026-03-31)
- 배경: Long-form(17분) YouTube 조회수 부진. Shorts(60초 이하)는 구독자 무관 알고리즘 노출로 채널 성장 부스터 역할. 운영비 $0 유지 필수
- 결정:
  1. **TTS**: MimikaStudio Qwen3-TTS 재채택 — 목소리 클론(woman-es) + REST API 자동화 + 로컬 무료
  2. **스크립트**: Gemini 2.0 Flash로 Brief → 120-140단어(50-58초) 자동 요약
  3. **자막**: Whisper STT word-level timestamps → 워드바이워드 하이라이트
  4. **비주얼**: Remotion BriefShort V2 (1080×1920) — 씬별 배경 + Ken Burns + spring 자막 + 프로그레스 바
  5. **배경**: Pexels API 무료 스톡 이미지 (portrait, 키워드 기반 4장)
  6. **합성**: ffmpeg map 0:v + map 1:a + loudnorm -16 LUFS
- 근거:
  - MimikaStudio 재평가: v2026.03.11로 안정화, REST API 문서화, 50개+ MCP 도구, 23개 언어 지원. 이전 "Alpha/bus factor=1" 판단은 롱폼 주 경로 기준이었으며, Shorts 보조 TTS로는 리스크 허용 가능
  - Pexels: 무료, 상업용 OK, portrait 필터, 200 req/hr
  - 프로토타입 결과: 51.8초 MP4, 풀 파이프라인 ~60초 완료, 파일 크기 ~46MB
- 미완: 모두 완료. Chatterbox TTS 전환, video:render CLI 구현, daily-media-publish 자동화 연결

### 2026-03-29 — YouTube Data API v3 자동 업로드 도입
- 상태: implemented (2026-03-30 실전 검증 완료)
- 배경: YouTube 영상 업로드가 수동(YouTube Studio) → Telegram → CLI 3단계로 진행되어 병목. 하루 1~2건 규모에서 자동화 ROI 높음
- 결정: YouTube Data API v3 `videos.insert` (resumable upload) 구현
  1. `youtube-api.ts` — OAuth2 refresh token 갱신 + 비공개 업로드 + 썸네일 업로드
  2. `run-publish-channels.ts` — `YOUTUBE_CLIENT_ID/SECRET/REFRESH_TOKEN` 환경변수 유무로 API/Local 모드 자동 전환
  3. API 업로드 성공 시 `updateBriefYouTubeLink()` 자동 실행 → Telegram 경유 불필요
- 근거: 기본 할당량 10,000 유닛/일 (업로드 1건=1,600 유닛, ~6건/일), 무료. `privacyStatus: "private"` 업로드 → 운영자 확인 후 공개 전환으로 스팸 판정 리스크 최소화
- 미설정 시: 기존 로컬 메타 모드 fallback (하위호환)

### 2026-03-29 — brief body/image 자동 채움 + 소스 도메인 fallback
- 상태: decided
- 배경: `supabase-editorial-sync.ts`가 `contentMarkdown`을 무시하고 `body: [summary]` 한 줄만 넣고 있었음. 또한 OpenAI 등 Cloudflare 봇 차단 사이트는 og:image 자동 추출이 불가능
- 결정: 3개 계층 수정
  1. sync 단계에 `getBodyParagraphs()` — contentMarkdown → body 문단 자동 변환 (3문단 미만이면 summary fallback)
  2. sync 단계에 `SOURCE_DOMAIN_FALLBACK_IMAGES` — og:image 없을 때 소스 도메인 기반 fallback 이미지 자동 적용
  3. `brief:enrich-backfill` CLI — 기존 부실 brief 일괄 보강 워커 (markdown→body + og:image + domain fallback)
- 근거: OpenAI 등 주요 소스가 Cloudflare JS 렌더링으로 서버사이드 og:image 추출 불가. 도메인 fallback은 이미지 없는 것보다 나은 UX 제공

### 2026-03-29 — thin-content 방어 게이트 도입
- 상태: decided
- 배경: `content-failed` (본문 파싱 실패) 항목이 `ingest_status: "parsed"`로 전파되어 summary 2문장만으로 brief 발행 가능한 구멍 발견. OpenAI Safety Bug Bounty brief 등 26건 동일 문제 대기 중
- 결정: 5개 파일 동시 수정으로 4중 방어벽 구축
  1. `ingest-source-fixtures.ts` + `live-source-fetch.ts`: parseStatus를 fixture까지 전달
  2. `brief-discover-cycle.ts`: content-failed → confidence 페널티 + review 강제
  3. `pipeline-routing.ts`: parsedSummary < 100자 brief → thin-content 사유 추가
  4. `live-ingest-snapshot.ts`: content-failed → ingest_status "failed"로 분류
  5. `brief-quality-check.ts`: body 비어있으면 최대 25점(F등급) 캡
- 근거: 수집 소스 25개+로 증가하면서 content 파싱 실패 비율 증가. summary만으로 brief 발행 시 독자 신뢰 하락

### 2026-03-27 — dedup-guard 독립 워커 구현
- 상태: decided
- 배경: `daily-dedup-guard.md` 자동화 프롬프트는 있었지만 실행 가능한 코드가 없었음. `supabase-auto-approve.ts`에 Jaccard 로직이 있었으나 auto-approve guardrail 내부에서만 동작
- 결정: Jaccard 알고리즘을 공유 모듈(`supabase-dedup-guard.ts`)로 추출하고, 동일 source_links 비교 + `[DUPLICATE]` 태깅 + Telegram 보고를 독립 CLI(`dedup:guard`)로 구현
- 근거: 수집량 7배 증가(63건/실행)로 중복 brief 누적 위험. auto-approve 내부 체크만으로는 draft 단계에서 사전 감지 불가

### 2026-03-27 — source-health 백엔드 워커 구현
- 상태: decided
- 배경: `weekly-source-health.md` 프롬프트와 프론트엔드 `computeSourceHealth()`만 존재. 실패 소스 자동 비활성화, maxItems 조정, 신규 소스 발견 기능이 코드로 없었음
- 결정: 백엔드 독립 CLI(`source:health`)로 구현 — 7일 실패 소스 자동 비활성화 + 30일 무실적 경고 + maxItems 제안(자동 적용 아님) + source_links 역추적 신규 후보 발견
- 근거: 25개 활성 소스 규모에서 수동 모니터링은 비현실적. 자동 비활성화는 실패 소스만, 성과 기반 조정은 제안만(운영자 확인 후 적용)

### 2026-03-27 — Discover isPublished 필터 위치 이동
- 상태: decided
- 배경: `supabase-editorial-read.ts`에서 `isPublished` 필터가 캐시 시점에 적용되어 admin이 draft/pending 항목을 볼 수 없었음
- 결정: 필터를 feature 레벨(`list-discover-items.ts`)로 이동. `listBriefs`/`listAllBriefs` 패턴과 동일하게 `listDiscoverItems`(공개)와 `listAllDiscoverItems`(admin) 분리
- 근거: 캐시는 원본 데이터를 보관하고, 소비처에서 필터링하는 것이 확장성 있음

### 2026-03-27 — Brief↔Discover 자동 매칭 알고리즘
- 상태: decided
- 배경: `relatedBriefSlugs`가 항상 빈 배열이어서 /radar/[id] 상세의 Related Briefs 섹션이 비어있었음
- 결정: discover의 tags와 brief의 title 토큰 교차로 자동 매칭 (tag↔title +2점, category↔title +1점, 최대 3개)
- 근거: brief에 topic 컬럼이 아직 없으므로 title 토큰이 현재 사용 가능한 가장 신뢰성 있는 매칭 기준. 추후 topic 컬럼 추가 시 가중치 조정 가능

### 2026-03-29 — Newsletter Pipeline: Resend Broadcasts + dual-locale HTML template
- 상태: implemented
- 배경: 뉴스레터 CTA는 홈페이지에 배치되어 있지만 실제 발송 파이프라인이 없었음. 구독자에게 published brief를 정기적으로 전달할 채널 필요
- 결정: Resend Broadcasts API로 EN+ES dual-locale 뉴스레터 발행
  1. Resend Broadcasts API — Audience(EN/ES) 분리, published brief 자동 수집 → HTML 생성 → Broadcast 발송
  2. inline-CSS HTML 템플릿 — 이메일 클라이언트 호환성을 위해 외부 CSS 없이 inline style만 사용
  3. dual-locale — EN(기본) + ES 각각 별도 Broadcast, locale별 번역된 brief variant 사용
- 근거: Resend는 무료 티어 3,000건/월 + Broadcasts API 지원. Mailchimp/SendGrid 대비 개발자 친화적 API + React Email 호환. inline-CSS는 Gmail/Outlook 렌더링 호환 필수

### 2026-03-29 — locale extraction via usePathname()
- 상태: decided
- 배경: SiteHeader/SiteFooter의 내부 링크에 locale prefix가 없어 `/brief`→`/en/brief` 전환이 누락됨
- 결정: `usePathname()`으로 현재 경로에서 locale 세그먼트를 추출, 내부 링크에 prefix 적용. 외부 링크(mailto, github, feed.xml)는 제외
- 근거: 서버 컴포넌트 props 전달 없이 클라이언트 훅으로 locale 접근 가능. Footer에 "use client" 추가 필요

### 2026-03-29 — 2-step responsive collapse (900px→768px)
- 상태: decided
- 배경: 900px 단일 브레이크포인트에서 태블릿 구간(768~900px)이 1열로 바로 접혀서 공간 낭비
- 결정: 900px에서 공개 그리드(panel-grid, brief-grid, summary-grid, showcase-grid)를 2열로, 768px에서 1열로 2단계 접힘. admin 레이아웃은 900px에서 기존대로 1열
- 근거: 태블릿 사용자 경험 개선. admin은 데이터 밀도가 높아 일찍 접히는 게 유리

## Resolved

### 2026-03-31 — Supabase retention + read-path slimming
- 상태: resolved
- 배경: 저장 비용 자체보다 `append-only` 운영 로그, 큰 `jsonb` payload, 일부 admin/public 화면의 넓은 읽기 경로가 먼저 병목이 되기 시작했다. 특히 inbox projection이 `parsed_content` 전체를 읽고 있었고, 오래된 publish/retry 로그를 hot DB에 무기한 쌓아둘 이유가 약했다.
- 결정:
  - `pipeline:supabase-retention` 워커를 추가해 오래된 `channel_publish_results`, `publish_dispatches`, `ingest_run_attempts`, `video_job_attempts`, `ingest_runs`를 batch prune한다
  - `tool_submissions`, `tool_candidate_imports`는 promoted/linked row는 보존하고 terminal rejected/spam/duplicate/hidden 상태만 retention 대상으로 삼는다
  - 오래된 `archive` / `discard` 계열 `ingested_items`는 원문 markdown을 계속 들고 있지 않고 summary 중심 payload로 압축한다
  - inbox projection은 `parsed_content` 전체 대신 summary만 읽고, public latest / admin list 화면은 limited query와 detail query를 분리한다
- 근거: `ingested_items`는 stable id upsert 구조라 URL 하나가 매일 새 row로 불어나는 문제는 아니었고, 실제 비용 리스크는 오래 남는 로그와 과한 읽기 경로였다. hot-path slimming과 retention을 함께 넣는 편이 storage와 query cost를 동시에 줄인다.
- 영향: hot DB 증가 속도를 늦추고, `/admin/submissions` / `/admin/imported-tools`의 조회 폭을 고정하며, archive/discard 원문 payload가 장기적으로 DB를 무겁게 만드는 문제를 줄인다

### 2026-03-27 — Brief 카드 전체 클릭 영역화 + 정보 위계 재설계
- 상태: resolved
- 결정:
  - A안 (stretch link overlay) 채택 — `<Link>::after { position: absolute; inset: 0 }` + 내부 인터랙티브 요소 `z-index: 1`
  - 정보 위계 2-tier 재설계: 1차(배지+제목 2줄), 2차(요약 2줄+메타), 호버 프리뷰 삭제
  - whyItMatters는 리드 카드에서만 표시
- 근거: B안(Link 래핑)은 `<a>` 내부 `<a>` HTML 규격 위반, C안(JS onClick)은 prefetch 불가 + a11y 열등. A안은 HTML 규격 준수 + Next.js prefetch + 키보드/스크린리더 접근성 모두 확보
- 영향: Brief 카드 클릭 경로가 "링크 텍스트 찾기→클릭"에서 "카드 아무 곳이나 클릭"으로 단축. Discover 카드는 이미 제목 링크로 진입 가능하므로 변경 불필요

### 2026-03-27 — Imported Candidate Source Registry seed를 migration으로 고정
- 상태: resolved
- 결정:
  - `tool_candidate` lane 기본 source 6개(`Hacker News Show HN`, `GitHub Search: developer tools`, `DevHunt`, `LeanVibe`, `BetaList`, `Product Hunt`)를 migration에서 seed/upsert하도록 고정
  - `sources (pipeline_lane, name)` unique index 추가 — 새 환경에서도 source row를 중복 없이 재적용 가능
  - `GitHub Search: developer tools` 기본 쿼리를 `topic:developer-tools archived:false is:public stars:>10`으로 교체
  - seed migration에 `feed_url`, `content_type`, `default_tags`, `max_items`, `fetch_kind`, `github_owner`, `github_repo` 보강을 포함해 fresh DB에서도 imported lane이 바로 동작하게 정리
- 근거: imported sidecar는 Supabase source row의 UUID를 전제로 sync 여부를 결정하는데, 기존 구현은 fallback 코드 + 수동 DB 작업 + 기존 DB row가 섞여 있었다. 새 DB에서는 source seed가 없으면 계속 mock mode에 머무르고, GitHub 검색식도 DB row가 남아 있으면 코드 fallback 수정만으로는 갱신되지 않았다.
- 영향: 새 환경에서 migration만 적용하면 `tool_candidate` source registry가 즉시 살아나며, imported sidecar가 fallback id 없이 Supabase sync로 바로 올라갈 수 있다. GitHub imported 후보도 0건 검색식 문제를 피한다.

### 2026-03-27 — 구 (public)/ 라우트 제거 + [locale]/(public)/ 단일 정본
- 상태: resolved
- 결정: `app/(public)/` 17개 tsx 제거, `app/[locale]/(public)/`만 유일 공개 라우트로 확정
- 근거: middleware가 locale prefix 없는 접근을 301 리다이렉트하므로 구 라우트에 직접 도달 불가. 양쪽 존재 시 빌드 번들 증가 + 라우트 혼동 위험. CLAUDE.md는 `[locale]/(public)/`로 이동하여 보존
- 영향: Next.js 빌드 번들 축소, 라우트 정본이 단일화되어 유지보수 명확성 확보

### 2026-03-27 — i18n 다국어 확장 설계 결정
- 상태: resolved
- 결정:
  - Slug: 영어 slug 통일 (`/es/brief/same-english-slug`) — 언어별 slug 생성/관리 복잡성 회피
  - 채널: 단일 YouTube 채널 + locale별 재생목록 — 운영 부담 최소화
  - Fallback: variant 없으면 영어 원문 + "Translation pending" 배너 — SEO 유지 + UX 명확성
  - Locales: en (canonical) + es (first target) — `DEFAULT_LOCALE_REGISTRY` 기반 확장
  - DB: 별도 variant 테이블 (brief_post_variants, discover_item_variants) — 원본 테이블 오염 없음
  - 라우트: `[locale]/(public)/` prefix + middleware 리다이렉트 — admin은 locale 무관
- 근거: 스페인어권 AI 콘텐츠 시장 성장 + SEO hreflang 이점. variant 테이블 분리로 기존 영어 흐름 무영향 보장. Gemini 번역 비용 $0 (2.5 Flash)
- 영향: 신규 locale 추가 시 `DEFAULT_LOCALE_REGISTRY`에 1줄 추가만 필요. 모든 downstream (backend/frontend/media-engine)이 자동 인식

### 2026-03-27 — Weekly Autoresearch: Hugging Face Blog RSS 소스 후보 확정
- 상태: resolved
- 결정:
  - `huggingface.co/blog/feed.xml` → 유효한 RSS 2.0 피드 확인 (500+ 아이템, 2026 최신 콘텐츠)
  - 기존 expansion roadmap Brief Sources의 `Hugging Face Blog (미구현)` 항목에 유효 endpoint 기재
  - Anthropic Research (`anthropic.com/news/rss.xml`, `/rss.xml`) → 동적 Next.js 앱으로 RSS 피드 미제공 확인, 영구 disabled 처리
  - OpenAI API Changelog (`platform.openai.com/docs/changelog`) → 403 지속, disabled 유지
- 근거: 2026-03-27 autoresearch 루프에서 disabled source 재검토 실험 수행. Hugging Face Blog는 AI/ML 연구·도구 콘텐츠가 VibeHub brief 타깃과 직접 일치, 인증 없는 표준 RSS, 운영 복잡도 증가 없음. Anthropic는 피드 엔드포인트 자체가 없으므로 재검토 대상에서 제외
- 영향: Hugging Face Blog를 `live-source-registry.ts`에 `auto-safe` brief source로 추가 시 coverage 확장 가능 (실제 코드 추가는 다음 구현 웨이브에서)

### 2026-03-27 — approved+draft 상태 꼬임 방지 트리거
- 상태: resolved
- 결정: `trg_fix_approved_draft` DB 트리거 추가 — `review_status = approved`이면서 `status = draft`인 경우 자동으로 `status = review`로 전환
- 근거: 코워크가 editorial-review 프롬프트를 이탈하여 `review_status = approved`를 직접 설정하면서 `status = draft`를 그대로 둠 → auto-publish가 6건을 영원히 skip
- 영향: 같은 문제 재발 시 DB 레벨에서 자동 교정. 프롬프트 이탈에도 안전

### 2026-03-27 — SEO & Public Surface 강화 설계 결정
- 상태: resolved
- 결정:
  - `/radar/[id]` JSON-LD 타입을 `Thing`으로 채택 (Article은 brief 전용, WebPage는 너무 generic)
  - URL 필터 파라미터 명명: brief는 `topic`+`q`, radar는 `group`+`q` (카테고리 필터 값이 group 단위이므로)
  - 관련 브리프 전략: discover 상세에서는 `relatedBriefSlugs` 기반 매칭, brief 상세에서는 같은 `topic` 기반 매칭 (최대 4개)
  - OG 이미지 색상: 카테고리별 design-token 색상(mint/sky/purple/yellow/orange) 기반 동적 액센트
  - favicon: ImageResponse 기반 동적 생성 (V 마크, ink 배경 + orange 텍스트)
- 근거: JSON-LD Thing은 schema.org에서 가장 범용적이면서 discover 아이템의 다양한 카테고리를 포괄. URL 필터는 북마크/공유 가능성 확보를 위한 필수 SEO 요소. 관련 브리프는 내부 링크 강화 + 이탈율 감소 효과
- 영향: SEO 크롤러가 discover 개별 아이템에 접근 가능, 필터 상태가 URL에 보존되어 공유/북마크 가능

### 2026-03-27 — 브랜드 팔레트 저채도 재보정
- 상태: resolved
- 결정:
  - `packages/design-tokens/src/index.ts`의 핵심 색상을 유지형 개선안으로 재보정
  - 브랜드 축은 `ink + cream + orange` 유지, 보조색 `mint / sky / yellow / rose / purple`은 채도를 낮춘 값으로 교체
  - `status.css`, `discovery.css`의 status badge / category pill은 강한 fill 위주에서 `옅은 배경 + 얇은 border` 조합으로 조정
  - `public/brand/*`, `public/placeholders/*`, `public/sprites/*`, media-engine Remotion/thumbnail 기본색도 같은 팔레트로 동기화
- 근거: 다크 테마에서 포화된 색을 넓게 쓰면 피로와 optical vibration이 커질 수 있어, 구현 팔레트를 저채도 방향으로 정리했다. 기존 대비는 이미 충분했으므로 가독성보다 장시간 사용 피로도와 자산 일관성을 우선 보정했다.
- 영향: web UI, 정적 SVG 자산, 생성형 썸네일/영상 기본색이 하나의 브랜드 톤으로 수렴. 이후 브랜드 색상 변경은 design-tokens SSOT와 정적 자산 동기화 여부를 함께 확인해야 한다.

### 2026-03-27 — OG 이미지 브랜드 토큰화 + 필터 훅 공용화
- 상태: resolved
- 결정:
  - OG/Twitter 이미지 8파일의 raw hex/문자열 하드코딩 → `colorTokens`/`brandTokens`/`categoryAccentHex` (design-tokens 패키지)로 중앙화
  - `brandTokens` 신규: `name`, `domain`, `briefTagline`, `radarTagline` — OG 이미지 내 브랜드 표기 SSOT
  - `categoryAccentHex` 신규: `CategoryColorToken → hex` 자동 매핑 — 카테고리 색상 추가 시 design-tokens 1곳만 수정
  - Brief/Discover 목록의 URL 필터 동기화 로직 → `useFilterUrlSync()` 공용 훅 추출 (debounce, searchParams, router.replace 중복 제거)
  - `/seo-check` 스킬 추가: route별 metadata/JSON-LD/OG 이미지/sitemap/내부 링크/브랜드 하드코딩 점검
- 근거: raw hex 8파일 분산은 브랜드 색상 변경 시 누락 위험. URL 동기화 로직이 Brief/Discover에서 동일 패턴 복제. media-engine에 이미 `brand.ts` SSOT가 있으므로 web 쪽도 동일 원칙 적용
- 영향: 브랜드 색상/명칭 변경 시 design-tokens 1곳만 수정. 새 목록 페이지 추가 시 useFilterUrlSync 1줄로 URL 동기화 완료

### 2026-03-26 — 채널 전략 확정 + 오디오/비디오 도구 선정
- 상태: resolved
- 결정:
  - 주력 채널 3개로 확정: VibeHub 웹사이트 + Threads + YouTube
  - 티스토리 채널 보류: Open API 2023년 11월 신규 등록 중단, 기존 토큰 없으면 연동 불가
  - 네이버 블로그 완전 자동화 포기: 공식 API 폐쇄, Selenium 자동화 시 저품질/밴 리스크 높음. 반자동(글 생성 + Telegram 알림 + 수동 발행)만 허용
  - Meta 비즈니스 인증: Development Mode + 본인 계정(@vibehub1030)이면 불필요. Production 전환 시 사업자등록증 필요
  - Ghost 블로그: 다음 채널 확장 1순위 후보 (자체 호스팅 = API 차단 위험 0)
  - Threads 토큰 갱신: refresh_access_token API 성공, 만료일 2026-05-25
  - 1인 나레이션 도구: MimikaStudio (Qwen3-TTS, Mac Apple Silicon, CLI+MCP) 채택 — Qwen3-TTS FastAPI 직접 구축 대비 설치 간편
  - 2인 팟캐스트 도구: NotebookLM CLI (nlm) 유지
  - 썸네일: Gemini 2.0 Flash 이미지 생성 품질 불만족 — Imagen 3 또는 대안 검토 필요
- 근거: BENG 블로그 사례 분석 (Meta API 차단, 비즈니스 인증 미완료 시 일괄 차단). 티스토리/네이버 API 현황 웹 조사. MimikaStudio는 Qwen3-TTS + 음성 복제 + MCP 지원이 CLI로 통합됨
- 영향: 파이프라인 채널 목록 축소 (6→3 주력), 티스토리/네이버 스텁은 코드에 유지하되 활성화 안 함

### 2026-03-26 — 파이프라인 자동화 완성 + 크로스프로모 분리
- 상태: resolved
- 결정:
  - 채널 발행 결과를 DB(channel_publish_results, publish_dispatches)에 자동 저장
  - Telegram 보고를 채널 발행에도 연결 — E2E 수신 확인 완료
  - daily-auto-publish.md §9에 채널 발행 단계 추가 (published brief → publish:channels)
  - 크로스프로모(Pass 2)를 본문 발행에서 분리 — skipCrossPromo=true 기본
- 근거: Threads API가 포스트 생성 직후 media ID 조회 불가 (전파 지연). 현재 활성 채널이 Threads 1개뿐이라 크로스프로모 대상 없음. Ghost/Spotify 등 2번째 채널 운영 시 별도 워커로 추가 예정
- 영향: 파이프라인 끝에서 끝까지 추적 가능 (fetch → ingest → sync → editorial → publish → channel dispatch → DB + Telegram)

### 2026-03-26 — Threads @vibehub1030 라이브 발행 성공
- 상태: resolved
- 결정:
  - Threads 계정: `@vibehub1030` (user_id: 26406071412413302)
  - Meta Developer 앱(1578133636823974) + OAuth redirect URI(`https://localhost`) 설정 완료
  - 환경변수: THREADS_USER_ID, THREADS_ACCESS_TOKEN, THREADS_HANDLE → `.env.local`
  - 크로스프로모 답글: 발행 후 3초 딜레이 추가 (Threads 전파 시간 필요)
  - 코드 품질 개선 동시 수행: spawnAsync 공용 유틸 (3곳 → 1곳), brand.ts 브랜드 상수 (하드코딩 4곳 제거), PUBLISH_CHANNELS 환경변수화
- 근거: 실제 API 2단계(createContainer → publish) 검증 완료. dry-run + 라이브 모두 성공
- 영향: `publish:channels <slug>` CLI로 Supabase brief → Threads 전체 경로 E2E 동작 확인

### 2026-03-26 — 로컬 LLM을 qwen3.5-9b로 교체
- 상태: resolved
- 결정:
  - 로컬 LLM: `mistral-small3.1` → `qwen3.5-9b` (ollama)
  - Claude 측: `claude-sonnet-4-6` 유지 (변경 없음)
  - 하이브리드 모드 유지: runtime(chat/router/search/memory) = `qwen3.5-9b`, stage(classifier/brief-draft/discover-draft/critic) = `claude-sonnet-4-6`
- 근거: 운영자가 로컬 모델을 qwen3.5-9b로 전환함
- 영향: ARCHITECTURE.md, TELEGRAM-ORCHESTRATOR-CONTRACT.md, PROJECT-STATUS.md 동기화 완료. shadow trial 코드의 모델명은 다음 trial 실행 시 업데이트 예정. ORCHESTRATION-TRIAL-LOG.md의 과거 기록은 당시 실제 사용 모델명 유지

### 2026-03-26 — NotebookLM CLI 채택 + Threads API 대기
- 상태: resolved (NotebookLM), blocked (Threads)
- 결정:
  - NotebookLM: `notebooklm-mcp-cli` CLI 모드 채택 (MCP 모드는 향후 Claude Code 연동 시 전환)
  - 비교 탈락: PleasePrompto/notebooklm-mcp (팟캐스트 기능 없음, Q&A 전용), Google Cloud Podcast API (Enterprise allowlist 접근 불가), AutoContent API (EUR 24+/월, 불필요)
  - Python 3.12 설치 필요 (현재 3.9.6 → 3.10+ 필요)
  - Threads API: Instagram 계정 곧 생성 예정 → Meta Developer 앱 생성은 계정 후 진행
- 근거: notebooklm-mcp-cli가 유일하게 2인 대화 팟캐스트 + 무료 + Claude Code MCP 지원. 3,000+ stars, 활발한 유지보수. Google 공식 API는 allowlist 해제 시 전환 예정 (분기별 체크)

### 2026-03-26 — Full Cycle 검증 + FK 버그 수정 + 상태 리셋
- 상태: resolved
- 결정:
  - supabase-ingest-sync.ts의 upsertRuns/upsertItems/upsertClassifications/upsertRunAttempts에 orphan source_id 필터 추가 — stale 스냅샷의 고아 레코드가 FK 위반을 일으키던 연쇄 버그 수정
  - supabase-editorial-sync.ts의 buildEditorialRows에도 동일 필터 적용
  - draft+approved 비정상 5건을 draft+pending으로 리셋
  - GPT-5.4 mini brief에 `[REFERENCE]` 태그 부여 — few-shot 풀의 첫 레퍼런스
- 근거: 23개 소스 확장 후 첫 pipeline:daily 실행에서 FK 위반 연쇄 발생. 로컬 스냅샷에 이전 하드코딩 소스의 stale 데이터가 남아있어 DB에 없는 source_id 참조. draft+approved 5건은 이전 sync에서 상태 꼬임

### 2026-03-26 — Brief Quality Score 0~100 확장
- 상태: resolved
- 결정:
  - `brief-quality-check.ts`의 판정을 pass/fail → 0~100 점수 + A/B/C/D/F 등급으로 확장
  - 기존 6개 게이트(50점) 유지 + 5개 확장 점수(50점) 추가: titleAppeal, summaryStandalone, structureScore, sourceDiversity, readability
  - 등급 기준: A(≥85) B(≥70) C(≥55) D(≥40) F(<40)
  - `passed`/`failures` 필드 유지 → auto-publish 하위호환
- 근거: 기존 pass/fail은 "하한선"만 걸러내고 "품질 상향" 추적이 불가. 연속 점수가 있어야 소스별 품질 상관분석, 레퍼런스 brief 자동 선정, 프롬프트 튜닝 효과 측정이 가능
- 검증: 레퍼런스급 brief 90점(A), 부실 brief 60~62점(C) — 등급 차이 명확

### 2026-03-26 — Source Registry를 DB SSOT으로 전환
- 상태: resolved
- 결정:
  - `live-source-registry.ts`가 Supabase `public.sources` 테이블을 직접 읽도록 변경
  - `loadSourcesFromDb()` 함수 추가 — DB 연결 실패 시 하드코딩 3개 fallback 유지
  - `sources` 테이블에 `feed_url`, `content_type`, `default_tags`, `max_items`, `fetch_kind`, `github_owner`, `github_repo` 컬럼 추가 (마이그레이션 적용)
  - 30개 소스에 feed_url 매핑 데이터 채움
  - `source_tier` 타입을 `auto-safe | render-required | manual-review-required`로 확장
- 근거: 어드민 UI에 30개 소스가 표시되지만 실제 live-fetch는 하드코딩 3개만 수집. DB와 코드가 분리되어 어드민에서 소스 on/off가 작동하지 않았음
- 다음 단계: 30개 소스의 feed_url이 실제로 유효한지 검증 (일부는 추정 URL)

### 2026-03-26 — Channel Publish Pipeline v2: 코드 구현 완료
- 상태: resolved (구현 완료, 실제 API 토큰 확보 후 라이브 테스트 예정)
- 구현:
  - 23개 신규 파일, ~2,800줄 media-engine에 추가
  - Threads Publisher: createContainer → publish 2단계 + 답글 크로스프로모. fetch-with-retry로 429 대응
  - NotebookLM Bridge: nlm CLI spawn 5단계 + ffmpeg loudnorm 2-pass
  - Whisper STT: ffmpeg 16kHz WAV 변환 → whisper.cpp SRT 생성 + Gemini JSON schema 번역
  - Remotion BriefAudiogram: 웨이브폼(visualizeAudio) + 자막 오버레이 + 커버 이미지 Composition
  - 썸네일: Sharp SVG 브랜드 썸네일 + 커버 이미지 리사이즈 1280×720
  - Publish Dispatcher: Promise.allSettled 병렬 발행 + 실패 격리 + 크로스프로모 자동 실행
  - Backend CLI: `publish:channels <brief-id> [--dry-run]`, `publish:link-youtube -- [brief-id] <video-id>`
  - 테스트: 5개 파일, 25개 테스트 전부 통과
- 미완: Ghost/Tistory 실제 API 연동(스텁), Threads 토큰 확보, Supabase channel_results 스키마

### 2026-03-26 — Channel Publish Pipeline v2: 전면 재설계
- 상태: resolved (설계 완료)
- 결정:
  - **TTS 교체**: MimikaStudio → NotebookLM 2인 대화 팟캐스트(주 경로) + Qwen3-TTS 직접 서버(백업)
  - **YouTube 전환**: Data API v3 자동 업로드 → 로컬 mp4 + metadata.json 생성 → 운영자 직접 업로드
  - **Threads 추가**: Meta 공식 Publishing API를 최우선 텍스트 채널로 채택 (실현성 9/10, 250건/일)
  - **크로스 프로모션**: 2-pass 발행(Pass 1: 본문, Pass 2: URL 상호 주입) + YouTube 비동기 3rd pass
  - **피드백 루프**: YouTube Analytics + GA4 성과 수집 → 주간 insight → 프롬프트/템플릿 파라미터 조정 (자동 제안 + 운영자 승인)
  - **채널 우선순위**: Threads(P1) → NotebookLM(P2) → Remotion(P3) → Ghost(P4) → 팟캐스트 RSS(P5) → 크로스 프로모션(P6) → 티스토리(P7) → Analytics(P8~P9)
- 근거 (리서치 기반, 2026-03-26 조사):
  - MimikaStudio: 당시 Alpha 판단으로 롱폼 주 경로에서 제외. 이후 v2026.03.11 안정화 + REST API 문서화 확인 → 2026-03-29 Shorts TTS 보조 경로로 재채택 (위 결정 참조)
  - YouTube OAuth 검증: 공식 4~6주, 실제 2~6개월. 미검증 시 private 잠금. 2026.1 AI 콘텐츠 대량 단속(47억 조회 채널 삭제)
  - Claude Cowork 마우스 조작: 매 스텝 스크린샷+비전 → 느리고 불안정 (3/10). OS 파일 다이얼로그 특히 취약
  - NotebookLM MCP CLI: 3,000+ stars, MCP 연동 지원, 2인 대화 품질 우수. 단 비공식 브라우저 자동화
  - Qwen3-TTS: 한국어 WER 1.741 (오픈소스 최상위), Linux/Docker 가능
  - Threads API: 2024.6 출시, 2025.7 대규모 확장. 텍스트+이미지+비디오+캐러셀+GIF+Poll
  - Remotion v4.0.438: 성숙, render-spawn.ts 이미 존재. Media Parser deprecated → Mediabunny 기준
- 다음 단계: 각 채널 연동 검증 후 P1(Threads)부터 순차 구현

### 2026-03-25 — Discover Items 공개 노출: approved + published 게이트
- 상태: resolved
- 결정:
  - `/radar` 공개 페이지는 `reviewStatus === "approved" && publishedAt != null`인 discover 항목만 표시
  - `isPublished()` 가드를 `content-contracts/editorial-guards.ts`에 한 번 정의, brief/discover/showcase 재사용
  - `ReviewStatus`, `DiscoverStatus` 중앙 상수를 `content-contracts`에서 관리
  - Supabase 쿼리, snapshot 폴백, mock 폴백 세 경로 모두 동일 필터 적용
- 근거: DB에 `review_status`, `published_at` 컬럼이 존재하고 backend action handler도 지원하지만, 공개 읽기 쿼리가 이를 무시하고 있었음. 미승인/미발행 항목이 공개 사이트에 노출될 수 있는 상태.
- 다음 단계: admin 목록에서는 전체 항목(미발행 포함) 표시 분리, Approve/Publish 버튼 UI 추가

### 2026-03-25 — Brief Quality Gate를 CLI 워커에도 적용
- 상태: resolved
- 결정:
  - `runBriefQualityCheck`를 `brief-quality-check.ts`로 분리해 `auto-publish`, `review:decision`, `publish:action` 세 경로 공유
  - `review:decision approve` 시 quality check 실패하면 approve 거부
  - `publish:action publish/schedule` 시 quality check 실패하면 publish 거부
  - 기존 부실 브리프 9건 `draft + pending`으로 리셋 (레퍼런스 1건 제외)
- 근거: `Creating with Sora Safely` 등 본문 1단락 + 소스 1개짜리 브리프가 CLI를 통해 quality gate 없이 published 상태로 올라갔음. `auto-publish` 워커에만 quality check가 있고 CLI 경로는 무방비였음.
- 다음 단계: `daily-auto-publish` 자동화에 discover 자동 발행 단계 추가 완료

### 2026-03-25 — 디자인 SSOT 3레이어 패턴 도입
- 상태: resolved
- 결정:
  - Layer 1 (`content-contracts`): `DISCOVER_CATEGORIES` 배열 — id, label, group
  - Layer 2 (`design-tokens`): `discoverCategoryVisuals` — color, icon per category + `discoverGroupLabels`
  - Layer 3 (presenters): Layer 1+2를 자동 합성 — 수동 편집 금지
  - `/design-sync` 스킬로 3레이어 정합성 검증
- 근거: 카테고리 라벨이 3곳(타입, 허용목록, 프리젠터), 색상이 CSS에 하드코딩 — 추가 시 4곳 수동 수정 필요. SSOT 도입으로 추가 = 2줄로 축소.

### 2026-03-25 — Discover 자동 발행을 daily-auto-publish에 통합
- 상태: resolved
- 결정:
  - `daily-auto-publish.md`에 discover 섹션(§8) 추가 — brief 발행 후 pending discover를 경량 quality check 후 자동 approved + published 전환
  - discover quality 기준: title ≥5자, summary ≥20자, action ≥1개 + https
  - 별도 자동화 파일을 만들지 않고 기존 프롬프트에 통합
- 근거: discover는 파이프라인 sync 후 approve/publish 자동화가 없어서 전부 pending 상태로 방치됐음. brief와 달리 카드 수준이라 heavy quality check 불필요.

### 2026-03-25 — Supabase Retry Budget 보강 (CONNECTION_DESTROYED 재시도 강화)
- 상태: resolved
- 결정:
  - `SUPABASE_QUERY_RETRY_LIMIT`: 2 → 3 (최대 4회 시도)
  - `SUPABASE_QUERY_RETRY_DELAY_MS`: `[500, 1500]` → `[500, 1500, 3000]` (총 예산 2000ms → 5000ms)
- 근거: 2026-03-25 pipeline log에서 `pipeline:supabase-sync`가 `CONNECTION_DESTROYED`로 3회 모두 실패. 직전 4회 실행은 0 오류였으므로 Supabase AP-northeast-2 pooler cold-start가 원인으로 판단. 기존 총 재시도 예산 2000ms는 cold pooler 워밍업 지연보다 짧을 가능성이 높아 보강. 비즈니스 로직 변경 없이 상수 2줄 수정.
- 측정 지표: 다음 5회 daily pipeline 실행 중 CONNECTION_DESTROYED 오류 횟수 (목표: 0/5)
- 다음 단계: 다음 1주 pipeline 로그에서 재발 여부 확인 후 안정화 여부 기록

### 2026-03-25 — Local `code-review-graph` Ignore Baseline
- 상태: resolved
- 결정:
  - 로컬 `code-review-graph`는 시스템 기본 Python을 바꾸지 않고 별도 Python/uv 환경에서 사용한다.
  - 레포 루트에 `.code-review-graphignore`를 추가해 `apps/web/.next`, `logs`, `coverage`, `test-results`, `playwright-report`, `supabase/.temp` 같은 generated churn을 그래프와 watch 대상에서 제외한다.
  - 운영 기본값은 `watch` 상시 구동보다 `status` / `build` / `update` 중심으로 두고, watch noise가 다시 보이면 ignore 규칙을 먼저 조정한다.
- 근거: 초기 `watch` 검증에서 authored source 외의 generated output churn이 함께 잡혀 로그 가독성과 blast-radius 해석 품질을 떨어뜨렸다. source 중심 그래프를 유지하는 편이 실제 리뷰와 수정 범위 산정에 더 유리했다.

### 2026-03-25 — Editorial Automation Hardening
- 상태: resolved
- 결정:
  - 루트 `package.json`에 `publish:auto`, `publish:auto-dry`, `publish:repair-state`, `automation:check` 스크립트를 추가해 automation 문서와 실제 실행 경로를 일치시킨다.
  - `auto-publish` quality check 실패 브리프는 `draft + pending`으로 되돌리고 `last_editor_note`에 recovery 사유를 남겨 다음 editorial review 사이클로 복귀시킨다.
  - `approve`와 `schedule` 액션은 `review` 상태 브리프에서만 허용해 `draft + approved` 같은 상태 조합을 write 시점에 막는다.
  - `publish:repair-state` 워커를 추가해 `draft + approved`, `draft + scheduled_at`, `draft + published_at` 같은 복구 가능한 조합을 nightly repair 대상으로 둔다.
  - `automation:check` 스크립트를 추가해 `.claude/automations/*.md`의 `npm run ...` 및 로컬 파일 참조 drift를 주기적으로 검사한다.
  - Supabase Postgres 연결에는 retry/backoff를 추가해 pooler circuit breaker 및 prepared statement 계열 일시 오류를 자동 재시도한다.
- 근거: auto-publish skip 후 재가공 복귀 경로 부재, 문서-스크립트 drift, 상태 무결성 누수, pooler 일시 오류가 운영 자동화의 가장 작은 반복 장애 지점이었다.

### 2026-03-24 — Auto-Publish Worker
- 상태: resolved
- 결정:
  - `supabase-auto-publish.ts` + `run-auto-publish.ts` 워커 구현
  - `review_status = 'approved'` + `status != 'published'` 브리프 대상
  - quality check 6항목 (title/summary/body/source-count/https-url/internal-term) 통과 시에만 전환
  - `draft|review → scheduled → published` 2단계 전환 (1회 실행에 1단계)
  - `npm run publish:auto` / `publish:auto-dry` (dry-run) 스크립트 등록
  - 전환 발생 시 Telegram 보고
- 근거: review → published 사이 수동 클릭 의존도 제거. AUTO-PUBLISH-RULES.md 조건 기반 구현

### 2026-03-24 — Brief Cover Image Pipeline + Reference Brief
- 상태: resolved
- 결정:
  - `brief_posts`에 `cover_image_url` nullable text 컬럼 추가
  - RSS 파서에서 `<enclosure>`, `<media:content>`, `<media:thumbnail>`, `<img>` 순서로 이미지 추출
  - 이미지는 URL만 저장 (파일 다운로드 없음), 원본 서버에서 직접 로드
  - 공개 디테일 페이지에 메타바 아래/본문 위에 cover 이미지 표시 (없으면 영역 숨김)
  - 레퍼런스 브리프 1개 작성 — 3단락+섹션헤딩+소스3개 구조로 Quality Check 6/6 기준 확립
- 근거: 기존 브리프가 RSS 요약 1줄 복사에 불과. 자동화 프롬프트 설계 전 "좋은 브리프" 기준이 필요

### 2026-03-24 — Admin Card Readability + Sidebar Reorder
- 상태: resolved
- 결정:
  - 카드 제목 `--type-body`→`--type-h3`, fontWeight 600→700
  - 메타 레이아웃 flex→grid, dd에 fontWeight 600 추가
  - 대시보드 카운트 `--type-h2` + orange 강조
  - 카드 overflow 방지: `overflow: hidden`, badges `flex-wrap`, title `word-break`
  - 사이드바 순서를 파이프라인 흐름순으로 정렬 (소스→파이프라인→수집→브리프→디스커버리→검토→발행)
- 근거: 카드 텍스트 가독성 부족 + 사이드바 순서가 실제 워크플로우와 불일치

### 2026-03-24 — Admin Tab Data Separation + Promotion Actions
- 상태: resolved
- 결정:
  - 발행 탭 SQL에서 `pending`/`changes_requested` 제거 → 승인된 항목만 표시
  - 수신함에서 `ingest_status = 'drafted'` 항목 제외 → 이미 진행된 항목 안 보임
  - 브리프 탭에 상태 필터 칩 추가 (전체/초안/검수 중/예약/발행됨)
  - draft 브리프 → review 전환 서버 액션 + "검수 요청" 버튼 추가
  - retryable 예외 → 재시도 서버 액션 + "재시도" 버튼 추가
- 근거: 같은 항목이 여러 탭에 동시 노출돼 운영자 혼란. 각 탭이 자기 단계 데이터만 보여야 함

### 2026-03-24 — Admin Sidebar Tab Consolidation (15 → 12)
- 상태: resolved
- 결정:
  - 정책 + 프로그램 → `/admin/rules` "운영 규칙" (읽기 전용 섹션 2개)
  - 수신함 + 실행 이력 → `/admin/collection` "수집 현황" (클라이언트 탭 전환)
  - 검수 + 예외 처리 → `/admin/pending` "검토 대기" (클라이언트 탭 전환)
  - 기존 6개 route(`/admin/policies`, `/admin/programs`, `/admin/inbox`, `/admin/runs`, `/admin/review`, `/admin/exceptions`)는 redirect 유지
  - 디테일 페이지(`/admin/inbox/[id]` 등)는 기존 URL 유지, back link만 통합 페이지로 변경
  - 공용 `AdminTabSwitcher` 컴포넌트로 URL `?tab=` 파라미터 기반 탭 상태 관리
- 근거: 15개 사이드바 탭이 네비게이션을 복잡하게 만듦. 유사 역할의 3쌍을 합쳐 12개로 축소하면 인지 부하 감소

### 2026-03-24 — Supabase Connection Pool Deadlock + Timestamp Parsing Fix
- 상태: resolved
- 결정:
  - `postgres` 라이브러리의 `max: 1` → `max: 10` 변경. Transaction mode pooler(6543)를 사용하므로 안전
  - timestamp/timestamptz OID에 대해 `parse: (x) => x`로 문자열 반환 설정 추가
  - projection bundle timeout을 15초 → 8초로 축소
- 근거:
  - `max: 1`은 `Promise.all`로 7개 쿼리를 병렬 실행할 때 1개 연결로 순차 실행 시도 → deadlock 발생 → 15초 timeout까지 대기
  - `postgres` 라이브러리가 `timestamp` 컬럼을 `Date` 객체로 반환 → React JSX에서 `[object Date]` 렌더링 에러
  - 결과: admin 전체 라우트 15,600ms → 600~900ms (56배 개선), 에러 0건

### 2026-03-24 — AutomationTrail useSyncExternalStore Infinite Loop Fix
- 상태: resolved
- 결정: `getSnapshot`이 매 호출마다 새 배열 참조를 반환해 React 무한 re-render 발생. JSON 문자열 비교로 이전 결과를 캐싱하여 실제 변경 시에만 새 참조 반환하도록 수정
- 근거: React `useSyncExternalStore` 규약상 getSnapshot 반환값이 변경되지 않았으면 동일 참조를 반환해야 함

### 2026-03-24 — Brief Detail Redesign + Quality Checklist + Review Body Preview
- 상태: resolved
- 결정:
  - Brief detail에 convention-based section parsing 도입: `## ` 접두사로 시작하는 body paragraph를 자동 섹션 분리. 현재 파이프라인 데이터엔 heading 없어 flat 렌더링 유지, 파이프라인이 `## ` 접두사 생성 시 자동 활성화
  - Admin brief detail에 advisory 품질 체크리스트 6항목 추가 (title/summary 길이, body 단락수, source 수/URL 유효성, 내부 용어 노출)
  - Review detail에서 brief body를 보여주기 위해 `previewTitle`로 `brief_posts` title lookup 방식 채택. 직접 FK 없으므로 title 기반 best-effort 매칭, 실패 시 graceful 생략
- 근거: review→brief 직접 FK 부재, `whyItMatters`/`topic` DB 컬럼 미존재 제약 하에서 즉시 실행 가능한 개선

### 2026-03-24 — Brief CSS Separation + Token Lint
- 상태: resolved
- 결정:
  - `components.css`가 355줄에 도달하여 brief 전용 CSS를 `brief.css`로 분리
  - CSS 토큰 준수 검사를 `tools/token-lint.sh`로 자동화하고 self-review에 통합
  - `whyItMatters`와 `topic` 필드는 DB 마이그레이션 필요 → contract에 optional로 선언만 하고 실제 DB 컬럼 추가는 보류
- 근거: components.css 300줄 규칙 초과, 경쟁사 분석 기반 UX 개선 필요성

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
  - 현재 구현 collector는 RSS/API + GitHub Releases fetch를 유지한다.
  - collector 목표 primary: `Crawl4AI`
  - collector fallback 후보: `Firecrawl`
  - HTML/article cleanup Phase 1 실제 도입: `Defuddle`
  - document/PDF 목표 primary: `Docling`
  - PDF 목표 fallback: `OpenDataLoader PDF`
  - utility fallback 후보: `MarkItDown`
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

### 2026-03-24 — Mobile Responsiveness Hardening
- 상태: resolved
- 결정:
  - 반응형 값(브레이크포인트, 고정 레이아웃 폭)은 디자인 토큰화하지 않고 `responsive.css` media query로 관리한다.
  - 모든 터치 타겟은 모바일에서 최소 44px을 보장한다.
  - `admin-table`은 `admin-table-wrap` 스크롤 래퍼로 수평 오버플로를 방지한다.
  - SiteHeader는 모바일에서 햄버거 메뉴 + 드롭다운 패턴을 사용한다.
- 근거:
  - CSS `@media`는 `var()` 미지원으로 브레이크포인트 토큰화 불가.
  - `admin-detail-meta`, `admin-table`, `pipeline-detail-panel`이 `responsive.css`에서 누락돼 모바일 레이아웃이 깨졌다.
  - nav-links, sidebar-link, sidebar-toggle 등의 터치 타겟이 15~30px로 44px 최소 기준 미달이었다.
- 변경: `responsive.css` 37줄→132줄, `SiteHeader.tsx` 클라이언트 컴포넌트 전환, TSX 7개 테이블 래퍼 추가
- 기준 문서:
  - `apps/web/app/responsive.css`
  - `docs/status/FRONTEND-HANDOFF.md`

### 2026-03-24 — Design Token Unification
- 상태: resolved
- 결정:
  - CSS에서 raw rgba/hex 하드코딩을 전면 제거하고 `var()` 참조로 전환한다.
  - `colorRgbTokens`를 추가해 `rgba(var(--color-X-rgb), alpha)` 패턴을 지원한다.
  - `purple` (#bc9aff) 색상 토큰을 추가한다 (비디오/raw_received 상태용).
  - `--radius-md` (12px), `--radius-sm` (8px), `--type-body` (0.92rem), `--type-label` (0.65rem) 토큰을 추가한다.
  - `button-danger`와 `modification-reasons`가 사용하던 미등록 색상 `#f43f5e`를 `--color-rose`로 통일한다.
  - `pipeline.css`의 Tailwind 팔레트 색상 12종을 프로젝트 토큰으로 전환한다.
- 근거:
  - CSS 6개 파일에서 raw rgba 28회+(cream), Tailwind hex 12종(pipeline), 미등록 색상 2종이 발견됐다.
  - 근본 원인은 `rootCssVariables`가 hex만 내보내 alpha 사용 시 raw rgba가 강제된 것이었다.
  - RGB 채널 변수 추가로 구조적 문제를 해결하고, 총 141건의 하드코딩을 `var()` 참조로 교체했다.
- 기준 문서:
  - `packages/design-tokens/src/index.ts`
  - `docs/status/FRONTEND-HANDOFF.md` §2 (CSS 토큰)

### SEO & 상업화 기반 아키텍처 (2026-03-26)
- 결정: Next.js Metadata API 기반 SEO 인프라 + RSS route handler + JSON-LD 구조화 데이터
- 이유:
  - 경쟁사 분석 결과 Disquiet(CSR)는 SEO 사실상 사망, 요즘IT(SSR+JSON-LD)가 최고 검색 노출
  - TLDR은 기사별 고유 URL 없어 SEO 자산 축적 불가 — VibeHub는 `/brief/{slug}` 영구 링크로 차별화
  - RSS feed는 TLDR/Rundown이 미제공 → 차별화 기회
- 구현:
  - robots.ts + sitemap.ts (동적 brief slug 포함)
  - 6개 공개 페이지 고유 metadata + title template (`%s | VibeHub`)
  - `/brief/[slug]` generateMetadata (OG article, Twitter card, canonical)
  - JSON-LD 3종: Organization (root), NewsArticle (brief detail), BreadcrumbList (brief detail)
  - GA4 Analytics (env 기반, `NEXT_PUBLIC_GA_ID` 없으면 비렌더링)
  - RSS feed (`/feed.xml` route handler)
  - Footer 5-section (Product/Legal/Connect/Brand + copyright)
  - /privacy + /terms 법적 페이지
  - Brief 상세 공유 버튼 (X, LinkedIn, Threads)
- 미적용 (향후):
  - Naver Search Advisor 등록 (도메인 확정 후)
  - 동적 OG 이미지 생성 (opengraph-image.tsx)
  - Kakao SDK 공유
  - Cookie consent banner
- 기준 문서: `docs/ref/SEO-COMMERCIALIZATION-AUDIT.md`

### 2026-03-29 — Design Inspiration Source Expansion + `design_token` Radar Lane
- 상태: resolved
- 결정:
  - editorial lane에 design inspiration RSS 8개(`Landing Love`, `Codrops`, `Awwwards Blog`, `CSS-Tricks`, `Smashing Magazine`, `Nielsen Norman Group`, `A List Apart`, `Logo Design Love`)를 migration seed/upsert로 고정
  - `design_token` category를 `DISCOVER_CATEGORIES` / `discoverCategoryVisuals` / radar filter에 추가하고 `rose` badge visual로 배정
  - radar 필터 URL 파라미터를 `group`에서 `category`로 전환해 `/radar?category=design_token` deep-link를 지원
  - Obsidian discover export에 `Design Tokens` 폴더를 추가해 `design_token` 항목을 자동 동기화
  - snapshot/fallback 분류 라우팅에 design-tag 신호를 추가해 새 editorial design source가 brief로 새지 않고 discover `design_token`으로 흐르도록 보정
  - live ingest snapshot이 DB source UUID를 그대로 유지하도록 보정해 editorial/discover row가 실제 `public.sources` row와 안정적으로 연결되게 함
  - `supabase-editorial-sync`가 approved discover row에 snapshot 시각 기반 `published_at`를 채워 public radar gate와 discover sync 결과를 일치시킴
  - radar index는 Featured 중복 제거를 유지하되, category/search 필터가 있을 때는 highlighted 항목도 다시 검색 결과에 포함되게 조정
- 근거:
  - 실제 `public.sources` 스키마 확인 결과 `id`는 uuid PK이고 `kind`는 NOT NULL이며 existing editorial RSS의 `max_items`는 3이 기본 운영값이었다. 따라서 일회성 INSERT보다 migration seed/upsert가 새 환경 재현성과 운영 일관성에 맞다.
  - `Landing Love`, `Codrops`, `Awwwards Blog`, `CSS-Tricks`, `Smashing Magazine`, `NN/g`, `A List Apart`, `Logo Design Love`의 RSS endpoint는 2026-03-29 실측에서 모두 응답했다.
  - 기존 radar는 group filter만 지원해 `design_token` 단일 탭 deep-link가 불가능했고, fallback 분류 로직도 design 계열 태그를 몰라 discover lane으로 보내지 못했다.
- 영향:
  - design inspiration source가 DB SSOT에 재현 가능하게 고정되고, radar/Obsidian 양쪽에서 `design_token` surface가 독립된 레인으로 노출된다.
  - discover filter 공유 링크는 `/radar?group=...` 대신 `/radar?category=...`를 기준으로 갱신해야 한다.
  - `pipeline:supabase-migrate`는 기존 정책/트리거/테이블이 이미 있는 환경에서도 재실행 가능해야 하므로 migration idempotency guard를 함께 유지해야 한다.
  - 실측 검증 기준 2026-03-29 결과는 `live-fetch` 31 sources / 87 items, `discover_items.design_token` 20건, Obsidian `Radar/Design Tokens` 20건 export였다.

## Next Review Order
1. ~~review / publish mutation 모델 확정~~ done — Server Action 버튼 구현 완료
2. ~~`SUPABASE_DB_URL` 환경변수 세팅 + end-to-end 검증~~ done — pipeline → UI E2E 검증 완료, Supabase query timeout 보호 적용
3. watch-folder auto-analysis output 연결
4. admin auth / observability hardening
