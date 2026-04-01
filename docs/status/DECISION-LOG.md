# Decision Log

이 문서는 현재 진행 중(pending)인 결정만 관리한다.
완료된 결정은 `docs/archive/decisions-resolved.md`에 보관.

## Pending

### 2026-04-01 — Whisper Metal GPU 오염 버그 (video:render 파이프라인)
- 상태: pending (픽스 필요)
- 배경: `npm run video:render` 실행 시 MimikaStudio TTS 완료 직후 whisper-cli가 exit code 3으로 실패.
  Metal GPU 상태 오염으로 추정 — tsx 프로세스 내에서 spawn된 whisper-cli의 `ggml_metal_library_compile_pipeline`(bfloat 테스트)이 완료 메시지 없이 종료됨.
  같은 whisper 명령을 독립 shell 또는 tsx 종료 후 실행하면 정상 동작.
- 임시 조치: `complete-longform-render.ts`로 tsx 종료 후 whisper 실행 → 나머지 단계 수동 완성.
  YouTube 설명 5000자 초과 버그도 발견 → `upload-youtube-direct.ts`로 우회.
- 결정 필요:
  1. `whisper-word-level.ts`의 `spawnAsync`에 `env: { ...process.env, GGML_METAL_DISABLE: '1' }` 추가 — 단 CPU 폴백 성능 확인 필요
  2. 또는 video:render 워커를 TTS 단계와 Whisper 단계를 별도 프로세스로 분리
  3. `buildDescription`에 5000자 truncation 추가 필요 (현재 full body 삽입 시 초과)

### 2026-03-27 — Newsletter 페이지 Brief 미리보기 추가
- 상태: pending
- 배경: 뉴스레터 페이지에 폼만 있어 "구독하면 뭘 받는지" 알 수 없음
- 결정: 최신 published Brief 3개를 미리보기 카드로 표시, 서버 컴포넌트에서 fetch
- 영향: 기존 `listBriefs` API 재활용, 추가 엔드포인트 불필요
