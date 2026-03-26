# media-engine/
도메인 무관 미디어 처리 엔진 — 이미지 생성, 텍스트 생성, 오디오 분석, 영상 렌더, 스토리지, 채널 발행, 피드백 수집.

## Origin
takdizang 프로젝트에서 도메인 특화 코드를 제거하고 범용 인프라만 추출한 패키지.

## Structure

### 기존 모듈 (src/ 플랫)
- `types.ts` — 모든 타입 통합 (Generation, Image Provider, TTS, Publish)
- `kie-client.ts` — Kie.ai Nano Banana 2 이미지 생성 (createTask → poll)
- `removebg-client.ts` — Kie.ai recraft/remove-background
- `kie-provider.ts` — Kie Provider 래퍼 (ImageGenerationProvider 구현)
- `mock-provider.ts` — 테스트용 Mock Provider (SVG placeholder)
- `registry.ts` — Provider 팩토리 (USE_MOCK, IMAGE_PROVIDER 환경변수)
- `download.ts` — 이미지 URL/data URI → base64 다운로드
- `normalize.ts` — Sharp 이미지 정규화 (WebP 변환, 2048/640 리사이즈)
- `gemini-client.ts` — Gemini 범용 래퍼 (JSON Schema 강제, 429 재시도)
- `brief-parser.ts` — 마크다운 텍스트 → sections 파서
- `bgm-analyzer.ts` — WAV/MP3 바이너리 파서 (duration 검증)
- `render-spawn.ts` — Remotion CLI 크로스플랫폼 spawn (Windows cmd.exe / Unix npx)
- `supabase-storage.ts` — Supabase Storage DI 패턴 (createStorageHelper)
- `runtime-paths.ts` — 배포 환경별 경로 헬퍼
- `polling.ts` — Kie.ai 공통 폴링 유틸

### 신규 모듈 (계획, 미구현)
- `tts/notebooklm-bridge.ts` — NotebookLM CLI 래퍼 (주 경로, 2인 대화 팟캐스트). 검증 완료: M4A 32MB/17분. ffmpeg loudnorm -16 LUFS 후처리 포함
- `tts/qwen3-client.ts` — Qwen3-TTS FastAPI 클라이언트 (백업 경로, 1인 나레이션)
- `tts/tts-types.ts` — TtsRequest, TtsResult, VoicePreset 타입
- `image/gemini-image.ts` — Gemini 2.5 Flash 이미지 생성 (무료 $0, 하루 500건)
- `image/section-image-pipeline.ts` — brief 섹션별 이미지 프롬프트 생성 → Gemini → 정규화
- `publish/channel-types.ts` — PublishTarget, PublishResult, CrossPromoBlock, BriefChannelMeta
- `publish/promo-templates.ts` — 채널별 프로모션 텍스트 생성기
- `publish/cross-promo-sync.ts` — 2-pass + 3rd pass 크로스 프로모션 업데이트
- `publish/threads-publisher.ts` — Threads 공식 Publishing API (최우선)
- `publish/ghost-publisher.ts` — Ghost Admin API / WordPress REST API
- `publish/tistory-publisher.ts` — Playwright 브라우저 자동화 (보조)
- `publish/spotify-metadata.ts` — mp3 + 에피소드 메타데이터 생성 (업로드는 Spotify에 수동)
- `publish/youtube-local.ts` — 로컬 파일 생성 + metadata.json (업로드는 운영자 수동)
- `publish/publish-dispatcher.ts` — 2-pass 오케스트레이션 + YouTube 비동기 3rd pass
- `feedback/analytics-collector.ts` — YouTube Analytics + GA4 수집 cron
- `feedback/insight-generator.ts` — 주간 성과 분석 + 리포트

## Convention
- 외부 서비스 클라이언트는 환경변수(`KIE_API_KEY`, `GEMINI_API_KEY`)로 인증
- Supabase 클라이언트는 DI로 주입 (`createStorageHelper(client)`)
- `USE_MOCK=true`로 모든 외부 API를 mock 전환 가능
- 크로스플랫폼 호환: `path.join` 사용, `process.platform` 분기
- 채널 발행은 2-pass 구조: Pass 1(본문 발행) → Pass 2(크로스 프로모션 주입)
- YouTube는 로컬 저장 → 운영자 직접 업로드 → video_id 등록 후 Pass 3

## Dependencies
- `@google/genai` — Gemini API
- `sharp` — 이미지 처리 (네이티브, `npm install` 시 플랫폼별 자동 빌드)
- `@supabase/supabase-js` — peerDependency (DI로 주입)

### 신규 의존성 (계획)
- `playwright` — 티스토리 자동화
- ~~podcast~~ — 삭제, Spotify 직접 업로드로 대체
- `@remotion/media-utils` — 오디오 길이 계산
- `remotion-subtitles` — SRT 자막
- `googleapis` — YouTube Analytics + GA4
- `notebooklm-mcp-cli` — NotebookLM (pip, Python)

## 설계 문서
- `docs/ref/CHANNEL-PUBLISH-PIPELINE.md` — 채널 발행 v2 전체 명세
