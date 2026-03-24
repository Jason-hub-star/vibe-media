# VibeHub 일일 자동 발행

## 목적

`review_status = approved`이고 `status IN (review, scheduled)`인 브리프를 quality check 후 자동으로 scheduled → published 전환한다.
quality check 실패 항목은 `draft + pending`으로 되돌려 다음 editorial review에서 다시 가공되게 한다.
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

## 7. 행동 원칙

- dry-run 결과를 먼저 확인하고 실제 실행한다.
- 대상이 없으면 짧게 보고하고 종료한다.
- 전환 발생 시 Telegram으로 자동 보고된다 (워커 내장).
- quality check 실패 항목은 skip 사유와 함께 기록한다.
