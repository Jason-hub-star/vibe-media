import { describe, expect, it } from "vitest";

import {
  CRITIC_SHADOW_MINIMUM_SAMPLE_COUNT,
  renderCriticShadowTrialLog,
  runCriticShadowTrial
} from "../src/shared/critic-shadow-trial";

describe("critic shadow trial", () => {
  it("summarizes the fixture-backed critic comparison run", () => {
    const report = runCriticShadowTrial();

    expect(report.stage).toBe("critic");
    expect(report.sampleCount).toBe(CRITIC_SHADOW_MINIMUM_SAMPLE_COUNT);
    expect(report.remainingSamples).toBe(0);
    expect(report.candidateModel).toBe("claude-sonnet-4-6");
    expect(report.metrics.active.taskSuccessRate).toBeLessThan(report.metrics.candidate.taskSuccessRate);
    expect(report.outcome.result).toBe("promote candidate");
  });

  it("renders a markdown snippet for the trial log", () => {
    const markdown = renderCriticShadowTrialLog(runCriticShadowTrial());

    expect(markdown).toContain("- stage: critic");
    expect(markdown).toContain("- candidate model: claude-sonnet-4-6");
    expect(markdown).toContain("- result: promote candidate");
  });
});
