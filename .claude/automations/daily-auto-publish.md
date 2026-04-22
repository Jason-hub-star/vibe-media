# VibeHub 일일 자동 발행

## 목적

**Brief**: `review_status = approved`이고 `status IN (review, scheduled)`인 브리프를 quality check 후 자동으로 scheduled → published 전환한다.
quality check 실패 항목은 `draft + pending`으로 되돌려 다음 editorial review에서 다시 가공되게 한다.

**Discover**: `review_status = pending`이고 `published_at IS NULL`인 discover 항목을 경량 quality check 후 자동으로 approved + published 전환한다.
`/radar` 공개 페이지는 `isPublished` 게이트(`approved + published_at IS NOT NULL`)를 적용하므로, 이 단계를 거쳐야 레이더에 노출된다.
단, AdSense 재심사 기간에는 얇은 release-note형 / changelog형 / 링크 허브형 discover 항목을 무조건 공개하지 않는다.

이 프롬프트는 `daily-drift-guard.md` 실행 이후 스케줄러에서 자동 실행된다.

---

## 실행 순서

```
daily-pipeline → daily-editorial-review → daily-drift-guard → daily-auto-publish (이것)
  └→ §9 번역 (translate:variant --locale=es)
  └→ daily-media-publish: video:render → publish:channels (영상 렌더 완료 후 채널 발행)
```

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

## 2. dry-run 먼저 확인

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
npm run publish:auto-dry 2>&1
```

대상이 0건이면 "발행 대상 없음"으로 종료.

---

## 3. 실제 실행

dry-run에서 대상이 1건 이상이면:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
npm run publish:auto 2>&1
```

---

## 4. quality check 기준 (워커 내장)

| 항목 | 통과 조건 |
|------|----------|
| Title length | 15-70자 |
| Summary length | 50-200자 |
| Summary truncation | `...` / `…`로 끝나는 잘린 문장 아님 |
| Body paragraphs | ≥3 (헤딩 제외) |
| Body words | ≥550 words |
| Body readability | 13개 이하 body 요소, heading은 `##`만 사용 |
| Source count | ≥2 |
| Source domains | ≥2 distinct domains |
| Source URLs | 전부 https:// |
| Internal terms | pipeline, ingest, classify, orchestrat 없음 |
| Artifact scrub | `Summary:`, `Listen to article`, `Announcements`, `Play episode`, source-series intro 없음 |
| Reader angle | 독자/팀/조직에 미치는 영향이 본문에 명시됨 |
| Thin topic | `Notes`, `MVP Definition`, glossary/definition/how-to 단독 글 아님 |
| Image quality | favicon/icon/저품질 대표 이미지 아님 |

**12/12 통과해야만 전환.** 하나라도 실패하면 skip으로 기록하고 `draft + pending`으로 되돌린다.

AdSense 재심사 기간에는 published 후보라도 아래 중 하나면 반드시 발행 보류한다:
- 1-source 기사
- 550단어 미만 또는 3분 미만으로 보이는 얇은 본문
- 같은 제목/같은 원문의 기존 published brief가 있는 중복 후보
- `Notes`, `Definition`, `How to`, 릴리스 노트, 학술 abstract 요약처럼 추가 해설 없이 끝나는 글
- 독자용 `why it matters` 문단이 없거나 원문 홍보 문구를 재작성하지 않은 글
- 원문을 15-30개 단락으로 거의 그대로 옮긴 source-dump형 글
- `MIT Technology Review Explains`, `Let our writers untangle...`, `You can read more from the series here` 같은 출처 사이트 소개문이 남은 글
- `###`/`####` heading으로 public presenter에서 구조가 깨지는 글

---

## 5. 전환 규칙

- `review + approved` → `scheduled` (즉시)
- `scheduled + approved` → `published` (`scheduled_at <= NOW()` 조건)
- `draft` 상태는 절대 건드리지 않음

---

## 6. 안전장치

- `AND review_status = 'approved'` — 미승인 브리프는 절대 건드리지 않음
- `AND status IN ('review', 'scheduled')` — draft 직행 차단
- `AND (scheduled_at IS NULL OR scheduled_at <= NOW())` — 미래 예약 브리프 보호
- 한 번에 최대 10개 처리
- recovery 시 `last_editor_note`에 quality fail 사유를 남긴다

---

## 7. 행동 원칙 (Brief)

- dry-run 결과를 먼저 확인하고 실제 실행한다.
- 대상이 없으면 짧게 보고하고 종료한다.
- 전환 발생 시 Telegram으로 자동 보고된다 (워커 내장).
- quality check 실패 항목은 skip 사유와 함께 기록한다.
- skip 사유가 `source count`, `body word count`, `thin title pattern`, `summary appears truncated`, `missing reader-facing angle`이면 자동 복구 발행하지 말고 editorial rewrite 대상으로만 남긴다.

---

## 8. Discover 자동 발행

Brief 발행이 끝난 후, pending 상태의 discover 항목도 발행한다.

### 8-1. 대상 조회

```sql
SELECT d.id, d.slug, d.title, d.category, d.summary
FROM public.discover_items d
WHERE d.review_status = 'pending'
  AND d.published_at IS NULL
ORDER BY d.created_at ASC
```

대상이 0건이면 "discover 발행 대상 없음"으로 넘어간다.

### 8-2. 품질 검증 (Brief보다 가벼움)

| 항목 | 통과 조건 | 실패 동작 |
|------|----------|----------|
| Title | 10-120자 | skip |
| Summary | 60자 이상 | skip |
| Truncation | `...` / `…`로 끝나면서 120자 미만 아님 | skip |
| Quote-only | 인용구로 시작하더라도 실질 설명 40자 이상 | skip |
| Internal terms | pipeline / ingest / classify / orchestrat 없음 | skip |
| Actions | `discover_actions`에 1개 이상 존재 | skip |
| Action URLs | 모든 action href가 `https://`로 시작 | skip |

AdSense 재심사 기간 추가 hold 조건:
- summary가 `Updated dependencies.`, `Maintenance release`, `release notes`, `changelog` 나열 수준이면 skip
- 클릭 유도 외 설명이 거의 없는 디렉터리형/링크 허브형 항목이면 skip
- 같은 카테고리의 얇은 항목이 연속 다수 쌓이면 skip 후 운영자 검토로 넘긴다

액션 조회:
```sql
SELECT discover_item_id, action_kind, label, href
FROM public.discover_actions
WHERE discover_item_id = ANY($ids::uuid[])
```

### 8-3. 발행 전환

품질 검증 통과 시:

```sql
UPDATE public.discover_items
SET review_status = 'approved',
    published_at = NOW()
WHERE id = $id::uuid
  AND review_status = 'pending'
  AND published_at IS NULL
```

- `AND review_status = 'pending' AND published_at IS NULL` — 운영자가 이미 건드린 항목 보호
- 한 번에 최대 20개 처리

### 8-4. 안전장치

- `pending` 상태만 건드린다 — `changes_requested`, `rejected`는 절대 안 건드림
- `preserveDiscoverLifecycle`이 발행된 항목을 다음 pipeline sync에서 보호함
- action link가 없는 항목은 레이더에 올라가도 의미 없으므로 반드시 skip

### 8-5. Discover 결과 보고

Brief 보고와 함께 Telegram에 포함한다:

```
[VibeHub] Auto Publish
- Brief: scheduled M건 / published N건 / skipped K건
- Discover: published X건 / skipped Y건

✓ stitch-sdk (plugin)
✓ openai-api-platform (api)
```

### 8-6. 행동 원칙 (Discover)

- Brief처럼 장문 본문을 쓰지는 않지만, thin-content 신호가 보이면 "그대로 발행"하지 말고 pending 상태로 남긴다.
- 품질 검증 실패 항목은 skip만 하고 상태를 바꾸지 않는다 (다음 실행에서 재시도).
- Brief와 Discover 보고를 하나의 Telegram 메시지로 합쳐 보낸다.
- AdSense 재심사 기간에는 discover 양보다 공개 품질을 우선한다. 애매하면 publish보다 hold를 선택한다.

---

## 9. 다국어 번역 (i18n Translation)

§3에서 새로 `published` 전환된 brief를 스페인어로 자동 번역한다.
번역 variant가 생성되어야 `daily-media-publish`의 `publish:channels` 실행 시 locale별 발행이 이뤄진다.

### 9-1. 대상 선정

§3에서 `published`로 전환된 brief slug 목록을 사용한다.
대상이 0건이면 skip.

### 9-2. 번역 실행

각 published brief에 대해:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
npm run translate:variant <brief-slug> --locale=es
```

- `GEMINI_API_KEY` 필수 (Gemini 2.5 Flash 번역, 비용 $0)
- 번역 후 자동으로 품질 체크 실행 (악센트/미번역/고유명사/단락수 등 7개 규칙)
- 품질 통과 시 `translation_status = translated`, `quality_status = passed`
- 품질 실패 시 `translation_status = quality_failed` — 영어 발행은 계속 유지

### 9-3. Discover 번역 (선택)

Brief 번역 완료 후, 최근 published discover 항목도 번역할 수 있다:

```bash
npm run translate:variant <discover-slug> --locale=es --discover
```

Discover는 title + summary만 번역하므로 빠르다 (brief 대비 ~1/3).

### 9-4. 안전장치

- 번역 실패해도 영어 발행은 절대 영향 없음 (variant 테이블 분리)
- Gemini API 429 시 1회 자동 재시도 (2초 대기)
- `--dry-run`으로 사전 검증 가능
- 잘못된 locale(`kr` 등) 전달 시 즉시 거부
- canonical locale(`en`) 번역 시도 시 즉시 거부

### 9-5. 행동 원칙 (Translation)

- 번역은 published brief만 대상 — draft/review 상태는 건드리지 않는다
- 품질 실패 variant는 admin `/admin/translations`에서 수동 확인 가능
- 번역된 variant는 다음 `publish:channels` 실행 시 자동으로 es 발행에 포함된다
- `daily-media-publish`의 SRT 번역(§3)과는 독립 — 텍스트 번역과 영상 자막은 별개 파이프라인

### 9-6. 결과 보고

Telegram 보고는 별도로 하지 않는다 (번역 워커 자체는 console 출력만).
품질 실패 건이 있으면 `/admin/translations`에서 확인.

---

## 🔖 운영자 승인 대기 항목

(아래 항목은 자동 실행되지 않았습니다. 운영자가 확인 후 결정합니다.)

[PENDING-번역처리]
- 번역 실패 항목: 재시도 또는 영어만 발행 유지 여부 확인
- 품질 실패 variant: `/admin/translations`에서 수동 수정 또는 폐기
→ 승인 시: "번역 variant 승인 후 publish:channels 재실행" 또는 "variant 폐기"

[PENDING-미디어발행]
- 영상 생성 대기: `daily-media-publish`로 렌더/발행 진행
→ 승인 시: "`npm run video:render <slug>`로 영상 생성 후 `npm run publish:channels <slug>`"

---

## 10. 미디어 + 뉴스레터 발행 연결

번역(§9) 완료 후, 미디어와 뉴스레터 파이프라인이 이어서 실행된다.

```
daily-auto-publish (§9 번역)
  ├→ daily-media-publish
  │    ├─ Shorts: Gemini → MimikaStudio TTS → Remotion BriefShort → ffmpeg
  │    ├─ Longform: Gemini → MimikaStudio TTS → Remotion BriefLongform → ffmpeg
  │    └─ publish:channels → Threads + YouTube API 자동 업로드 (unlisted) + brief 자동 연결
  ├→ daily-youtube-repair
  │    ├─ YouTube 누락 업로드 백필
  │    └─ unlisted/private → public 전환
  └→ newsletter:send (EN + ES Resend Broadcasts, blocking: false)
```

- **채널 발행 + 미디어**: `daily-media-publish.md` — 영상 렌더 완료 후 `publish:channels` 실행 (Threads · YouTube · Podcast)
  - `publish:channels`는 반드시 영상 렌더 이후 — `daily-auto-publish`에서 직접 실행하지 않음
- **YouTube 복구 + 공개 전환**: `daily-youtube-repair.md` — 미디어 발행 직후 누락 업로드 백필 + 공개 승격
- **YouTube 업로드**: `YOUTUBE_*` 환경변수 설정 시 자동 (unlisted), 미설정 시 메타데이터만 저장 (수동 업로드)
- **뉴스레터**: `npm run newsletter:send` — daily pipeline 마지막 단계에서 자동 실행
- Shorts 트랙은 MimikaStudio 서버(localhost:7693) 기동 여부로 자동 on/off
