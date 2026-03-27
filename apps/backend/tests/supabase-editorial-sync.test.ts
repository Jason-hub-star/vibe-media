import { describe, expect, it } from "vitest";
import { isPublished } from "@vibehub/content-contracts";

import type { LiveIngestSnapshot } from "../src/shared/live-ingest-snapshot";
import {
  buildEditorialRows,
  hasLockedEditorialLifecycle,
  preserveAdminReviewResolution,
  preserveBriefLifecycle,
  preserveDiscoverLifecycle
} from "../src/shared/supabase-editorial-sync";

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

  it("normalizes discover copy for GitHub release rows", () => {
    const snapshot: LiveIngestSnapshot = {
      generatedAt: "2026-03-22T00:00:00.000Z",
      tables: {
        sources: [
          {
            id: "source-1",
            name: "GitHub Releases",
            kind: "github-releases",
            base_url: "https://github.com/openai/openai-node/releases",
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
            title: "v6.33.0",
            url: "https://github.com/openai/openai-node/releases/tag/v6.33.0",
            content_type: "repo",
            raw_content: {},
            parsed_content: {
              summary:
                "## 6.33.0 (2026-03-25)\nFull Changelog: [v6.32.0...v6.33.0](https://github.com/openai/openai-node/compare/v6.32.0...v6.33.0)\n### Features\n* **api:** add keys field to computer actions",
              tags: ["repo", "release", "api"]
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
            category: "api",
            importance_score: 94,
            novelty_score: 80,
            target_surface: "discover",
            reason: "release worth tracking",
            duplicate_of: null,
            confidence: 0.91,
            policy_flags: [],
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

    expect(editorial.discoverItems[0]?.title).toBe("OpenAI Node v6.33.0");
    expect(editorial.discoverItems[0]?.summary).toContain("API: add keys field to computer actions.");
    expect(editorial.discoverItems[0]?.tags).toEqual(["Repo", "Release", "API"]);
  });

  it("preserves manual brief lifecycle once an operator has touched it", () => {
    const merged = preserveBriefLifecycle(
      {
        id: "brief-1",
        source_item_id: "source-item-1",
        slug: "fresh-brief",
        title: "Fresh title",
        summary: "Fresh summary",
        body: ["Fresh body"],
        status: "draft",
        review_status: "pending",
        scheduled_at: null,
        published_at: null,
        last_editor_note: "auto note",
        source_links: [{ label: "OpenAI News", href: "https://example.com" }],
        source_count: 1,
        cover_image_url: null
      },
      {
        source_item_id: "source-item-1",
        status: "scheduled",
        review_status: "approved",
        scheduled_at: "2026-03-23T09:00:00.000Z",
        published_at: null,
        last_editor_note: "keep operator note"
      }
    );

    expect(merged.status).toBe("scheduled");
    expect(merged.review_status).toBe("approved");
    expect(merged.scheduled_at).toBe("2026-03-23T09:00:00.000Z");
    expect(merged.last_editor_note).toBe("keep operator note");
  });

  it("preserves manual discover lifecycle once it has moved beyond pending", () => {
    const merged = preserveDiscoverLifecycle(
      {
        id: "discover-1",
        source_item_id: "source-item-1",
        slug: "fresh-discover",
        title: "Fresh title",
        category: "sdk",
        summary: "Fresh summary",
        status: "featured",
        review_status: "pending",
        scheduled_at: null,
        published_at: null,
        tags: ["sdk"],
        highlighted: true
      },
      {
        source_item_id: "source-item-1",
        status: "tracked",
        review_status: "changes_requested",
        scheduled_at: null,
        published_at: null
      }
    );

    expect(merged.status).toBe("tracked");
    expect(merged.review_status).toBe("changes_requested");
  });

  it("keeps resolved admin review rows closed", () => {
    const merged = preserveAdminReviewResolution(
      {
        id: "review-1",
        target_type: "brief",
        target_id: "brief-1",
        review_status: "pending",
        notes: "auto wants review",
        reviewed_at: null
      },
      {
        id: "review-1",
        review_status: "approved",
        notes: "operator approved",
        reviewed_at: "2026-03-23T10:00:00.000Z"
      }
    );

    expect(merged.review_status).toBe("approved");
    expect(merged.notes).toBe("operator approved");
    expect(merged.reviewed_at).toBe("2026-03-23T10:00:00.000Z");
  });

  it("treats scheduled or published rows as locked lifecycle state", () => {
    expect(
      hasLockedEditorialLifecycle({
        reviewStatus: "pending",
        scheduledAt: "2026-03-23T09:00:00.000Z",
        publishedAt: null
      })
    ).toBe(true);
    expect(
      hasLockedEditorialLifecycle({
        reviewStatus: "pending",
        scheduledAt: null,
        publishedAt: null
      })
    ).toBe(false);
  });

  it("isPublished guard returns true only for approved + published items", () => {
    expect(isPublished({ reviewStatus: "approved", publishedAt: "2026-03-23T09:00:00.000Z" })).toBe(true);
    expect(isPublished({ reviewStatus: "approved", publishedAt: null })).toBe(false);
    expect(isPublished({ reviewStatus: "pending", publishedAt: "2026-03-23T09:00:00.000Z" })).toBe(false);
    expect(isPublished({ reviewStatus: "pending", publishedAt: null })).toBe(false);
    expect(isPublished({ reviewStatus: "changes_requested", publishedAt: "2026-03-23T09:00:00.000Z" })).toBe(false);
    expect(isPublished({ reviewStatus: "rejected", publishedAt: "2026-03-23T09:00:00.000Z" })).toBe(false);
  });
});
