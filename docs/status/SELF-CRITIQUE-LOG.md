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

---

## 2026-04-06 비평 결과

### 처리 브리프: 10건
### 평균 점수: 3.0 / 5.0

### 브리프별 요약

| slug | 제목명확성 | 흡입력 | 요약밀도 | 본문깊이 | 톤 | 평균 |
|------|-----------|--------|----------|----------|-----|------|
| ai-benchmarks-are-broken-here-s-what-we-need-instead-live-a36 | 4 | 5 | 2 | 3 | 4 | 3.6 |
| accelerating-the-next-phase-of-ai-live-9bd | 2 | 2 | 4 | 2 | 3 | 2.6 |
| 30-years-ago-robots-learned-to-walk-without-falling-live-38d | 5 | 5 | 2 | 3 | 4 | 3.8 |
| accelerating-the-next-phase-of-ai-live-ope (**중복**) | 2 | 2 | 4 | 2 | 3 | 2.6 |
| protecting-people-from-harmful-manipulation-live-f0d | 4 | 4 | 3 | 3 | 4 | 3.6 |
| new-artificial-intelligence-specialty-for-ux-certification-live-235 | 4 | 2 | 2 | 2 | 3 | 2.6 |
| minimum-viable-product-mvp-definition-live-235 | 3 | 1 | 2 | 3 | 2 | 2.2 |
| lyria-3-pro-create-longer-tracks-in-more-live-f0d | 2 | 2 | 4 | 3 | 4 | 3.0 |
| less-gaussians-texture-more-4k-feed-forward-textured-splatti-live-62c | 2 | 2 | 2 | 1 | 1 | 1.6 |
| glm-5-1-4-6-live-370 | 5 | 5 | 5 | 4 | 5 | 4.8 |

### 발견된 패턴

- **[P1] 완전 중복 발행 (1건 쌍)**: `accelerating-the-next-phase-of-ai`가 `-ope` (2026-04-01)와 `-9bd` (2026-04-03) 두 개로 이틀 간격 발행됨. title, summary, body가 완전 동일한 OpenAI 블로그 포스트. `duplicate_of IS NULL` auto-approve 가드와 Jaccard 유사도 검사가 모두 이를 통과시킨 것. 중복 감지가 발행 후 중복을 잡지 못하고 있다.
- **[P2] 요약 truncation 지속 (4/10건)**: ai-benchmarks, 30-years-robots, new-ai-specialty, less-gaussians 브리프의 summary가 "..." 또는 "...."로 끝남. 지난 주 [P6]에서도 Lyria 제목 잘림이 지적됐으나, summary truncation에 대한 brief-level quality gate가 없어 반복됨. AUTO-PUBLISH-RULES의 discover 게이트엔 truncation 조건이 있으나 brief_posts에는 없다.
- **[P3] 학술 논문 원문 무가공 노출 (1건)**: `less-gaussians` 브리프에 논문 저자 affiliation 각주(`†`, `\\`, `Work done while at Apple`), 관련 없는 related work 블럽 2개, 채용 배너("Discover opportunities in Machine Learning / Work with us")가 그대로 포함됨. 지난 주 [P4]와 같은 Apple ML 소스 문제가 여전히 해결되지 않음. 제안 #4가 적용되지 않은 상태.
- **[P4] 보도자료 보일러플레이트 미제거 (2건)**: `accelerating-next-phase` 브리프가 "March 31, 2026\nCompany\n"으로 시작하고, `new-ai-specialty` 브리프가 "Announcements\n"으로 시작함. 지난 주 제안 #1 artifact 정제가 아직 적용되지 않아 반복됨.
- **[P5] 정의형/glossary 콘텐츠 부적합 (1건)**: `minimum-viable-product` 브리프(16,941자)는 NNGroup 정의 아티클의 near-complete 사본. 뉴스 미디어 피드에서 glossary entry는 독자 가치가 낮고 제목 흡입력도 1점. 동일 발행일 NNGroup 소스 2건 동시 노출 중.
- **[P6] 제목 truncation 재발 (1건)**: `lyria-3-pro-create-longer-tracks-in-more` 제목이 "in more"에서 잘림. 지난 주 동일 브리프가 [P6]에서 이미 지적됨 — 같은 소스/slug에서 재발한 것이 아니라 동일 슬러그 재발행으로 보임.
- **[P7] 최우수 브리프 패턴 확인**: `glm-5-1-4-6` (4.8/5) — 원문 없이 독자적으로 합성된 콘텐츠, 수치 기반 제목("nears Claude Opus 4.6"), 타이트한 요약. `last_editor_note: "canonical English copy repaired manually"`. 이 패턴이 editorial review 기준점이어야 함.

### 개선 제안

---

## 제안 #5: `docs/ref/AUTO-PUBLISH-RULES.md` — 완전 중복 발행 차단 강화

**근거:** P1 패턴 — 동일 title + 동일 source domain 조합이 이미 published 상태로 존재하면 새 브리프를 auto-approve 하지 않는다. 현재 Jaccard 유사도 검사는 "중복 임계치"를 사용하는데, 동일 문자열에서도 통과한 것으로 보임.

**현재:**
> - no high-similarity match against existing published brief titles/summaries

**제안:**
> - no high-similarity match against existing published brief titles/summaries
> - **exact-title block**: 동일 title 문자열(대소문자 무시)이 `published` 상태 브리프에 이미 존재하면 `duplicate_of`를 해당 id로 설정하고 auto-approve를 막는다
> - **same-source dedup window**: 동일 `source_links[0]` 도메인에서 생성된 브리프가 최근 7일 내 published된 것과 Jaccard ≥ 0.85이면 중복으로 처리한다

---

## 제안 #6: `docs/ref/AUTO-PUBLISH-RULES.md` — brief summary truncation gate 추가

**근거:** P2 패턴 — Discover quality gate에는 summary `...` 잘림 방지 조건이 있으나(§ Discover Quality Gate), brief_posts에는 없음. 4/10건이 truncated summary로 발행됨.

**현재:**
> ## Auto Queue Conditions
> - summary length `50-200`

**제안:**
> ## Auto Queue Conditions
> - summary length `50-200`
> - **summary truncation block**: summary가 `...` 또는 `….` 로 끝나면서 길이가 160자 미만이면 auto-approve를 막는다. 160자 이상이면 clampText 산출물로 허용 (discover 게이트와 동일 기준)

---

## 제안 #7: `.claude/automations/daily-editorial-review.md` — 학술 소스 editorial-wrapper 필수화

**근거:** P3 패턴 — Apple ML RSS, arxiv 계열 소스는 논문 abstract를 그대로 피드하므로 저자 affiliation 각주, related work 블럽, 채용 배너가 본문에 유입됨. 제안 #4(2026-04-01)가 아직 미적용인 상태에서 동일 패턴 재발.

**현재:**
> #### 본문(body) 규칙
> - 내부 용어 금지: pipeline, ingest, draft, classify, orchestrat 등

**제안:**
> #### 본문(body) 규칙
> - 내부 용어 금지: pipeline, ingest, draft, classify, orchestrat 등
> - **학술 소스 필수 재작성**: source_links[0].href가 arxiv.org, machinelearning.apple.com, research.*.com 계열이면 abstract/저자 목록을 그대로 사용 금지. 반드시 독자 언어(non-jargon)로 다시 작성하고, 저자 affiliation 각주·related work 블럽·채용 배너를 제거한다

---

## 제안 #8: `docs/ref/REVIEW-POLICY.md` — 사람 검수 진입 조건에 verbatim 감지 추가

**근거:** P4 패턴 — 보도자료 보일러플레이트가 반복 유입되고 있음. 현재 Sampling Review 기준은 confidence/critic score 중심이라 verbatim 복사 여부를 별도로 확인하지 않음.

**현재:**
> ## Human Review Entry Conditions
> - low confidence
> - policy risk
> - duplicate ambiguity
> - source tier issue
> - publish rule failure
> - broken action link
> - category mismatch
> - source coverage insufficiency

**제안:**
> ## Human Review Entry Conditions
> - low confidence
> - policy risk
> - duplicate ambiguity
> - source tier issue
> - publish rule failure
> - broken action link
> - category mismatch
> - source coverage insufficiency
> - **verbatim body**: body 첫 단락이 source_links[0] 원문과 ≥80% 문자열 일치 (보도자료 그대로 노출 방지)

### 적용 여부

- [ ] 제안 #5: AUTO-PUBLISH-RULES.md 완전 중복 exact-title block + same-source 7일 dedup window (운영자 승인 대기)
- [ ] 제안 #6: AUTO-PUBLISH-RULES.md brief summary truncation gate 160자 미만 잘림 차단 (운영자 승인 대기)
- [ ] 제안 #7: daily-editorial-review.md 학술 소스 editorial-wrapper 필수화 (운영자 승인 대기)
- [ ] 제안 #8: REVIEW-POLICY.md verbatim body 감지 human-review 진입 조건 추가 (운영자 승인 대기)

> ⚠️ 참고: 2026-04-01 제안 #1~#4가 모두 미적용 상태. P2(summary truncation), P3(학술 소스), P4(artifact 보일러플레이트) 패턴이 이번 주 재발. 우선순위 높은 항목부터 적용 검토 권장.

---

## 2026-04-13 비평 결과

### 처리 브리프: 4건
### 평균 점수: 3.5 / 5.0

### 브리프별 요약

| slug | 제목명확성 | 흡입력 | 요약밀도 | 본문깊이 | 톤 | 평균 |
|------|-----------|--------|----------|----------|-----|------|
| ai-is-changing-how-small-online-sellers-decide-what-to-make-live-a36 | 4 | 3 | 1 | 4 | 4 | 3.2 |
| ai-can-help-with-survey-writing-but-it-still-requires-human--live-235 | 5 | 3 | 4 | 4 | 3 | 3.8 |
| a-concrete-definition-of-an-ai-agent-live-235 | 5 | 4 | 4 | 5 | 3 | 4.2 |
| anthropic-is-having-a-month-live-b73 | 2 | 4 | 2 | 3 | 2 | 2.6 |

### 발견된 패턴

- **[P1] Summary truncation 3주 연속 재발 (1건)**: `ai-is-changing-how-small-online-sellers` 브리프의 summary가 "…bec"로 잘림. 2026-04-01 [P6], 2026-04-06 [P2]에서 동일 패턴이 지적됐고 제안 #6(AUTO-PUBLISH-RULES summary truncation gate)이 미적용 상태에서 또 반복됨. 이번 7일 내 발행 4건 중 25%가 truncated summary.
- **[P2] Body 첫 줄 "Summary:" boilerplate 유입 (2건)**: `ai-can-help-with-survey-writing` 및 `a-concrete-definition-of-an-ai-agent` 두 브리프 body 모두 `"Summary: ..."` 문구로 시작. NNGroup 원문 구조가 가공 없이 그대로 복사된 것으로 보임. 제안 #1(artifact 정제)이 아직 미적용 상태.
- **[P3] NNGroup 단일 소스 동일일 2건 동시 발행**: `ai-can-help-with-survey-writing`과 `a-concrete-definition-of-an-ai-agent`가 2026-04-07 정확히 같은 published_at 타임스탬프(`03:03:48`)로 발행됨. max_items=3 제한이 있으나 동일 날짜 집중 발행을 막지 못함. 독자 피드에서 동일 소스 콘텐츠가 연속 노출될 위험.
- **[P4] 제목·요약 비전문 구어체 톤 (1건)**: `anthropic-is-having-a-month` 제목은 "having a month"라는 모호한 영어 관용어, summary는 "A human really borks things"라는 속어(slang)를 사용. 전문 미디어 톤 기준 위반이며 last_editor_note가 null — 사람 검수 없이 auto-approve된 것으로 보임. 전체 브리프 중 최저 평균(2.6/5).
- **[P5] "AI + 동사" 제목 구조 반복**: 동일 7일 내 2건 — "AI is changing how…", "AI Can Help with…" — 이 동일한 구조를 공유. 4건 중 50%가 AI 주어 + 동사 패턴으로 제목 다양성 저하.

### 개선 제안

---

## 제안 #9: `.claude/automations/daily-editorial-review.md` — body "Summary:" prefix 명시 제거 필수화

**근거:** P2 패턴 — NNGroup 등 외부 원문이 `Summary:` 또는 `Summary\n` 접두사와 함께 body에 유입됨. 제안 #1(artifact 정제)에 이미 보일러플레이트 제거 규칙이 있으나 이 구체적 패턴이 명시되지 않아 2주 연속 통과.

**현재:**
> #### 본문(body) 규칙
> - **artifact 정제 필수**: 아래 패턴은 본문에서 반드시 제거한다
>   - 이미지 alt-text
>   - 팟캐스트/오디오 플레이어 요소
>   - 단독 섹션 헤더 boilerplate
>   - 원문 사이트 자기 홍보 문구

**제안:**
> #### 본문(body) 규칙
> - **artifact 정제 필수**: 아래 패턴은 본문에서 반드시 제거한다
>   - 이미지 alt-text
>   - 팟캐스트/오디오 플레이어 요소
>   - 단독 섹션 헤더 boilerplate
>   - 원문 사이트 자기 홍보 문구
>   - **body 첫 줄 "Summary:" 접두사**: `Summary:`, `Summary\n`, `TL;DR:` 등으로 시작하는 body는 VibeHub summary 필드와 중복이다. 반드시 제거하고 실제 리드 단락으로 대체한다.

---

## 제안 #10: `.claude/automations/daily-editorial-review.md` — 제목·요약 구어체 slang 필터 추가

**근거:** P4 패턴 — "borks", "having a month" 같은 비격식 슬랭이 summary와 title에 유입됨. 현재 editorial review 프롬프트에는 톤 일관성 지침이 있으나, 구체적 금지 표현 패턴이 명시되지 않아 auto-approve를 통과함.

**현재:**
> #### 제목(title) 규칙
> - 영어, 15-70자
> - 원문 제목과 달라도 됨

**제안:**
> #### 제목(title) 규칙
> - 영어, 15-70자
> - 원문 제목과 달라도 됨
> - **톤 금지 표현**: 아래 유형의 표현이 title 또는 summary에 있으면 전문 미디어 언어로 재작성한다
>   - 슬랭·속어 ("borks", "nukes", "tanks", "dunks on" 등)
>   - 모호한 관용어 ("having a moment/month/day", "it's giving X", "no cap" 등)
>   - 과도한 감탄·과장 ("absolutely", "insane", "mind-blowing" 등)
>   - 이 경우 human review 진입 조건으로 escalate하지 않고 프롬프트 내 재작성을 우선한다

---

## 제안 #11: `docs/ref/AUTO-PUBLISH-RULES.md` — 동일 소스 동일일 복수 발행 방지

**근거:** P3 패턴 — NNGroup 소스 2건이 완전히 동일한 타임스탬프로 발행됨. 독자 피드에 같은 소스 콘텐츠가 연속 노출. 현재 max_items=3 제한은 소스별 총 건수를 제한하나, 동일 발행일 집중 노출을 막지 못함.

**현재:**
> ## Auto Queue Conditions
> - no high-similarity match against existing published brief titles/summaries

**제안:**
> ## Auto Queue Conditions
> - no high-similarity match against existing published brief titles/summaries
> - **same-source daily cap**: 동일 source_links[0] 도메인에서 동일 published_date(UTC 기준)에 이미 1건이 published 상태이면 추가 발행을 보류하고 다음 날 스케줄로 이동한다. (daily-auto-publish 단계에서 적용)

### 적용 여부

- [ ] 제안 #9: daily-editorial-review.md body "Summary:" prefix 제거 필수화 (운영자 승인 대기)
- [ ] 제안 #10: daily-editorial-review.md 제목·요약 slang 필터 추가 (운영자 승인 대기)
- [ ] 제안 #11: AUTO-PUBLISH-RULES.md 동일 소스 동일일 1건 daily cap (운영자 승인 대기)

> ⚠️ 누적 미적용 현황: 제안 #1~#8 전원 미적용 상태. 이번 주 P1(summary truncation)·P2(body boilerplate) 패턴이 각각 3주, 2주 연속 재발. **제안 #6(summary truncation gate)과 제안 #1(artifact 정제)이 가장 반복 발생 빈도 높음 — 최우선 적용 권장.**
