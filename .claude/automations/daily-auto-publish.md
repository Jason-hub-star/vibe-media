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
