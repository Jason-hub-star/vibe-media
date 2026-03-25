# media-engine/
도메인 무관 미디어 처리 엔진 — 이미지 생성, 텍스트 생성, 오디오 분석, 영상 렌더, 스토리지.

## Origin
takdizang 프로젝트에서 도메인 특화 코드를 제거하고 범용 인프라만 추출한 패키지.

## Structure (플랫 — src/ 단일 폴더)
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

## Convention
- 외부 서비스 클라이언트는 환경변수(`KIE_API_KEY`, `GEMINI_API_KEY`)로 인증
- Supabase 클라이언트는 DI로 주입 (`createStorageHelper(client)`)
- `USE_MOCK=true`로 모든 외부 API를 mock 전환 가능
- 크로스플랫폼 호환: `path.join` 사용, `process.platform` 분기

## Dependencies
- `@google/genai` — Gemini API
- `sharp` — 이미지 처리 (네이티브, `npm install` 시 플랫폼별 자동 빌드)
- `@supabase/supabase-js` — peerDependency (DI로 주입)
