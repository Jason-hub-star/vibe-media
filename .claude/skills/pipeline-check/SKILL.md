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

5. Run pipeline-to-UI E2E tests:
```bash
npx playwright test apps/web/tests/e2e/pipeline-to-ui.spec.ts
```

6. Report results: summarize fetch counts, sync status, and test pass/fail.
