import { describe, expect, it } from "vitest";

import {
  DISCOVER_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT,
  renderDiscoverDraftShadowTrialLog,
  runDiscoverDraftShadowTrial
} from "../src/shared/discover-draft-shadow-trial";

describe("discover draft shadow trial", () => {
  it("summarizes the fixture-backed discover draft comparison run", () => {
    const report = runDiscoverDraftShadowTrial();

    expect(report.stage).toBe("discover draft");
    expect(report.sampleCount).toBe(DISCOVER_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT);
    expect(report.remainingSamples).toBe(0);
    expect(report.candidateModel).toBe("claude-sonnet-4-6");
    expect(report.metrics.active.taskSuccessRate).toBeLessThan(report.metrics.candidate.taskSuccessRate);
    expect(report.outcome.result).toBe("promote candidate");
  });

  it("renders a markdown snippet for the trial log", () => {
    const markdown = renderDiscoverDraftShadowTrialLog(runDiscoverDraftShadowTrial());

    expect(markdown).toContain("- stage: discover draft");
    expect(markdown).toContain("- candidate model: claude-sonnet-4-6");
    expect(markdown).toContain("- result: promote candidate");
  });
});
