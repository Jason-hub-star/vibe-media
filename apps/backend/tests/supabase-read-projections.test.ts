import { describe, expect, it } from "vitest";

import { buildProjectionBundleFromSupabaseRows } from "../src/shared/supabase-read-projections";

describe("supabase read projections", () => {
  it("derives inbox and queue projections from remote ingest rows", () => {
    const bundle = buildProjectionBundleFromSupabaseRows(
      [
        {
          id: "source-1",
          name: "OpenAI News",
          kind: "rss",
          base_url: "https://openai.com/news/",
          source_tier: "auto-safe"
        }
      ],
      [
        {
          id: "run-1",
          source_name: "OpenAI News",
          run_status: "classified",
          started_at: "2026-03-22T00:00:00.000Z",
          finished_at: "2026-03-22T00:01:00.000Z",
          item_count: 1,
          error_message: null
        }
      ],
      [
        {
          id: "item-1",
          source_name: "OpenAI News",
          source_tier: "auto-safe",
          title: "GPT release",
          content_type: "article",
          parsed_content: {
            summary: "A concise launch summary."
          },
          ingest_status: "parsed",
          target_surface: "brief",
          confidence: "0.91",
          created_at: "2026-03-22T00:00:00.000Z"
        }
      ],
      [
        {
          id: "review-1",
          target_type: "brief",
          target_id: "brief-1",
          review_status: "pending",
          notes: "operator review required",
          source_item_id: "item-1",
          source_name: "OpenAI News",
          source_href: "https://openai.com/news/",
          source_item_href: "https://openai.com/index/gpt-release",
          preview_title: "GPT release",
          preview_summary: "A concise launch summary.",
          parsed_summary: "A concise launch summary.",
          key_points: ["launch", "release"],
          target_surface: "brief",
          confidence: "0.91"
        }
      ],
      [
        {
          id: "brief-1",
          title: "GPT release",
          source_label: "OpenAI News",
          target_type: "brief",
          review_status: "approved",
          scheduled_at: null,
          published_at: null
        }
      ],
      [],
      [
        {
          id: "exception-run-1",
          title: "OpenAI News",
          source_label: "OpenAI News",
          target_type: "discover",
          current_stage: "failed",
          reason: "fetch failed",
          confidence: "0.66",
          retryable: true,
          next_action: "Retry the source fetch or parse step and confirm the latest error diff."
        }
      ]
    );

    expect(bundle.sourceEntries).toHaveLength(1);
    expect(bundle.ingestRuns[0]?.itemCount).toBe(1);
    expect(bundle.inboxItems[0]?.targetSurface).toBe("brief");
    expect(bundle.publishQueueItems[0]?.queueStatus).toBe("approved");
    expect(bundle.reviewItems).toHaveLength(1);
    expect(bundle.exceptionQueueItems).toHaveLength(1);
    expect(bundle.exceptionQueueItems[0]?.retryable).toBe(true);
  });

  it("maps policy-hold, video publish, and blocked video exception rows", () => {
    const bundle = buildProjectionBundleFromSupabaseRows(
      [],
      [],
      [
        {
          id: "item-2",
          source_name: "OpenAI News",
          source_tier: "auto-safe",
          title: "Needs operator review",
          content_type: "article",
          parsed_content: {
            summary: "A summary that still needs human confirmation."
          },
          ingest_status: "parsed",
          target_surface: "both",
          confidence: "0.72",
          created_at: "2026-03-22T00:00:00.000Z"
        }
      ],
      [
        {
          id: "review-2",
          target_type: "discover",
          target_id: "discover-1",
          review_status: "changes_requested",
          notes: "needs better outbound link validation",
          source_item_id: "item-2",
          source_name: "OpenAI News",
          source_href: "https://openai.com/news/",
          source_item_href: "https://openai.com/index/review-item",
          preview_title: "Needs operator review",
          preview_summary: "A summary that still needs human confirmation.",
          parsed_summary: "A summary that still needs human confirmation.",
          key_points: ["analysis"],
          target_surface: "discover",
          confidence: "0.72"
        }
      ],
      [
        {
          id: "discover-1",
          title: "Needs operator review",
          source_label: "OpenAI News",
          target_type: "discover",
          review_status: "pending",
          scheduled_at: null,
          published_at: null
        }
      ],
      [
        {
          id: "video-1",
          title: "Minecraft recap",
          source_session: "minecraft-session-0322",
          status: "upload_ready",
          next_action: "Move the approved edit into private upload."
        }
      ],
      [
        {
          id: "exception-video-1",
          title: "Minecraft recap",
          source_label: "minecraft-session-0322",
          target_type: "video",
          current_stage: "blocked",
          reason: "privacy-sensitive segment detected",
          confidence: 1,
          retryable: false,
          next_action: "Mute the flagged segment before retry."
        }
      ]
    );

    expect(bundle.reviewItems).toHaveLength(1);
    expect(bundle.reviewItems[0]?.reviewStatus).toBe("changes_requested");
    expect(bundle.exceptionQueueItems).toHaveLength(1);
    expect(bundle.publishQueueItems).toHaveLength(2);
    expect(bundle.publishQueueItems[0]?.queueStatus).toBe("policy_hold");
    expect(bundle.publishQueueItems[1]?.queueStatus).toBe("upload_ready");
  });
});
