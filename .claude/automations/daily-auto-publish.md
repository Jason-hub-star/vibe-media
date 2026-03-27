# VibeHub 일일 자동 발행

## 목적

**Brief**: `review_status = approved`이고 `status IN (review, scheduled)`인 브리프를 quality check 후 자동으로 scheduled → published 전환한다.
quality check 실패 항목은 `draft + pending`으로 되돌려 다음 editorial review에서 다시 가공되게 한다.

**Discover**: `review_status = pending`이고 `published_at IS NULL`인 discover 항목을 경량 quality check 후 자동으로 approved + published 전환한다.
`/radar` 공개 페이지는 `isPublished` 게이트(`approved + published_at IS NOT NULL`)를 적용하므로, 이 단계를 거쳐야 레이더에 노출된다.

이 프롬프트는 `daily-drift-guard.md` 실행 이후 스케줄러에서 자동 실행된다.

---

## 실행 순서

```
daily-pipeline → daily-editorial-review → daily-drift-guard → daily-auto-publish (이것)
  └→ publish:channels (published 브리프 → 외부 채널 배포, §9)
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
| Body paragraphs | ≥3 (헤딩 제외) |
| Source count | ≥2 |
| Source URLs | 전부 https:// |
| Internal terms | pipeline, ingest, classify, orchestrat 없음 |

**6/6 통과해야만 전환.** 하나라도 실패하면 skip으로 기록하고 `draft + pending`으로 되돌린다.

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
| Title | 5자 이상 | skip |
| Summary | 20자 이상 | skip |
| Actions | `discover_actions`에 1개 이상 존재 | skip |
| Action URLs | 모든 action href가 `https://`로 시작 | skip |

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

- Brief처럼 body 가공이나 editorial rewrite는 하지 않는다 — 파이프라인이 만든 그대로 발행한다.
- 품질 검증 실패 항목은 skip만 하고 상태를 바꾸지 않는다 (다음 실행에서 재시도).
- Brief와 Discover 보고를 하나의 Telegram 메시지로 합쳐 보낸다.

---

## 9. 외부 채널 발행 (Channel Publish)

Auto Publish에서 새로 `published` 전환된 brief를 외부 채널(Threads, YouTube 등)에 자동 배포한다.

### 9-1. 대상 선정

Auto Publish(§3)에서 `published`로 전환된 brief slug 목록을 수집한다.
전환된 brief가 0건이면 이 단계를 skip한다.

### 9-2. 채널 발행 실행

각 published brief에 대해:

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a
npm run publish:channels <brief-slug>
```

- `PUBLISH_CHANNELS` 환경변수로 활성 채널 제어 (기본: `threads,youtube`)
- 각 brief별로 독립 실행 — 한 brief 실패가 다른 brief에 영향 없음
- 결과는 자동으로 DB(`channel_publish_results`)에 저장 + Telegram 보고
- YouTube는 이 단계에서 `업로드 준비`까지만 완료된다. public YouTube URL 연결과 Pass 3은 업로드 후 별도 완료 신호가 필요하다.

### 9-3. 안전장치

- `published` 상태 brief만 대상 — draft/review/scheduled는 절대 건드리지 않음
- 동일 brief 중복 발행 방지: `channel_publish_results` 테이블에 이전 성공 기록이 있으면 skip
- Threads API 250건/일 제한 — 일일 brief 10건 이하이므로 안전
- 채널별 실패 격리: `Promise.allSettled`로 한 채널 실패가 다른 채널에 영향 없음

### 9-4. 행동 원칙 (Channel Publish)

- Auto Publish에서 전환된 brief만 대상으로 한다 — 과거 published brief는 건드리지 않는다.
- 발행 결과는 DB + Telegram 모두에 기록한다.
- 실패한 채널은 다음 수동 실행 시 재시도 가능하다 (`npm run publish:channels <slug>`).
- dry-run 모드(`--dry-run`)로 사전 검증이 가능하다.
- YouTube 연결 완료는 `/vh-youtube <slug> <youtube-url>` 또는 `npm run publish:link-youtube <slug> <video-id-or-url>`를 별도 실행해야 한다.

---

## 10. 다국어 번역 (i18n Translation)

채널 발행(§9)에서 새로 published된 brief를 스페인어로 자동 번역한다.
번역 variant가 생성되어야 다음 `publish:channels` 실행 시 locale별 발행이 이뤄진다.

### 10-1. 대상 선정

§9에서 `published`로 전환 + 채널 발행된 brief slug 목록을 사용한다.
대상이 0건이면 skip.

### 10-2. 번역 실행

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

### 10-3. Discover 번역 (선택)

Brief 번역 완료 후, 최근 published discover 항목도 번역할 수 있다:

```bash
npm run translate:variant <discover-slug> --locale=es --discover
```

Discover는 title + summary만 번역하므로 빠르다 (brief 대비 ~1/3).

### 10-4. 안전장치

- 번역 실패해도 영어 발행은 절대 영향 없음 (variant 테이블 분리)
- Gemini API 429 시 1회 자동 재시도 (2초 대기)
- `--dry-run`으로 사전 검증 가능
- 잘못된 locale(`kr` 등) 전달 시 즉시 거부
- canonical locale(`en`) 번역 시도 시 즉시 거부

### 10-5. 행동 원칙 (Translation)

- 번역은 published brief만 대상 — draft/review 상태는 건드리지 않는다
- 품질 실패 variant는 admin `/admin/translations`에서 수동 확인 가능
- 번역된 variant는 다음 `publish:channels` 실행 시 자동으로 es 발행에 포함된다
- `daily-media-publish`의 SRT 번역(§3)과는 독립 — 텍스트 번역과 영상 자막은 별개 파이프라인

### 10-6. 결과 보고

Telegram 보고는 별도로 하지 않는다 (번역 워커 자체는 console 출력만).
품질 실패 건이 있으면 `/admin/translations`에서 확인.

---

## 11. 미디어 발행 연결

채널 발행(§9) + 번역(§10) 완료 후, `daily-media-publish.md`가 이어서 실행된다.
미디어 파이프라인(NotebookLM → 자막 → 아바타 → 합성 → YouTube 가이드)은 별도 프롬프트로 분리되어 있다.

```
daily-auto-publish (§9 채널 발행 → §10 번역)
  └→ daily-media-publish (NotebookLM → 자막 → 아바타 → 합성)
```
