import { describe, expect, it } from "vitest";

import type { LiveIngestSnapshot } from "../src/shared/live-ingest-snapshot";
import { buildEditorialRows } from "../src/shared/supabase-editorial-sync";

describe("supabase editorial sync", () => {
  it("builds brief and discover drafts from classified ingest rows", () => {
    const snapshot: LiveIngestSnapshot = {
      generatedAt: "2026-03-22T00:00:00.000Z",
      tables: {
        sources: [
          {
            id: "source-1",
            name: "OpenAI News",
            kind: "rss",
            base_url: "https://openai.com/news/",
            source_tier: "auto-safe",
            enabled: true,
            last_success_at: "2026-03-22T00:00:00.000Z",
            last_failure_at: null,
            failure_reason: null,
            created_at: "2026-03-22T00:00:00.000Z"
          }
        ],
        ingest_runs: [],
        ingested_items: [
          {
            id: "item-1",
            source_id: "source-1",
            run_id: null,
            title: "OpenAI Agents SDK update",
            url: "https://github.com/openai/openai-node/releases/tag/v1",
            content_type: "repo",
            raw_content: {},
            parsed_content: {
              summary: "Useful SDK release summary",
              tags: ["sdk", "release"]
            },
            dedupe_key: "dedupe-1",
            ingest_status: "parsed",
            created_at: "2026-03-22T00:00:00.000Z"
          }
        ],
        item_classifications: [
          {
            id: "classification-1",
            item_id: "item-1",
            category: "sdk",
            importance_score: 94,
            novelty_score: 80,
            target_surface: "both",
            reason: "useful for both brief and discover",
            duplicate_of: null,
            confidence: 0.91,
            policy_flags: [],
            exception_reason: "dual-surface routing needs operator confirmation",
            created_at: "2026-03-22T00:00:00.000Z"
          }
        ]
      },
      projections: {
        sourceEntries: [],
        ingestRuns: [],
        inboxItems: [],
        reviewItems: [],
        publishQueueItems: [],
        exceptionQueueItems: []
      }
    };

    const editorial = buildEditorialRows(snapshot);

    expect(editorial.briefPosts).toHaveLength(1);
    expect(editorial.briefPosts[0]?.status).toBe("review");
    expect(editorial.briefPosts[0]?.review_status).toBe("pending");
    expect(editorial.briefPosts[0]?.source_count).toBe(1);
    expect(editorial.discoverItems).toHaveLength(1);
    expect(editorial.discoverItems[0]?.status).toBe("featured");
    expect(editorial.discoverItems[0]?.review_status).toBe("pending");
    expect(editorial.discoverActions.map((item) => item.action_kind)).toEqual(["github", "brief"]);
    expect(editorial.adminReviews).toHaveLength(2);
  });

  it("skips duplicate items from editorial surface rows", () => {
    const snapshot: LiveIngestSnapshot = {
      generatedAt: "2026-03-22T00:00:00.000Z",
      tables: {
        sources: [
          {
            id: "source-1",
            name: "OpenAI News",
            kind: "rss",
            base_url: "https://openai.com/news/",
            source_tier: "auto-safe",
            enabled: true,
            last_success_at: "2026-03-22T00:00:00.000Z",
            last_failure_at: null,
            failure_reason: null,
            created_at: "2026-03-22T00:00:00.000Z"
          }
        ],
        ingest_runs: [],
        ingested_items: [
          {
            id: "item-1",
            source_id: "source-1",
            run_id: null,
            title: "Primary item",
            url: "https://example.com/primary",
            content_type: "article",
            raw_content: {},
            parsed_content: { summary: "Primary summary", tags: [] },
            dedupe_key: "dedupe-1",
            ingest_status: "parsed",
            created_at: "2026-03-22T00:00:00.000Z"
          }
        ],
        item_classifications: [
          {
            id: "classification-1",
            item_id: "item-1",
            category: "news",
            importance_score: 90,
            novelty_score: 70,
            target_surface: "brief",
            reason: "duplicate row should be skipped",
            duplicate_of: "canonical-item",
            confidence: 0.93,
            policy_flags: ["duplicate"],
            exception_reason: null,
            created_at: "2026-03-22T00:00:00.000Z"
          }
        ]
      },
      projections: {
        sourceEntries: [],
        ingestRuns: [],
        inboxItems: [],
        reviewItems: [],
        publishQueueItems: [],
        exceptionQueueItems: []
      }
    };

    const editorial = buildEditorialRows(snapshot);

    expect(editorial.briefPosts).toHaveLength(0);
    expect(editorial.discoverItems).toHaveLength(0);
    expect(editorial.adminReviews).toHaveLength(0);
  });
});
