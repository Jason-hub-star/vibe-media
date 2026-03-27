# Source Catalog

## Decision Date
- 2026-03-22 (초안), 2026-03-26 (DB SSOT 전환 + 검증)

## 소스 검증 결과 (2026-03-26)
- DB 30개 → **23개 활성** / 7개 비활성화 (404/403)
- 수집량: 9건/실행 → **63건/실행** (7배 증가)
- 비활성: Anthropic Research(404), Boston Dynamics(404), Meta AI(404), Physical Intelligence(404), Wired AI(404), Tesla AI(404), OpenAI API Changelog(403)

## Purpose
- v1에서 무엇을 수집 대상으로 올릴지 category별로 고정한다.
- source는 추측으로 늘리지 않고, 공식성/지속성/자동화 적합도를 기준으로 1차 배치를 운영한다.

---

## v1 활성 소스 (코드 구현 완료, live-source-registry.ts)

| ID | 소스명 | 종류 | Content Type | Feed URL | Tier | 상태 |
|----|--------|------|-------------|----------|------|------|
| `openai-news-rss` | OpenAI News | RSS | article | `openai.com/news/rss.xml` | auto-safe | ✅ 활성 |
| `google-ai-blog-rss` | Google AI Blog | RSS | article | `blog.google/.../ai/rss/` | auto-safe | ✅ 활성 |
| `github-releases-openai-node` | GitHub Releases | GitHub API | repo | `api.github.com/.../releases` | auto-safe | ✅ 활성 |
| `openai-api-changelog` | OpenAI API Changelog | RSS | article | `platform.openai.com/docs/changelog` | auto-safe | ❌ 비활성 — stable RSS endpoint 미확인 |
| `anthropic-research` | Anthropic Research | RSS | doc | `anthropic.com/news/rss.xml` | auto-safe | ❌ 비활성 — live fetch 시 404 반환 |

**maxItems**: 모든 소스 3건/회

---

## 확장 로드맵 (미구현, SOURCE-EXPANSION-STRATEGY.md 참고)

### Brief Sources (목표)
| 소스 | 상태 | 비고 |
|------|------|------|
| OpenAI News | ✅ 활성 | |
| OpenAI API Changelog | ❌ 비활성 | RSS endpoint 미확인 |
| Anthropic Research | ❌ 비활성 | RSS 404 |
| Google AI Blog | ✅ 활성 | |
| Google DeepMind | 미구현 | |
| Google Developers AI / Gemini | 미구현 | |
| Hugging Face Blog | 미구현 | ✅ RSS 확인: `huggingface.co/blog/feed.xml` (500+ items, auto-safe) |
| arXiv (P1 확장 후보) | 미구현 | SOURCE-EXPANSION-STRATEGY.md |
| Hacker News (P1 확장 후보) | 미구현 | SOURCE-EXPANSION-STRATEGY.md |

### Discover Sources (목표)
| 소스 | 상태 | 비고 |
|------|------|------|
| GitHub Releases | ✅ 활성 (openai-node만) | |
| GitHub Trending | 미구현 | 테스트 픽스처만 존재 |
| Product Hunt AI | 미구현 | 테스트 픽스처만 존재 |
| curated GitHub lists | 미구현 | |

### Event / Contest / Grant Sources (목표)
| 소스 | 상태 | 비고 |
|------|------|------|
| Devpost | 미구현 | 테스트 픽스처만 존재 |
| Kaggle Competitions | 미구현 | 테스트 픽스처만 존재 |
| AI Engineer World's Fair | 미구현 | |
| MLH official hackathons | 미구현 | |

---

## Initial Tier Assignment
### `auto-safe`
- OpenAI News ✅
- OpenAI API Changelog (비활성)
- Anthropic Research (비활성)
- Google AI Blog ✅
- Google DeepMind (미구현)
- Google Developers AI blog (미구현)
- Hugging Face Blog (미구현)
- GitHub Releases ✅

### `render-required`
- GitHub Trending (미구현)
- Product Hunt AI (미구현)
- 일부 이벤트/공모전 landing pages (미구현)

### `manual-review-required`
- 로그인 후 내용이 보이는 page
- 구조가 자주 바뀌는 community-driven event page

### `blocked`
- CAPTCHA / paywall / 강한 anti-bot source

## Surface Mapping
### 기본 `brief`
- OpenAI News ✅
- OpenAI API Changelog (비활성)
- Anthropic Research (비활성)
- Google AI / DeepMind / Google Developers (부분 활성)
- Hugging Face Blog (미구현)

### 기본 `discover`
- GitHub Trending (미구현)
- GitHub Releases ✅
- Product Hunt AI (미구현)
- Devpost (미구현)
- Kaggle Competitions (미구현)
- MLH (미구현)
- AI Engineer World's Fair (미구현)

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

---

## 소스 자동 확장 정책

### 주기적 소스 발견 (source-discovery cron)

소스는 수동 등록에만 의존하면 고갈된다. 주기적으로 새 소스를 발견하고 검증하는 루프가 필요하다.

#### 발견 경로

| 경로 | 방법 | 주기 |
|------|------|------|
| **기존 소스 역추적** | 수집된 brief의 source_links에서 새 도메인 추출 → 해당 사이트 RSS 탐색 | 주 1회 |
| **GitHub Trending** | trending 목록에서 AI 관련 신규 프로젝트의 공식 블로그 발견 | 주 1회 |
| **Hacker News 상위** | HN front page AI 관련 링크에서 반복 출현하는 도메인 → 소스 후보 | 주 1회 |
| **운영자 수동 등록** | 어드민 UI에서 직접 추가 | 수시 |
| **비활성 소스 재검증** | 404/403 실패 소스의 feed_url 재탐색 (사이트 리뉴얼 후 URL 변경) | 월 1회 |

#### 자동 검증 프로세스

```
후보 발견 → feed_url 유효성 체크 (HTTP HEAD)
  → RSS 파싱 테스트 (최소 1개 아이템 추출 가능?)
  → 3일간 테스트 수집 (enabled=false, shadow 모드)
  → 아이템 품질 평가 (quality score 평균 ≥55?)
  → 운영자 승인 → enabled=true
```

#### DB 필드 지원

```sql
-- 소스 후보 상태 추적 (기존 sources 테이블 활용)
-- enabled=false + failure_reason='candidate: 검증 중' → 후보 상태
-- enabled=false + failure_reason='candidate: 품질 미달' → 탈락
-- enabled=true → 정식 소스
```

#### 소스 자동 비활성화

| 조건 | 동작 |
|------|------|
| 3회 연속 fetch 실패 | `enabled=false` + `failure_reason` 기록 |
| 30일간 신규 아이템 0건 | 경고 → 운영자 확인 후 비활성화 |
| brief quality score 평균 < 40 (F등급) | 경고 → maxItems 1로 축소 → 운영자 확인 |

#### 소스 자동 승격

| 조건 | 동작 |
|------|------|
| 30일 brief quality 평균 ≥ 85 (A등급) | maxItems 3→5 |
| 60일 연속 fetch 성공 + 평균 ≥70 | 신뢰 소스 뱃지 (어드민 표시) |

#### 목표 소스 수

| 시점 | 목표 | 현재 |
|------|------|------|
| v1 (현재) | 20~25개 활성 | 23개 ✅ |
| 3개월 후 | 35~40개 활성 | — |
| 6개월 후 | 50개+ 활성 | — |
