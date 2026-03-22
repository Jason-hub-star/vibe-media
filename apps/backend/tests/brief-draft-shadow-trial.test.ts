import { describe, expect, it } from "vitest";

import {
  BRIEF_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT,
  renderBriefDraftShadowTrialLog,
  runBriefDraftShadowTrial
} from "../src/shared/brief-draft-shadow-trial";

describe("brief draft shadow trial", () => {
  it("summarizes the fixture-backed brief draft comparison run", () => {
    const report = runBriefDraftShadowTrial();

    expect(report.stage).toBe("brief draft");
    expect(report.sampleCount).toBe(BRIEF_DRAFT_SHADOW_MINIMUM_SAMPLE_COUNT);
    expect(report.remainingSamples).toBe(0);
    expect(report.candidateModel).toBe("claude-sonnet-4-6");
    expect(report.metrics.active.taskSuccessRate).toBeLessThan(report.metrics.candidate.taskSuccessRate);
    expect(report.outcome.result).toBe("promote candidate");
  });

  it("renders a markdown snippet for the trial log", () => {
    const markdown = renderBriefDraftShadowTrialLog(runBriefDraftShadowTrial());

    expect(markdown).toContain("- stage: brief draft");
    expect(markdown).toContain("- candidate model: claude-sonnet-4-6");
    expect(markdown).toContain("- result: promote candidate");
  });
});
