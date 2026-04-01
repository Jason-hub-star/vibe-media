# VibeHub Self-Critique Log

이 파일은 `weekly-self-critique` 자동화가 매주 갱신한다.
운영자는 각 제안의 `[ ]`를 `[x]`로 바꾸고 "적용해줘"라고 하면 Claude가 실제 파일에 반영한다.

---

<!-- 자동화가 여기 아래에 주차별 결과를 추가한다 -->

## 2026-04-01 비평 결과

### 처리 브리프: 10건
### 평균 점수: 3.0 / 5.0

### 브리프별 요약

| slug | 제목명확성 | 흡입력 | 요약밀도 | 본문깊이 | 톤 | 평균 |
|------|-----------|--------|----------|----------|-----|------|
| protecting-people-from-harmful-manipulation-live-f0d | 4 | 4 | 3 | 4 | 4 | 3.8 |
| new-artificial-intelligence-specialty-for-ux-certification-live-235 | 4 | 2 | 2 | 3 | 2 | 2.6 |
| minimum-viable-product-mvp-definition-live-235 | 3 | 1 | 2 | 3 | 3 | 2.4 |
| lyria-3-pro-create-longer-tracks-in-more-live-f0d | 2 | 2 | 4 | 3 | 3 | 2.8 |
| less-gaussians-texture-more-4k-feed-forward-textured-splatti-live-62c | 2 | 2 | 1 | 2 | 2 | 1.8 |
| glm-5-1-4-6-live-370 | 4 | 4 | 3 | 3 | 2 | 3.2 |
| genui-vs-vibe-coding-who-s-designing-live-235 | 5 | 4 | 4 | 3 | 4 | 4.0 |
| generative-ui-notes-live-2f6 | 2 | 2 | 1 | 3 | 2 | 2.0 |
| gemini-3-1-flash-live-making-audio-ai-more-natural-and-relia-live-f0d | 4 | 3 | 4 | 3 | 4 | 3.6 |
| elon-musk-s-last-co-founder-reportedly-leaves-xai-live-b73 | 5 | 4 | 3 | 3 | 4 | 3.8 |

### 발견된 패턴

- **[P1] 본문 artifact 오염 (4/10건)**: DeepMind/Google 소스의 본문 상단에 "Listen to article / [duration] minutes", "The Gemini emblem sits next to text reading...(이미지 alt-text)", "Announcements" 같은 RSS/HTML 잡음이 섞여 있다. 1번, 4번, 9번 브리프에서 확인됨. WebFetch로 가져온 HTML의 이미지 alt text와 팟캐스트 플레이어 UI 요소가 본문에 그대로 노출되는 것이 원인.
- **[P2] 요약/제목에 소스 마케팅 문구 유입 (2/10건)**: "NNGroup is excited to announce"(브리프 #2), "Generative UI Notes originally published on CSS-Tricks"(브리프 #8)처럼 원문 사이트의 자기 홍보 문구가 VibeHub 요약에 그대로 노출됨. Editorial review 프롬프트가 이 패턴을 명시적으로 차단하지 않는다.
- **[P3] NNGroup 단일 소스 과다 (3/10건)**: nielsen-norman-group에서 3건(#2, #3, #7)이 발행됨. max_items=3이고 소스 수가 많아 단일 주간에 한 소스가 30%를 차지하는 현상. #3(MVP 정의) 같은 기초 설명 글은 VibeHub의 전문 미디어 톤과 맞지 않음.
- **[P4] 연구 논문 소스의 전문성 불균형 (1/10건)**: Apple Machine Learning 소스(브리프 #5)는 raw 논문 abstract를 그대로 적재함. 기술 전문성이 너무 높아 일반 독자 접근성 미달. 요약이 순수 학술 abstract이고 본문도 논문 구조.
- **[P5] 한국어 브리프 미번역 발행 (1/10건)**: AI Times Korea 소스(브리프 #6)가 한국어 원문 그대로 published 상태. EN-first 플랫폼 규칙과 불일치. i18n translation worker가 이 소스에 적용되지 않은 것으로 보임.
- **[P6] 제목 흡입력 구조 반복**: 발행된 10건 중 "X: Y" 형태 제목이 4건("MVP: Definition", "Lyria 3 Pro: Create...", "Gemini 3.1 Flash: Making...", "GenUI vs. Vibe Coding: Who's Designing?"). 패턴 자체는 나쁘지 않으나 Lyria 제목이 "in more"로 잘린 것(#4)은 ingest 단계의 제목 truncation 버그로 보임.

### 개선 제안

---

## 제안 #1: `.claude/automations/daily-editorial-review.md` — 본문 작성 전 artifact 정제 단계 추가

**근거:** P1 패턴 — 4/10건 본문에 이미지 alt-text, 팟캐스트 플레이어 UI, "Announcements" 헤더 같은 HTML 잡음이 노출됨. 현재 §3-3 본문 작성 지침에 이를 명시적으로 걸러내는 규칙이 없다.

**현재:**
> #### 본문(body) 규칙
> - **최소 5개 요소**: 리드 단락 + 2개 이상의 `## 헤딩` + 각 헤딩 아래 본문
> - 내부 용어 금지: pipeline, ingest, draft, classify, orchestrat 등

**제안:**
> #### 본문(body) 규칙
> - **최소 5개 요소**: 리드 단락 + 2개 이상의 `## 헤딩` + 각 헤딩 아래 본문
> - **artifact 정제 필수**: 아래 패턴은 본문에서 반드시 제거한다
>   - 이미지 alt-text ("The X logo sits next to...", "Photo of...", 등)
>   - 팟캐스트/오디오 플레이어 요소 ("Listen to article", "[duration] minutes", "Play episode")
>   - 단독 섹션 헤더 boilerplate ("Announcements", "Press Release", "Editor's Note")
>   - 원문 사이트 자기 홍보 문구 ("X is excited to announce", "originally published on Y")
> - 내부 용어 금지: pipeline, ingest, draft, classify, orchestrat 등

---

## 제안 #2: `.claude/automations/daily-editorial-review.md` — 요약 마케팅 언어 명시 차단

**근거:** P2 패턴 — "NNGroup is excited to announce", "originally published on CSS-Tricks" 같은 소스 자기 홍보 문구가 VibeHub 요약에 노출됨. §3-3 요약 규칙에서 이 패턴을 구체적으로 언급하지 않는다.

**현재:**
> #### 요약(summary) 규칙
> - 영어, 50-200자
> - 1-2문장, `[누가] [무엇을] [왜]` 구조
> - 원문 요약과 다른 표현으로 재작성

**제안:**
> #### 요약(summary) 규칙
> - 영어, 50-200자
> - 1-2문장, `[누가] [무엇을] [왜]` 구조
> - 원문 요약과 다른 표현으로 재작성
> - **금지 패턴**: "X is excited/proud/pleased to announce", "originally published on Y", "X is happy to share" 같은 소스 마케팅 문구를 그대로 쓰지 않는다. VibeHub 독자 관점의 뉴스 한 줄 요약으로 재작성한다.

---

## 제안 #3: `docs/ref/AUTO-PUBLISH-RULES.md` — 한국어 브리프 auto-publish 차단 조건 추가

**근거:** P5 패턴 — AI Times Korea / 인공지능신문 소스의 한국어 원문이 번역 없이 그대로 published 상태가 됨. EN-first 플랫폼에서 한국어 브리프가 공개 노출되면 독자 경험 불일치.

**현재:**
> ## Auto Queue Conditions
> - `review_status = approved`
> - `status IN ('review', 'scheduled')`
> - title length `15-70`
> - summary length `50-200`
> - body paragraphs `>= 3` (헤딩 제외)
> - source count `>= 2`
> - source URLs are all `https://`
> - internal terms `pipeline`, `ingest`, `classify`, `orchestrat` absent

**제안:**
> ## Auto Queue Conditions
> - `review_status = approved`
> - `status IN ('review', 'scheduled')`
> - title length `15-70`
> - summary length `50-200`
> - body paragraphs `>= 3` (헤딩 제외)
> - source count `>= 2`
> - source URLs are all `https://`
> - internal terms `pipeline`, `ingest`, `classify`, `orchestrat` absent
> - **title and summary contain only ASCII + Latin characters** (한글/일본어/중국어 등 비라틴 문자가 있으면 translation worker를 먼저 실행한다)

---

## 제안 #4: `docs/ref/SOURCE-CATALOG.md` — Apple ML 소스에 editorial treatment 주석 추가

**근거:** P4 패턴 — Apple Machine Learning RSS는 연구 논문 abstract를 직접 피드하므로 일반 독자 접근성이 낮다. 현재 카탈로그에 이 소스에 대한 특별 처리 지침이 없다.

**현재:**
> | Apple Machine Learning | rss | machinelearning.apple.com/rss.xml | auto-safe | 3 |

**제안:**
> | Apple Machine Learning | rss | machinelearning.apple.com/rss.xml | auto-safe | 2 |
> *(주석 추가: 논문 abstract 소스 — editorial review 시 반드시 일반 독자 언어로 재작성. 기술 jargon 요약을 그대로 사용 금지. max_items 3→2로 줄여 과도한 연구 논문 노출 방지)*

### 적용 여부

- [ ] 제안 #1: daily-editorial-review.md artifact 정제 단계 추가 (운영자 승인 대기)
- [ ] 제안 #2: daily-editorial-review.md 요약 마케팅 언어 차단 추가 (운영자 승인 대기)
- [ ] 제안 #3: AUTO-PUBLISH-RULES.md 한국어 브리프 gate 추가 (운영자 승인 대기)
- [ ] 제안 #4: SOURCE-CATALOG.md Apple ML editorial 주석 + maxItems 2로 조정 (운영자 승인 대기)
