import { describe, expect, it } from "vitest";

import {
  resolveReviewStatus,
  resolveReviewTimestamp,
  resolveVideoStatusForReviewDecision
} from "../src/shared/supabase-editorial-actions";

describe("supabase editorial actions", () => {
  it("maps review decisions to workflow statuses", () => {
    expect(resolveReviewStatus("approve")).toBe("approved");
    expect(resolveReviewStatus("changes_requested")).toBe("changes_requested");
    expect(resolveReviewStatus("reject")).toBe("rejected");
  });

  it("only stamps reviewed_at for terminal review decisions", () => {
    const now = "2026-03-22T02:00:00.000Z";

    expect(resolveReviewTimestamp("approve", now)).toBe(now);
    expect(resolveReviewTimestamp("reject", now)).toBe(now);
    expect(resolveReviewTimestamp("changes_requested", now)).toBeNull();
  });

  it("maps video review decisions onto the guarded next status", () => {
    expect(resolveVideoStatusForReviewDecision("approve")).toBe("upload_ready");
    expect(resolveVideoStatusForReviewDecision("changes_requested")).toBe("capcut_pending");
    expect(resolveVideoStatusForReviewDecision("reject")).toBe("blocked");
  });
});
