# VibeHub 일일 에디토리얼 자동 가공

## 목적
draft 상태 브리프를 레퍼런스 수준으로 가공하고, 품질 기준을 통과하면 review 큐로 자동 전송한다.
이 프롬프트는 `daily-pipeline.md` 실행 이후 스케줄러에서 자동 실행된다.

---

## 1. 사전 확인

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
echo "SUPABASE_DB_URL: ${SUPABASE_DB_URL:+set}"
```

`SUPABASE_DB_URL`이 없으면 즉시 중단.

---

## 2. 대상 브리프 조회

draft 상태이고 body가 1단락 이하인 브리프를 조회한다:

```sql
SELECT id, slug, title, summary, body, source_links, cover_image_url
FROM public.brief_posts
WHERE status = 'draft'
  AND jsonb_array_length(body) <= 1
ORDER BY slug ASC
```

대상이 0건이면 "가공 대상 없음"으로 종료.

---

## 3. 브리프별 가공 루프

각 draft 브리프에 대해 아래를 수행한다. **한 번에 최대 5개**만 처리.

### 3-1. 원문 수집
1. `source_links[0].href`에서 원문 페이지를 WebFetch로 가져온다
2. 실패하면 WebSearch로 `"{title}" site:원문도메인`을 검색한다
3. 그래도 실패하면 WebSearch로 `"{title}" AI news`를 검색한다

### 3-2. OG 이미지 추출
1. 원문 HTML에서 `og:image` meta tag를 추출한다
2. 없으면 WebSearch 결과에서 이미지 URL을 찾는다
3. 없으면 `cover_image_url = null`로 둔다

### 3-3. 본문 작성

아래 구조로 작성한다. **레퍼런스 브리프 풀**에서 가장 유사한 토픽의 A등급 brief를 few-shot 예시로 참조한다.

**레퍼런스 조회**:
```sql
SELECT title, summary, body, source_links FROM public.brief_posts
WHERE last_editor_note LIKE '%[REFERENCE]%'
  AND review_status = 'approved'
ORDER BY published_at DESC NULLS LAST
LIMIT 3
```

조회 결과가 0건이면 기존 레퍼런스(`openai-gpt-5-4-mini-nano-launch`)를 사용한다.

#### 제목 규칙
- 영어, 15-70자
- `[주체] [동사] [대상] — [부가설명]` 형태
- 원문 제목을 그대로 쓰지 말고, 핵심 사실을 요약

#### 요약(summary) 규칙
- 영어, 50-200자
- 1-2문장, `[누가] [무엇을] [왜]` 구조
- 원문 요약과 다른 표현으로 재작성

#### 본문(body) 규칙
- **최소 5개 요소**: 리드 단락 + 2개 이상의 `## 헤딩` + 각 헤딩 아래 본문
- 구조:
  ```
  [1] 리드 단락 — 핵심 사실 요약 (summary와 다르게)
  [2] "## Why it matters"
  [3] 영향 분석 단락
  [4] "## [기술/세부사항 헤딩]"
  [5] 기술 설명 단락
  [6] "## Competitive context" (또는 적절한 맥락 헤딩)
  [7] 맥락 분석 단락
  ```
- JSON 배열로 저장: 각 헤딩과 단락이 별도 요소
- 내부 용어 금지: pipeline, ingest, draft, classify, orchestrat 등

#### 소스(source_links) 규칙
- 최소 2개, 가능하면 3개
- `[0]`: 원문 (기존 유지)
- `[1]+`: WebSearch로 찾은 관련 보도/문서
- 각 소스: `{ "label": "사이트명", "href": "https://..." }`
- 모든 href는 HTTP(S)여야 함

### 3-4. 품질 스코어 기록 + 레퍼런스 태깅

작성 후 `brief-quality-check.ts`의 확장 스코어(0~100)를 산출한다.

**산출 기준** (게이트 50점 + 확장 50점):
- 게이트: title(10) + summary(10) + body(10) + source(10) + 용어(5) + URL(5)
- 확장: titleAppeal(10) + summaryStandalone(10) + structureScore(10) + sourceDiversity(10) + readability(10)

**등급**: A(≥85) B(≥70) C(≥55) D(≥40) F(<40)

**A등급 레퍼런스 자동 태깅**: score ≥ 85이면 `last_editor_note`에 `[REFERENCE]` 태그를 추가한다. 이 brief는 향후 few-shot 예시 풀에 포함된다.

### 3-5. 품질 검증 (자체 체크)

작성 후 아래 6항목을 자체 검증한다:

| 항목 | 통과 조건 |
|------|----------|
| Title length | 15-70자 |
| Summary length | 50-200자 |
| Body paragraphs | ≥3 (헤딩 제외) |
| Source count | ≥2 |
| Source URLs | 전부 https:// |
| Internal terms | pipeline, ingest, draft, classify, orchestrat 포함 안 됨 |

**6/6 통과해야만 DB에 기록한다.** 하나라도 실패하면 해당 브리프는 건너뛰고 사유를 기록한다.

### 3-6. DB 업데이트

품질 검증 통과 시:

```sql
UPDATE public.brief_posts
SET
  title = $title,
  summary = $summary,
  body = $body::jsonb,
  source_links = $source_links::jsonb,
  source_count = $source_count,
  cover_image_url = $cover_image_url,
  status = 'review',
  review_status = 'pending'
WHERE id = $id::uuid
  AND status = 'draft'
```

`AND status = 'draft'` 조건으로 이미 다른 사람이 건드린 브리프를 덮어쓰지 않는다.

동시에 admin_reviews에 레코드 생성:

```sql
INSERT INTO public.admin_reviews (target_type, target_id, review_status)
VALUES ('brief', $id::uuid, 'pending')
ON CONFLICT DO NOTHING
```

---

## 4. 결과 보고

```
## Daily Editorial Review

- 대상: N건
- 가공 완료: M건 (평균 스코어: XX점)
- A등급 레퍼런스 태깅: N건
- 건너뜀: K건 (사유: ...)
- 품질 통과율: M/N

### 가공된 브리프
| slug | title | body 단락 | 소스 수 | cover image |
|------|-------|----------|--------|-------------|
| ... | ... | N | N | ✓/✗ |
```

---

## 5. Telegram 보고

결과 보고 직후 아래 curl로 Telegram에 전송한다.

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a

# 섹션 4에서 작성한 결과 요약을 TEXT 변수에 담아 전송
# 예시 (실제 값은 섹션 4 결과로 채울 것):
# TEXT="[VibeHub] Editorial Review\n- 대상: N건\n- 가공 완료: M건\n- 건너뜀: K건\n- 품질 통과율: M/N"

if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_REPORT_CHAT_ID" ]; then
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_REPORT_CHAT_ID}" \
    --data-urlencode "text=${TEXT}" \
    > /dev/null
else
  echo "Telegram 키 없음 — 보고 생략"
fi
```

전송 실패(Telegram API 오류 등)는 무시하고 자동화를 정상 종료한다.

---

## 6. 행동 원칙

- 사실만 작성한다. 원문에 없는 내용을 추측하지 않는다.
- "## Why it matters"에서 VibeHub 관점이 아니라 **업계/독자 관점**으로 작성한다.
- 원문이 GitHub release changelog인 경우: 주요 feature/breaking change만 추려서 사람이 읽을 수 있는 요약으로 변환한다.
- 원문 접근이 완전히 실패하면 그 브리프는 건너뛴다. 추측으로 채우지 않는다.
- 이미 `review`/`scheduled`/`published` 상태인 브리프는 절대 건드리지 않는다.
