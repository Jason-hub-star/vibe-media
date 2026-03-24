# Daily Editorial Review — Handoff

이 문서는 [HANDOFF-TEMPLATE.md](./HANDOFF-TEMPLATE.md)를 채운 실제 운영판이다.

## 1. Summary

- automation: `daily-editorial-review.md`
- owner: editorial pipeline operator
- purpose: `draft` 브리프를 읽을 만한 레퍼런스 수준으로 가공하고 `review` 큐로 올린다.
- trigger: `daily-pipeline` 이후 하루 1회
- success condition: 대상 브리프가 quality gate를 통과해 `draft -> review`, `review_status -> pending`으로 전환된다.

## 2. Current Reality

- current behavior: `status = 'draft'`이고 `body`가 1단락 이하인 브리프만 자동 가공한다.
- verified inputs: 현재 ingest/editorial sync가 만드는 초안은 대체로 `요약 1줄 + source 1개` 형태다.
- verified outputs: 통과한 브리프는 `title/summary/body/source_links/source_count/cover_image_url`가 갱신되고 `review` 큐로 이동한다.
- hard stop conditions: 원문 접근 실패, source 2개 미만, 본문 3단락 미만, 내부 용어 포함 시 기록 없이 skip 한다.

## 3. Run Order

```text
before this: daily-pipeline
this automation: daily-editorial-review
after this: daily-drift-guard -> daily-auto-publish
```

## 4. Selection Rule

- target rows: `status = 'draft'` and `jsonb_array_length(body) <= 1`
- exclusion rule: 이미 `review/scheduled/published`인 브리프는 건드리지 않는다.
- max items per run: 5

Example query:

```sql
SELECT id, slug, title, summary, body, source_links, cover_image_url
FROM public.brief_posts
WHERE status = 'draft'
  AND jsonb_array_length(body) <= 1
ORDER BY slug ASC
```

## 5. Processing Steps

```text
[draft brief query]
  -> source_links[0] 기준 원문 수집
  -> 관련 기사/문서 보강
  -> og:image 또는 대체 커버 이미지 확보
  -> title/summary/body/source_links 재작성
  -> quality gate 6/6 확인
  -> brief_posts update
  -> admin_reviews upsert
```

## 6. Write Behavior

- tables touched: `public.brief_posts`, `public.admin_reviews`
- fields updated:
  `title`, `summary`, `body`, `source_links`, `source_count`, `cover_image_url`, `status`, `review_status`
- status transitions: `draft -> review`
- side effects: review queue에 새 brief review row가 생긴다.

## 7. Quality / Safety Gates

| Gate | Pass rule | Fail behavior |
|------|-----------|---------------|
| Title length | 15-70자 | skip |
| Summary length | 50-200자 | skip |
| Body paragraphs | 헤딩 제외 3단락 이상 | skip |
| Source count | 2개 이상 | skip |
| Source URLs | 전부 HTTPS | skip |
| Internal terms | `pipeline`, `ingest`, `draft`, `classify`, `orchestrat` 미포함 | skip |

## 8. Failure Semantics

- what gets retried automatically: `draft` 상태로 남아 있는 얕은 브리프는 다음 실행 때 다시 잡힌다.
- what gets recovered automatically: auto-publish quality gate 실패 브리프는 `draft + pending`으로 자동 복귀하고 다음 editorial review 대상이 된다.
- what gets skipped repeatedly: 같은 `draft` 브리프라도 source/body 품질을 못 올리면 다음 실행 때 또 skip 될 수 있다.
- what needs operator attention: 반복 품질 실패나 source provenance 문제가 남는 브리프는 사람이 prompt/source 전략을 보강해야 한다.

## 9. Manual Boundaries

| Step | Auto or manual | Notes |
|------|----------------|-------|
| `draft -> review` | auto | editorial review가 수행 |
| `review -> approved` | manual | 어드민 승인 필요 |
| `approved + review -> scheduled` | auto | auto-publish 워커가 quality check 후 수행 |
| `approved + scheduled -> published` | auto | `scheduled_at <= NOW()`일 때 auto-publish 수행 |
| quality fail 복구 | auto | auto-publish가 `draft + pending`으로 되돌리고 note를 남김 |
| `draft + approved` 무결성 복구 | semi-auto | `publish:repair-state`가 정리, 반복 발생 시 write path 점검 필요 |

## 10. Validation

- runtime check: `daily-editorial-review.md`의 selector와 write rule이 실제 상태 머신과 맞는지 확인
- DB check: `brief_posts.status/review_status/body/source_count/cover_image_url` 변경 확인
- operator check: 어드민 `검토 대기`에서 새 브리프가 보이는지 확인

## 11. Related Files

| File | Role |
|------|------|
| `.claude/automations/daily-editorial-review.md` | 자동화 프롬프트 |
| `.claude/automations/daily-auto-publish.md` | 후속 자동 발행 단계 |
| `apps/backend/src/shared/supabase-auto-publish.ts` | auto-publish 실제 구현 |
| `apps/backend/src/shared/supabase-editorial-sync.ts` | ingest -> editorial write path |
| `apps/backend/src/shared/supabase-editorial-read.ts` | editorial read path |
| `apps/backend/src/features/briefs/send-to-review.ts` | 수동 review 전송 액션 |
| `apps/web/features/admin-briefs/view/BriefDetailContent.tsx` | 어드민 상세 UI |

## 12. Change Log

- 2026-03-25: handoff를 템플릿 기반 형식으로 재작성하고, auto-publish recovery 및 integrity repair 규칙까지 반영했다.
