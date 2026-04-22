import { describe, expect, it } from "vitest";

import { resolveSupabaseRetentionPolicy } from "../src/shared/supabase-retention";

describe("supabase retention policy", () => {
  it("uses defaults when env is empty", () => {
    const policy = resolveSupabaseRetentionPolicy({ NODE_ENV: "test" });

    expect(policy).toEqual({
      channelPublishResultsDays: 180,
      publishDispatchesDays: 180,
      ingestRunAttemptsDays: 30,
      videoJobAttemptsDays: 45,
      ingestRunsDays: 45,
      toolSubmissionsDays: 120,
      toolCandidateImportsDays: 120,
      ingestedItemCompactDays: 14,
    });
  });

  it("accepts valid overrides and ignores invalid values", () => {
    const policy = resolveSupabaseRetentionPolicy({
      NODE_ENV: "test",
      SUPABASE_RETENTION_CHANNEL_PUBLISH_DAYS: "90",
      SUPABASE_RETENTION_INGEST_RUN_ATTEMPT_DAYS: "-1",
      SUPABASE_RETENTION_VIDEO_JOB_ATTEMPT_DAYS: "abc",
      SUPABASE_RETENTION_INGEST_ITEM_COMPACT_DAYS: "7",
    });

    expect(policy.channelPublishResultsDays).toBe(90);
    expect(policy.ingestRunAttemptsDays).toBe(30);
    expect(policy.videoJobAttemptsDays).toBe(45);
    expect(policy.ingestedItemCompactDays).toBe(7);
  });
});
