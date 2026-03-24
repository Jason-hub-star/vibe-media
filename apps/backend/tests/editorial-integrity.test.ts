import { describe, expect, it } from "vitest";

import {
  buildAutoPublishRecoveryNote,
  deriveBriefIntegrityRepair,
  findBriefIntegrityIssues
} from "../src/shared/editorial-integrity";

describe("editorial integrity", () => {
  it("repairs draft approved rows back to pending", () => {
    const repair = deriveBriefIntegrityRepair({
      id: "brief-1",
      slug: "brief-1",
      status: "draft",
      reviewStatus: "approved",
      scheduledAt: null,
      publishedAt: null
    });

    expect(repair).toEqual({
      reviewStatus: "pending"
    });
  });

  it("flags published timestamps on non-published rows as unsafe when needed", () => {
    const issues = findBriefIntegrityIssues({
      id: "brief-2",
      slug: "brief-2",
      status: "review",
      reviewStatus: "pending",
      scheduledAt: null,
      publishedAt: "2026-03-25T00:00:00.000Z"
    });

    expect(issues).toEqual([
      expect.objectContaining({
        code: "review-has-published-at",
        repairable: false
      })
    ]);
  });

  it("builds a readable recovery note", () => {
    expect(buildAutoPublishRecoveryNote(["source count 1", "body paragraphs 1"])).toContain(
      "source count 1"
    );
  });
});
