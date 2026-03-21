import { describe, expect, it } from "vitest";

import { runBriefDiscoverCycle } from "../src/shared/brief-discover-cycle";

describe("brief/discover dry-run cycle", () => {
  it("routes fixtures into publish, review, archive, and discard queues", () => {
    const report = runBriefDiscoverCycle();

    expect(report.inboxItems).toHaveLength(7);
    expect(report.reviewItems).toHaveLength(2);
    expect(report.publishItems).toHaveLength(3);
    expect(report.archiveItems).toHaveLength(1);
    expect(report.discardItems).toHaveLength(1);
    expect(report.exceptionItems).toHaveLength(2);
  });

  it("keeps manual-review and dual-surface items out of direct publish", () => {
    const report = runBriefDiscoverCycle();
    const publishedTitles = report.publishItems.map((item) => item.title);

    expect(publishedTitles).not.toContain("OpenAI Agents SDK update");
    expect(publishedTitles).not.toContain("Andrej Karpathy on code agents and AutoResearch");
    expect(report.reviewItems.map((item) => item.previewTitle)).toContain("OpenAI Agents SDK update");
    expect(report.reviewItems.map((item) => item.previewTitle)).toContain(
      "Andrej Karpathy on code agents and AutoResearch"
    );
  });
});
