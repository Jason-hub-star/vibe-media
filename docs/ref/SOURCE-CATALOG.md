# Source Catalog

## Decision Date
- 2026-03-22 (초안), 2026-03-26 (DB SSOT 전환 + 검증), 2026-03-27 (DB 실측 동기화), 2026-03-29 (design inspiration RSS 확장), 2026-03-31 (AI 무관 소스 비활성화 + 카테고리 재분류), 2026-04-05 (harness_pattern 소스 7개 추가 + 카테고리 신설)

## 소스 현황 요약 (2026-04-06 DB 실측 기준)
- editorial: **35개 활성** / 10개 비활성 (harness_pattern 전용 7개 포함)
- tool_candidate: **2개 활성** / 4개 비활성
- 전체: **37개 활성** / 14개 비활성

> ⚠️ 이 문서는 DB(`public.sources`)가 SSOT다. 코드 수정 없이 DB에서 직접 활성화/비활성화한다.

---

## editorial 활성 소스 (35개)

| 소스명 | kind | feed_url / repo | tier | max_items |
|--------|------|-----------------|------|-----------|
| A List Apart | rss | alistapart.com/main/feed/ | auto-safe | 3 |
| AI Times Korea | rss | aitimes.com/rss/allArticle.xml | render-required | 3 |
| ~~Awwwards Blog~~ | rss | awwwards.com/blog/feed/ | auto-safe | 3 | **비활성** (AI 무관) |
| Apple Machine Learning | rss | machinelearning.apple.com/rss.xml | auto-safe | 3 |
| Ars Technica AI | rss | feeds.arstechnica.com/arstechnica/technology-lab | auto-safe | 3 |
| CSS-Tricks | rss | css-tricks.com/feed/ | auto-safe | 3 |
| Codrops | rss | tympanus.net/codrops/feed/ | auto-safe | 3 |
| DeepMind Blog | rss | deepmind.google/blog/rss.xml | auto-safe | 3 |
| GitHub Releases (openai-node) | github-releases | openai/openai-node | auto-safe | 3 |
| GitHub: anthropics/anthropic-sdk-python | github-releases | anthropics/anthropic-sdk-python | auto-safe | 3 |
| GitHub: huggingface/transformers | github-releases | huggingface/transformers | auto-safe | 3 |
| GitHub: langchain-ai/langchain | github-releases | langchain-ai/langchain | auto-safe | 3 |
| GitHub: vercel/ai | github-releases | vercel/ai | auto-safe | 3 |
| Google AI Blog | rss | blog.google/innovation-and-ai/technology/ai/rss/ | auto-safe | 3 |
| Hacker News | rss | news.ycombinator.com/rss | auto-safe | 3 |
| Hugging Face Blog | rss | huggingface.co/blog/feed.xml | auto-safe | 3 |
| IEEE Spectrum Robotics | rss | spectrum.ieee.org/feeds/topic/robotics.rss | auto-safe | 3 |
| Import AI Newsletter | rss | import-ai.substack.com/feed | auto-safe | 3 |
| ~~Landing Love~~ | rss | landing.love/index.xml | auto-safe | 3 | **비활성** (AI 무관) |
| LangChain Blog | rss | blog.langchain.dev/rss/ | auto-safe | 3 |
| ~~Logo Design Love~~ | rss | logodesignlove.com/feed | auto-safe | 3 | **비활성** (AI 무관) |
| Microsoft AI Blog | rss | blogs.microsoft.com/ai/feed/ | auto-safe | 3 |
| MIT Technology Review | rss | technologyreview.com/feed/ | auto-safe | 3 |
| NVIDIA AI Blog | rss | blogs.nvidia.com/blog/category/deep-learning/feed/ | auto-safe | 3 |
| Nielsen Norman Group | rss | nngroup.com/feed/rss/ | auto-safe | 3 |
| OpenAI News | rss | openai.com/news/rss.xml | auto-safe | 3 |
| Smashing Magazine | rss | smashingmagazine.com/feed/ | auto-safe | 3 |
| Stability AI Blog | rss | stability.ai/news/rss.xml | auto-safe | 3 |
| TechCrunch AI | rss | techcrunch.com/category/artificial-intelligence/feed/ | auto-safe | 3 |
| The Verge AI | rss | theverge.com/rss/ai/index.xml | auto-safe | 3 |
| 인공지능신문 | rss | aitimes.kr/rss/allArticle.xml | render-required | 3 |
| AI News (smol.ai) | rss | news.smol.ai/rss.xml | auto-safe | 5 | harness_pattern |
| Eugene Yan's Blog | rss | eugeneyan.com/rss/ | auto-safe | 3 | harness_pattern |
| Latent Space | rss | latent.space/feed | auto-safe | 3 | harness_pattern |
| Lilian Weng's Blog | rss | lilianweng.github.io/index.xml | auto-safe | 3 | harness_pattern |
| Simon Willison TIL | rss | til.simonwillison.net/tils/feed.atom | auto-safe | 5 | harness_pattern |
| Simon Willison's Weblog | rss | simonwillison.net/atom/everything/ | auto-safe | 5 | harness_pattern |
| 긱뉴스 | rss | news.hada.io/rss/news | auto-safe | 5 | harness_pattern (한국어) |

---

## editorial 비활성 소스 (10개)

| 소스명 | 비활성 사유 |
|--------|------------|
| Anthropic Research | RSS 404 — Next.js 동적 앱, 피드 미제공 |
| Awwwards Blog | AI 무관 — 웹디자인 케이스스터디 전문 |
| Landing Love | AI 무관 — 웹사이트 쇼케이스 전문 |
| Logo Design Love | AI 무관 — 로고/브랜딩 전문 |
| Boston Dynamics Blog | RSS 404 |
| Meta AI Blog | RSS 404 |
| OpenAI API Changelog | RSS endpoint 미확인 (403) |
| Physical Intelligence Blog | RSS 404 |
| Tesla AI | render-required, 수집 불안정 |
| Wired AI | RSS 404 |

---

## tool_candidate 활성 소스 (2개)

| 소스명 | kind | max_items |
|--------|------|-----------|
| GitHub Search: developer tools | github-search | 8 |
| Hacker News Show HN | hn-show | 10 |

## tool_candidate 비활성 소스 (4개)

| 소스명 | 비활성 사유 |
|--------|------------|
| BetaList | manual-review-required, 불안정 |
| DevHunt | render-required |
| LeanVibe | manual-review-required |
| Product Hunt | manual-review-required |

---

## harness_pattern 카테고리

2026-04-05 신설. AI 엔지니어링 패턴과 실행 가능한 워크플로를 다루는 소스에서 수집된 아이템이 이 카테고리로 분류된다.

**분류 기준 (`harness` 태그가 있는 소스 기본값):**
- 구체적인 워크플로/단계가 있나?
- 코드 예시나 설정이 있나?
- "~하면 좋다" 수준이 아닌 "이렇게 하면 작동한다" 수준인가?

**라우팅:** `discover` 서피스 → `harness_pattern` 카테고리 → `Radar/Harness Patterns/` Obsidian 내보내기 ✅ (2026-04-05 구현)

**코드 위치:**
- `packages/content-contracts/src/discover.ts` — DISCOVER_CATEGORIES에 등록
- `apps/backend/src/shared/discover-category-routing.ts` — `harness` 태그 → `harness_pattern` 우선 라우팅
- `apps/backend/src/shared/obsidian-discover-export.ts` — `harness_pattern` → `Radar/Harness Patterns/` 폴더 export

---

## OpenAI·Google 편중에 대하여

소스 다양성 자체는 충분하다 (31개 활성). 편중이 발생하는 주요 원인:

1. **뉴스 사이클**: OpenAI·Google이 대형 발표를 집중적으로 낸 날은 편중이 자연스럽다.
2. **dedup-guard**: TechCrunch·The Verge가 같은 OpenAI 소식을 다뤄도 원문 소스와 중복으로 제거된다.
3. **1차 발표 우선**: 공식 블로그(openai.com, blog.google)가 auto-safe 최상단이라 먼저 통과한다.

편중을 줄이려면 소스 추가보다 **dedup 임계값 조정** 또는 **소스당 maxItems 하향**이 더 효과적이다.

---

## 확장 로드맵

### 추가 후보 (RSS 확인 완료)
| 소스 | feed_url | 우선순위 |
|------|----------|----------|
| arXiv cs.AI | export.arxiv.org/rss/cs.AI | P1 |
| Google DeepMind (별도) | deepmind.google/blog/rss.xml | 이미 활성 |
| Anthropic Research | — | RSS 없음, 스크래퍼 필요 |

### 추가 후보 (render-required / 수동 수집 필요)
| 소스 | URL | 콘텐츠 성격 | 수집 방법 | 우선순위 |
|------|-----|------------|-----------|----------|
| skills.sh | skills.sh | AI 에이전트 스킬 디렉토리 (1000+ 스킬). Claude Code/Cursor/Codex 등 20+ 에이전트 지원. 스킬=재사용 가능한 지침 세트(SKILL.md). 주간 인스톨 수 기반 인기도 확인 가능. | RSS 없음. sitemap.xml에 1000+ URL 존재. 각 페이지에서 스킬명/설명/인스톨수/repo 추출 가능. sitemap 기반 크롤링 또는 GitHub repo 직접 수집. | **P1 — harness_pattern 핵심 소스** |
| DESIGN.md | designmd.ai | AI 코딩 도구용 디자인 시스템 저장소. "Just Added" / "Trending" 섹션이 정기 업데이트됨. 100개 이상 무료 디자인 시스템 수록. | RSS 없음, Astro 기반 JS 렌더링. 브라우저 자동화로만 수집 가능. | P2 |

### Surface Mapping
- `brief`: editorial 소스 중 해설/분석 성격으로 분류된 항목
- `discover`: tool_candidate 소스 전체 + editorial 소스 중 직접 행동/큐레이션 성격으로 분류된 항목 (`website` 카테고리 포함)

### 카테고리 재분류 (2026-03-31)
프론트엔드/UX 소스 5개의 default_tags에서 `design` 제거, `web`/`frontend` 계열로 재분류:
- Smashing Magazine, CSS-Tricks, A List Apart, Nielsen Norman Group, Codrops
