# Source Tier Policy

## Tier Definitions
### `auto-safe`
- 공식 블로그, RSS, sitemap, 공개 API, GitHub release 등
- 기본 자동 대상
- 허용 도구:
  - crawler
  - rss reader
  - api client

### `render-required`
- 로그인 없이 접근 가능하지만 JS 렌더링이 필요한 페이지
- 자동 대상에 포함
- 허용 도구:
  - browser renderer
  - crawler + render fallback

### `manual-review-required`
- 로그인 세션, 구조 불안정, 수동 승인 필요 source
- 자동 파이프라인 밖에서 사람 보조 전제로 처리

### `blocked`
- CAPTCHA, 강한 anti-bot, paywall, 정책상 위험
- 자동 수집 제외

## Default Rule
- v1 자동화 범위는 `render-required`까지다.
- 로그인/강한 차단 source는 자동 대상에 넣지 않는다.
- source/tool 선택은 `SOURCE-RESEARCH-METHOD.md`와 shadow/eval 결과를 함께 본다.

## Tier Changes
- 동일 source가 반복 실패하면 상위 tier에서 하위 tier로 내린다.
- 운영자는 retry history와 failure reason을 보고 tier를 조정한다.
