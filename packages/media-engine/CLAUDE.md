# media-engine/
도메인 무관 미디어 처리 엔진 — 이미지 생성, 텍스트 생성, 오디오 분석, 영상 렌더, 스토리지.

## Origin
takdizang 프로젝트에서 도메인 특화 코드를 제거하고 범용 인프라만 추출한 패키지.

## Structure
- `image/` — Kie.ai 이미지 생성, 배경 제거, Sharp 정규화, Provider 추상화
- `text/` — Gemini 범용 래퍼, 마크다운 brief 파서
- `audio/` — WAV/MP3 바이너리 분석
- `video/` — Remotion CLI spawn 래퍼 (크로스플랫폼)
- `storage/` — Supabase Storage 업/다운로드 (DI 패턴)
- `tts/` — TTS provider 인터페이스 (구현체 향후 추가)
- `publish/` — 배포 target 인터페이스 (티스토리, YouTube, 뉴스레터)
- `util/` — 경로 헬퍼, 폴링 유틸

## Convention
- 외부 서비스 클라이언트는 환경변수(`KIE_API_KEY`, `GEMINI_API_KEY`)로 인증
- Supabase 클라이언트는 DI로 주입 (`createStorageHelper(client)`)
- `USE_MOCK=true`로 모든 외부 API를 mock 전환 가능
- 크로스플랫폼 호환: `path.join` 사용, `process.platform` 분기
