---
name: pipeline-check
description: Run the full pipeline (fetch → ingest → sync) and verify data reaches the UI via Playwright tests.
user_invocable: true
---

# Pipeline End-to-End Check

Run the full pipeline and verify data flows to the UI.

## Steps

1. Run live source fetch:
```bash
npm run pipeline:live-fetch
```

2. Run live ingest:
```bash
npm run pipeline:live-ingest
```

3. Verify snapshot file exists and has data:
```bash
ls -la apps/backend/state/live-ingest-snapshot.json
node -e "const s=require('./apps/backend/state/live-ingest-snapshot.json'); console.log('sources:', s.sources?.length, 'runs:', s.runs?.length, 'items:', s.items?.length)"
```

4. Sync to Supabase:
```bash
npm run pipeline:supabase-sync
```

5. Cover image health check (sync 후 이미지 건강성 검증):
```sql
-- Supabase MCP execute_sql (project: hzxsropbcjfywmospobb)
SELECT category, COUNT(*) FILTER (WHERE cover_image_url IS NULL OR cover_image_url = '') as no_img,
       COUNT(*) FILTER (WHERE cover_image_url LIKE '%.svg') as svg_img,
       COUNT(*) as total
FROM discover_items WHERE review_status = 'approved'
GROUP BY category HAVING COUNT(*) FILTER (WHERE cover_image_url IS NULL OR cover_image_url = '') > 0
   OR COUNT(*) FILTER (WHERE cover_image_url LIKE '%.svg') > 0
ORDER BY category;
```
- 이미지 없는 항목이 발견되면 `getGitHubSocialPreview()` 또는 소스 URL og:image 재크롤링 시도
- SVG 이미지는 `isValidCoverImageUrl()`에서 차단되므로 파이프라인 버그 표시

6. Run pipeline-to-UI E2E tests:
```bash
npx playwright test apps/web/tests/e2e/pipeline-to-ui.spec.ts
```

7. Report results: summarize fetch counts, sync status, image health, and test pass/fail.
