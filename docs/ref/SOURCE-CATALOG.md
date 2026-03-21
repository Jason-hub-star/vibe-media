# Source Catalog

## Decision Date
- 2026-03-22

## Purpose
- v1에서 무엇을 수집 대상으로 올릴지 category별로 고정한다.
- source는 추측으로 늘리지 않고, 공식성/지속성/자동화 적합도를 기준으로 1차 배치를 운영한다.

## Brief Sources
### Product / Platform
- OpenAI News
- OpenAI API Changelog
- Anthropic Research
- Google AI Blog
- Google DeepMind
- Google Developers AI / Gemini 관련 블로그
- Hugging Face Blog

### Why
- 공식성
- 출처 신뢰성
- 한국어 해설 가치
- 업데이트 지속성

## Discover Sources
### Open Source / Tools
- GitHub Trending
- GitHub Releases for tracked repos
- curated GitHub lists (`awesome-*`, ecosystem lists)
- Product Hunt AI category

### Why
- 바로 이동/다운로드/별도 CTA로 연결하기 좋다.
- `open_source`, `tool`, `sdk`, `agent`, `plugin`, `website` 분류에 자연스럽다.

## Event / Contest / Grant Sources
- Devpost
- Kaggle Competitions
- AI Engineer World’s Fair
- MLH official hackathons

## Why
- `event`, `contest`, `grant`, `community` 분류에 연결하기 좋다.
- 일정, 신청 링크, 자격 조건, CTA를 구조화하기 쉽다.

## Initial Tier Assignment
### `auto-safe`
- OpenAI News
- OpenAI API Changelog
- Anthropic Research
- Google AI Blog
- Google DeepMind
- Google Developers AI blog
- Hugging Face Blog
- GitHub Releases

### `render-required`
- GitHub Trending
- Product Hunt AI
- 일부 이벤트/공모전 landing pages

### `manual-review-required`
- 로그인 후 내용이 보이는 page
- 구조가 자주 바뀌는 community-driven event page

### `blocked`
- CAPTCHA / paywall / 강한 anti-bot source

## Surface Mapping
### 기본 `brief`
- OpenAI News
- OpenAI API Changelog
- Anthropic Research
- Google AI / DeepMind / Google Developers
- Hugging Face Blog

### 기본 `discover`
- GitHub Trending
- GitHub Releases
- Product Hunt AI
- Devpost
- Kaggle Competitions
- MLH
- AI Engineer World’s Fair

### `both` 가능
- 대형 open-source release
- 중요한 SDK / API launch
- 산업 영향이 큰 이벤트 발표

## Expansion Rule
- source 추가 조건:
  - 공식성 또는 높은 생태계 영향력
  - 반복 수집 가치
  - CTA 또는 해설 가치가 분명함
- source 제거 조건:
  - 업데이트 중단
  - 반복 실패
  - low-value duplicate 비율이 높음
  - 자동화보다 수동 부담이 훨씬 큼

## Review Order
1. 공식 brief source
2. tracked release source
3. discover/event source
4. long-tail experimental source
