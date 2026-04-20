# VibeHub 일일 중복 감지 가드

## 목적
draft/review 상태 brief가 기존 published brief와 의미적으로 중복되는지 감지한다.
`daily-editorial-review.md` 이전 또는 이후에 실행한다.

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

## 2. 중복 후보 조회

### 2-1. 신규 brief 조회

```sql
SELECT id, slug, title, summary
FROM public.brief_posts
WHERE status IN ('draft', 'review')
  AND review_status IN ('pending', NULL)
ORDER BY slug ASC
```

### 2-2. 기존 brief 조회 (비교 대상)

```sql
SELECT id, slug, title, summary
FROM public.brief_posts
WHERE review_status = 'approved'
  OR published_at IS NOT NULL
ORDER BY published_at DESC NULLS LAST
LIMIT 50
```

---

## 3. 중복 감지

### 3-1. 제목 유사도 (빠른 필터)

신규 brief의 title과 기존 brief의 title을 비교한다.

**방법**: 단어 집합 Jaccard 유사도
```
jaccard(A, B) = |A ∩ B| / |A ∪ B|
```

- Jaccard ≥ 0.6 → 중복 후보로 마킹
- Jaccard ≥ 0.8 → 높은 중복 경고

### 3-2. 요약 유사도 (정밀 검증)

제목 유사도 0.6 이상인 쌍에 대해 summary도 비교한다.

**방법**: 동일하게 Jaccard 유사도
- 제목 Jaccard ≥ 0.6 AND 요약 Jaccard ≥ 0.5 → **중복 확정**

### 3-3. 동일 소스 간격 체크

```sql
SELECT a.id, a.title, a.source_links, b.id as dup_id, b.title as dup_title
FROM public.brief_posts a, public.brief_posts b
WHERE a.status IN ('draft', 'review')
  AND (b.review_status = 'approved' OR b.published_at IS NOT NULL)
  AND a.source_links::text = b.source_links::text
  AND a.id != b.id
```

동일 source_links를 가진 brief가 이미 있으면 → **중복 확정**

---

## 4. 중복 처리

중복 확정된 brief에 대해:

```sql
UPDATE public.brief_posts
SET last_editor_note = '[DUPLICATE] 기존 brief ' || $dup_slug || '과 중복 감지'
WHERE id = $id
  AND status = 'draft'
```

**draft → discard 전환은 하지 않는다.** 태그만 달고 운영자가 판단.

---

## 5. 결과 보고

```
## Daily Dedup Guard

- 검사 대상: N건
- 중복 감지: M건
- 동일 소스 중복: K건

### 중복 목록
| 신규 slug | 기존 slug | 유사도 | 유형 |
|----------|----------|--------|------|
| ... | ... | 0.82 | 제목+요약 |
| ... | ... | 1.00 | 동일 소스 |
```

---

## 🔖 운영자 승인 대기 항목

(아래 항목은 자동 실행되지 않았습니다. 운영자가 확인 후 결정합니다.)

[PENDING-중복처리]
- 감지된 중복 항목: draft → discard 전환 또는 editorial 재가공 후 유지 결정
→ 승인 시: "discard" 또는 "editorial-rewrite"

[PENDING-유사도임계치]
  (없음)

---

## 6. 행동 원칙

- 자동 삭제/discard하지 않는다. 태그만 달고 운영자가 판단.
- Jaccard 유사도는 임베딩 없이 순수 단어 집합 비교로 구현 (외부 API 호출 없음).
- 향후 Gemini embedding 기반 의미적 유사도로 업그레이드 가능하나, v1은 단어 기반으로 시작.
- 동일 source_links는 무조건 중복 — 같은 기사를 두 번 brief로 만들 필요 없음.
