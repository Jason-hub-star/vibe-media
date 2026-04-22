# VibeHub 일일 에디토리얼 자동 가공

## 목적
draft 상태 브리프를 레퍼런스 수준으로 가공하고, 품질 기준을 통과하면 review 큐로 자동 전송한 뒤 guardrail 기준을 만족하는 항목은 자동 승인까지 진행한다.
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

### 3-0. 발행 가치 선별
아래 패턴이면 애드센스/공개 품질 관점에서 **저가치 후보**로 보고 자동 가공하지 않는다. `status = draft`는 유지하고 결과 보고의 "건너뜀"에 사유를 남긴다.

- glossary/definition/how-to 기초 설명 글이라 시의성 있는 뉴스 가치가 약한 경우
- `Notes`, `MVP Definition`, 단순 용어 설명처럼 evergreen glossary로 읽히는 경우
- 원문이 릴리스 노트 나열형 changelog인데 사용자 영향/시장 맥락을 충분히 설명할 근거가 부족한 경우
- 소스가 1개뿐이고 추가 확인 가능한 신뢰 소스를 찾지 못해 독자용 해설을 만들 수 없는 경우
- 원문이 사실상 홍보/보도자료이며 독자 관점의 추가 가치 없이 재작성만 하게 되는 경우
- 550단어 이상의 독자용 해설로 확장할 수 없는 경우
- 동일 제목/동일 원문에서 이미 published brief가 있는 경우
- 제목이 슬랭/내부 메모처럼 보이는 경우 (`having a month`, `notes`, `borks`, `definition`, `how to`)

### 3-1. 원문 수집
1. `source_links[0].href`에서 원문 페이지를 WebFetch로 가져온다
2. 실패하면 WebSearch로 `"{title}" site:원문도메인`을 검색한다
3. 그래도 실패하면 WebSearch로 `"{title}" AI news`를 검색한다

### 3-2. OG 이미지 추출
1. 원문 HTML에서 `og:image` meta tag를 추출한다
2. 없으면 WebSearch 결과에서 이미지 URL을 찾는다
3. 아래 패턴이면 대표 이미지로 쓰지 않는다: `favicon`, `apple-touch-icon`, `icon`, `logo`, 128px 이하 소형 이미지, SVG 아이콘만 있는 경우
4. 위 조건에 맞는 기사 대표 이미지가 없으면 `cover_image_url = null`로 두고 결과 보고에 `image-missing`으로 기록한다

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
- 과장/선정/슬랭 금지: `borks`, `having a month`, `game changer` 같은 표현 금지

#### 요약(summary) 규칙
- 영어, 50-200자
- 1-2문장, `[누가] [무엇을] [왜]` 구조
- 원문 요약과 다른 표현으로 재작성
- `...` 또는 `…`로 끝나는 잘린 문장 금지
- 금지 패턴:
  - `X is excited/proud/pleased/happy to announce`
  - `originally published on ...`
  - `Summary:` / `TL;DR:` / `Listen to article`
  - 슬랭/밈/과장 카피
- VibeHub 독자 관점의 뉴스 한 줄 요약으로 다시 쓴다. 원문의 자기 홍보 문구를 옮기지 않는다.

#### 본문(body) 규칙
- **최소 550단어 + 5개 요소**: 리드 단락 + 2개 이상의 `## 헤딩` + 각 헤딩 아래 본문
- **가독성 목표**: 레퍼런스 brief처럼 `lead → ## Why it matters → ## How/Details → ## Context/What to watch` 흐름으로 7-11개 body 요소를 목표로 한다. 13개를 넘는 원문 단락 덤프는 저장하지 않는다.
- 헤딩은 반드시 `## `만 사용한다. `###`, `####` 등은 public presenter에서 구조가 깨지므로 금지한다.
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
- 각 일반 단락은 90단어 이상을 목표로 하며, 1-2문장 메모처럼 짧게 끝내지 않는다.
- 1-source 원문은 보조 신뢰 소스를 찾아 2개 이상의 서로 다른 도메인을 확보하지 못하면 공개 brief로 만들지 않는다.
- **artifact 정제 필수**: 아래 패턴은 본문에서 반드시 제거한다
  - 이미지 alt-text (`The X logo sits next to...`, `Photo of...`)
  - 팟캐스트/오디오 플레이어 요소 (`Listen to article`, `[duration] minutes`, `Play episode`)
  - 보일러플레이트 헤더 (`Announcements`, `Press Release`, `Company`, `Editor's Note`)
  - 본문 첫 줄 `Summary:` / `Summary`
  - 저자 affiliation 각주, related work 블럽, 채용/구독 배너, 원문 사이트 자기 홍보 문구
  - 출처 시리즈 소개 문구 (`MIT Technology Review Explains`, `Let our writers untangle...`, `You can read more from the series here`)
- **원문 덤프 금지**: 원문 순서대로 15-30개 단락을 옮기는 방식은 실패로 처리한다. 원문을 요약한 뒤 독자용 해설 중심의 3-5개 `##` 섹션으로 재구성한다.
- **학술 소스 필수 재작성**: `arxiv.org`, `machinelearning.apple.com`, `research.*` 계열은 abstract/저자 목록을 그대로 쓰지 않는다. 일반 독자가 이해할 언어로 다시 쓰고 jargon/각주를 제거한다.
- 내부 용어 금지: pipeline, ingest, draft, classify, orchestrat 등
- 독자가 다시 검색하지 않아도 핵심 맥락을 이해할 수 있게 쓴다. 내부 운영 판단이나 모델 선택 메모를 공개 문장에 넣지 않는다.

#### 소스(source_links) 규칙
- 최소 2개, 가능하면 3개
- 최소 2개 이상의 서로 다른 도메인
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

작성 후 아래 10항목을 자체 검증한다:

| 항목 | 통과 조건 |
|------|----------|
| Title length | 15-70자 |
| Summary length | 50-200자 |
| Summary truncation | `...` / `…`로 끝나는 잘린 문장 아님 |
| Body paragraphs | ≥3 (헤딩 제외) |
| Body words | ≥550 words |
| Body readability | 7-11개 요소 권장, 13개 초과 금지, heading은 `##`만 사용 |
| Source count | ≥2 |
| Source domains | ≥2 distinct domains |
| Source URLs | 전부 https:// |
| Internal terms | pipeline, ingest, draft, classify, orchestrat 포함 안 됨 |
| Artifact scrub | `Summary:`, `Listen to article`, `Announcements`, source-series intro, alt-text boilerplate 없음 |
| Marketing tone | `excited to announce`, `originally published on` 등 소스 홍보 문구 없음 |
| Reader value | glossary/definition/notes/how-to/changelog 나열만으로 끝나지 않고 독자용 맥락이 있음 |
| Image quality | favicon/icon만 대표 이미지로 저장하지 않음 |
| Duplicate check | 같은 제목/같은 원문 published brief 없음 |

**12/12 통과해야만 DB에 기록한다.** 하나라도 실패하면 해당 브리프는 건너뛰고 사유를 기록한다.

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

주의:
- 이 단계에서는 직접 `approved`로 바꾸지 않는다.
- 자동 승인 여부는 아래 3-7의 `review:auto-approve` 워커가 결정한다.

### 3-7. 자동 승인 가드 실행

브리프 가공 루프가 끝나면 아래 워커를 실행한다:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
npm run review:auto-approve -- --max=10 2>&1
```

자동 승인 기준:
- quality gate 10/10 통과
- `qualityScore >= 80` (B 상단 이상 권장 구간)
- classifier confidence `>= 0.85`
- `duplicate_of IS NULL`
- `exception_reason IS NULL`
- `target_surface != 'both'`
- source tier가 `manual-review-required`/`blocked`가 아님
- 기존 published brief와 제목/요약 Jaccard 유사도가 중복 임계치를 넘지 않음

기준을 만족하지 못하면:
- `review_status = pending` 유지
- `last_editor_note` / `admin_reviews.notes`에 hold 사유를 기록
- admin의 예외 큐에서만 사람이 확인한다

---

## 4. 결과 보고

```
## Daily Editorial Review

- 대상: N건
- 가공 완료: M건 (평균 스코어: XX점)
- 자동 승인: A건
- 자동 보류: H건
- A등급 레퍼런스 태깅: N건
- 건너뜀: K건 (사유: ...)
- 품질 통과율: M/N

### 가공된 브리프
| slug | title | body 단락 | 소스 수 | cover image |
|------|-------|----------|--------|-------------|
| ... | ... | N | N | ✓/✗ |
```

---

## 🔖 운영자 승인 대기 항목

(아래 항목은 자동 실행되지 않았습니다. 운영자가 확인 후 결정합니다.)

[PENDING-가공보류]
- 자동 보류 항목: 예외 사유 확인 후 수동 가공 또는 폐기 결정
→ 승인 시: "수동 가공 진행" 또는 "discard로 전환"

[PENDING-원문실패]
- 원문 접근 실패 항목: 수동으로 콘텐츠 수집 후 가공 여부 결정
→ 승인 시: "수동 입력" 또는 "draft 상태 유지"

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
- glossary/definition 성격의 evergreen 설명 글은 뉴스 가치가 낮으면 과감히 skip한다.
- favicon/icon 수준 이미지밖에 없으면 억지로 쓰지 않는다. 대표 이미지 없이 두고 후속 이미지 헬스 체크에 넘긴다.
- 원문 접근이 완전히 실패하면 그 브리프는 건너뛴다. 추측으로 채우지 않는다.
- 이미 `review`/`scheduled`/`published` 상태인 브리프는 절대 건드리지 않는다.
