import { describe, expect, it } from "vitest";

import { runAllShadowTrials } from "../src/shared/shadow-trial-suite";

describe("shadow trial suite", () => {
  it("summarizes the stage reports into a single pass/fail result", () => {
    const report = runAllShadowTrials("2026-03-23T00:00:00.000Z");

    expect(report.overallStatus).toBe("baseline-pass");
    expect(report.exitCode).toBe(0);
    expect(report.stages).toHaveLength(4);
    expect(report.stages.every((stage) => stage.result === "promote candidate")).toBe(true);
    expect(report.notes.some((note) => note.includes("fixture-backed baseline validation"))).toBe(true);
  });
});
