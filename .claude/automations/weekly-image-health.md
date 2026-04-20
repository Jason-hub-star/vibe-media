# VibeHub 주간 이미지 건강성 점검

## 목적

`discover_items`와 `brief_posts`의 `cover_image_url`을 HEAD 요청으로 검증하고,
깨진 URL을 자동 교체하거나 리포트한다.

이 프롬프트는 `weekly-source-health.md` 실행 이후 스케줄러에서 실행된다.

---

## 실행 순서

```
weekly-source-health → weekly-image-health (이것)
```

---

## 1. 깨진 이미지 탐지

Supabase MCP로 approved 아이템의 cover_image_url 목록을 조회한다.

```sql
SELECT id, title, category, cover_image_url
FROM discover_items
WHERE review_status = 'approved'
  AND cover_image_url IS NOT NULL
ORDER BY category;
```

각 URL에 대해 `curl -sI --max-time 5` HEAD 요청을 실행한다.
- **200**: 정상
- **301/302**: redirect 따라가서 최종 URL로 교체
- **403/404/5xx/timeout**: 깨진 것으로 분류

## 2. 자동 복구 시도

깨진 URL에 대해 아래 순서로 복구를 시도한다:

1. **GitHub URL** (`github.com/{owner}/{repo}`) → `https://opengraph.githubassets.com/1/{owner}/{repo}`
2. **소스 URL이 있으면** → `fetchOgImageOnly()` 로직과 동일하게 og:image 재크롤링
3. **복구 실패** → cover_image_url을 NULL로 설정 (UI에서 gradient fallback 표시)

```sql
UPDATE discover_items SET cover_image_url = '{new_url}' WHERE id = '{id}';
```

## 🔖 운영자 승인 대기 항목

(아래 항목은 자동 실행되지 않았습니다. 운영자가 확인 후 결정합니다.)

[PENDING-이미지교체]
- 복구 실패 항목: GitHub OG 생성 또는 Pexels 대체 이미지 수동 선택
→ 승인 시: "대체 이미지 URL 제공" 또는 "NULL 유지 (gradient fallback)"

[PENDING-원본확인]
- 자동 복구된 이미지: 실제 표시 확인 후 승인
→ 승인 시: "프론트에서 시각 확인 후 승인" 또는 "다시 NULL 처리"

---

## 3. 리포트

| 항목 | 값 |
|------|-----|
| 검사한 아이템 수 | N |
| 정상 | N |
| 깨진 것 발견 | N |
| 자동 복구 성공 | N |
| 복구 실패 (NULL 처리) | N |

카테고리별로 이미지 없는 항목이 있으면 경고한다.

## 4. 품질 기준

- SVG, favicon, 작은 아이콘은 `isValidCoverImageUrl()`에서 이미 차단됨
- `twitter:image` fallback은 `fetchOgImageOnly()`에서 지원
- GitHub 도메인은 `getGitHubSocialPreview()`로 자동 생성
- 최종 fallback은 UI의 `onError` gradient
