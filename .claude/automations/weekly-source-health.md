# VibeHub 주간 소스 건강성 점검 + 자동 발견

## 목적
소스의 건강성을 점검하고, 성과 기반으로 maxItems를 조정하며, 새 소스를 발견한다.
주 1회 실행한다.

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

## 2. 소스 건강성 점검

### 2-1. 실패 소스 자동 비활성화

최근 7일간 `last_failure_at`이 3회 이상 갱신된 소스를 비활성화한다:

```sql
-- 최근 7일간 실패가 기록된 활성 소스 조회
SELECT id, name, feed_url, failure_reason, last_failure_at
FROM public.sources
WHERE enabled = true
  AND last_failure_at > now() - interval '7 days'
ORDER BY last_failure_at DESC
```

해당 소스가 있으면:
```sql
UPDATE public.sources
SET enabled = false, failure_reason = '주간 점검: 반복 실패로 자동 비활성화'
WHERE id = $id
```

### 2-2. 비활성 소스 재검증 (월 1회, 매월 첫째 주만)

```sql
SELECT id, name, feed_url, failure_reason
FROM public.sources
WHERE enabled = false
  AND failure_reason LIKE '%404%' OR failure_reason LIKE '%403%'
```

각 소스의 `feed_url`에 HTTP HEAD 요청:
- 200 OK → `enabled = true`, `failure_reason = null` (복구)
- 여전히 실패 → 건너뜀

### 2-3. 30일 무실적 소스 경고

```sql
SELECT id, name, last_success_at
FROM public.sources
WHERE enabled = true
  AND (last_success_at IS NULL OR last_success_at < now() - interval '30 days')
```

해당 소스가 있으면 보고에 경고로 포함. 즉시 비활성화하지 않고 운영자 판단 대기.

---

## 3. 소스→brief 품질 상관분석

### 3-1. 소스별 brief 품질 집계

published brief의 source_links에서 도메인을 추출하고, 소스별 평균 quality score를 산출한다.

```sql
SELECT
  s.name as source_name,
  count(bp.id) as brief_count,
  s.max_items
FROM public.sources s
LEFT JOIN public.brief_posts bp ON bp.source_links::text LIKE '%' || s.base_url || '%'
  AND bp.review_status = 'approved'
WHERE s.enabled = true
GROUP BY s.name, s.max_items
ORDER BY brief_count DESC
```

### 3-2. maxItems 자동 조정 제안

| 조건 | 제안 |
|------|------|
| 해당 소스에서 나온 brief가 월 10건 이상 + 가공 성공률 80% 이상 | maxItems 3→5 |
| 해당 소스에서 나온 brief가 월 1건 이하 | maxItems 3→1 |
| 해당 소스에서 나온 brief가 월 0건 + 30일 무실적 | 비활성화 후보 |

**자동 실행하지 않는다.** 제안만 보고하고 운영자가 확인 후 적용.

---

## 4. render-required 소스 수동 점검

RSS 피드가 없어 자동 수집이 불가한 소스를 브라우저로 직접 확인하고, 주목할 새 항목이 있으면 후보로 보고한다.

### 점검 대상

| 소스 | URL | 확인 항목 |
|------|-----|----------|
| DESIGN.md | https://designmd.ai/ | "Just Added" 섹션의 신규 디자인 시스템 목록 |

### 점검 방법

1. `mcp__Claude_in_Chrome` 브라우저로 URL 접근
2. "Just Added" 또는 "Trending" 섹션에서 최근 추가된 항목 목록 추출
3. 항목명 / 설명 / 태그(category) 수집
4. 기존 brief/discover와 중복되지 않는 항목이 있으면 후보로 보고:
   ```
   후보 발견 (render-required): {항목명} — {URL} — {카테고리 태그}
   ```
5. **자동 등록하지 않는다.** 후보 보고만 하고 운영자가 결정.

---

## 5. 신규 소스 자동 발견

### 4-1. brief source_links 역추적

최근 7일 published brief의 source_links에서 기존 소스에 없는 새 도메인을 추출한다:

```sql
SELECT DISTINCT
  jsonb_array_elements(source_links)->>'href' as href
FROM public.brief_posts
WHERE published_at > now() - interval '7 days'
```

각 href에서 도메인 추출 → 기존 `sources.base_url`과 대조 → 새 도메인이 있으면 후보로 보고.

### 4-2. 후보 검증

새 도메인 발견 시:
1. `{도메인}/rss`, `{도메인}/feed`, `{도메인}/rss.xml`, `{도메인}/feed.xml` 순서로 RSS 탐색
2. HTTP HEAD로 접근 가능한 feed_url 확인
3. RSS 파싱해서 최소 1개 아이템 추출 가능한지 확인

검증 통과하면 **후보로만 보고** (자동 등록하지 않음):
```
후보 발견: {사이트명} — {feed_url} — {최근 아이템 제목}
```

---

## 6. 결과 보고

```
## Weekly Source Health Report

### 건강성
- 활성 소스: N개
- 이번 주 비활성화: M개 (사유: ...)
- 30일 무실적 경고: K개

### 품질 상관
| 소스 | brief 수 (월) | maxItems | 제안 |
|------|-------------|----------|------|
| ... | ... | ... | 유지/증가/감소 |

### 신규 후보
| 도메인 | feed_url | 최근 아이템 |
|--------|----------|-----------|
| ... | ... | ... |
```

보고서 말미에는 반드시 아래 **구조화된 승인 대기 항목** 블록을 포함한다.
이 블록이 있어야 운영자가 "등록해줘" / "적용해줘"라고 말했을 때 LLM이 무엇을 실행해야 하는지 파악할 수 있다.

```
━━━ 🔖 운영자 승인 대기 항목 ━━━
(아래 항목은 자동 실행되지 않았습니다. 운영자가 확인 후 결정합니다.)

[PENDING-maxItems]
  - 인공지능신문: max_items 3 → 5  (월 23건 실적)
  - AI Times Korea: max_items 3 → 5  (월 22건 실적)
→ 승인 시: "maxItems 적용해줘" 또는 "등록해줘"

[PENDING-discover]
  - Flip7 Card Game — https://... — game/UI  (⭐44)
  - Red Broadcast — https://... — broadcast  (⭐39)
  - Octo Code — https://... — devtools  (⭐24)
  - LongCipher Design — https://... — typography  (⭐16)
→ 승인 시: "discover 등록해줘" 또는 항목명 언급

[PENDING-sources]  ← 이번 주 해당 없음
  (없음)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 7. Telegram 보고

```bash
ROOT_DIR="$(git rev-parse --show-toplevel)"
cd "$ROOT_DIR"
set -a && source .env.local 2>/dev/null || source .env 2>/dev/null || true && set +a

if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_REPORT_CHAT_ID" ]; then
  curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_REPORT_CHAT_ID}" \
    --data-urlencode "text=${TEXT}" \
    > /dev/null
fi
```

---

## 8. 행동 원칙

- 자동 비활성화는 실패 소스만. 성과 기반 조정은 제안만 하고 운영자가 결정.
- 신규 소스는 자동 등록하지 않는다. 후보로만 보고.
- 월 1회 비활성 소스 재검증은 매월 첫째 주에만 실행.
- DB 쓰기는 최소한으로. 읽기 중심.
