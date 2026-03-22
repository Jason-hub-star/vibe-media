import { describe, expect, it } from "vitest";

import {
  CLASSIFIER_SHADOW_MINIMUM_SAMPLE_COUNT,
  renderClassifierShadowTrialLog,
  runClassifierShadowTrial
} from "../src/shared/classifier-shadow-trial";

describe("classifier shadow trial", () => {
  it("summarizes the default fixture-backed comparison run", () => {
    const report = runClassifierShadowTrial();

    expect(report.stage).toBe("classifier");
    expect(report.mode).toBe("hybrid");
    expect(report.activeProvider).toBe("ollama");
    expect(report.activeModel).toBe("mistral-small3.1");
    expect(report.candidateProvider).toBe("anthropic");
    expect(report.candidateModel).toBe("claude-sonnet-4-6");
    expect(report.sampleCount).toBe(CLASSIFIER_SHADOW_MINIMUM_SAMPLE_COUNT);
    expect(report.minimumSampleCount).toBe(CLASSIFIER_SHADOW_MINIMUM_SAMPLE_COUNT);
    expect(report.remainingSamples).toBe(0);
    expect(report.activeMetrics.taskSuccessRate).toBeLessThan(report.candidateMetrics.taskSuccessRate);
    expect(report.candidateMetrics.exceptionQueueInflow).toBeLessThanOrEqual(report.activeMetrics.exceptionQueueInflow);
    expect(report.outcome.result).toBe("promote candidate");
  });

  it("renders a markdown snippet for the orchestration trial log", () => {
    const report = runClassifierShadowTrial();
    const markdown = renderClassifierShadowTrialLog(report);

    expect(markdown).toContain("### Trial");
    expect(markdown).toContain("- stage: classifier");
    expect(markdown).toContain("- active provider: ollama");
    expect(markdown).toContain("- active model: mistral-small3.1");
    expect(markdown).toContain("- candidate provider: anthropic");
    expect(markdown).toContain("- candidate model: claude-sonnet-4-6");
    expect(markdown).toContain(`- sample count: ${report.sampleCount} / ${report.minimumSampleCount}`);
    expect(markdown).toContain("- result: promote candidate");
  });
});
