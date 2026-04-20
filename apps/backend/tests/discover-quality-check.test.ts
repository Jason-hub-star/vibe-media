import { describe, expect, it } from "vitest";
import { runDiscoverQualityCheck } from "../src/shared/discover-quality-check";

describe("runDiscoverQualityCheck", () => {
  const good = {
    title: "Stitch SDK for rapid UI variant generation",
    summary:
      "A design exploration tool that generates multiple UI variants while keeping tokens as the source of truth.",
    category: "plugin",
  };

  it("passes a well-formed discover item", () => {
    const result = runDiscoverQualityCheck(good);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("fails when short summary is truncated with '...'", () => {
    const result = runDiscoverQualityCheck({
      ...good,
      summary:
        "A design system that streamlines component reuse across teams and projects with token...",
    });
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("truncated"))).toBe(true);
  });

  it("passes when long summary is truncated (clampText artifact at 120+ chars)", () => {
    const result = runDiscoverQualityCheck({
      ...good,
      summary:
        "Dropdowns often work perfectly until they are placed inside a scrollable panel, where they can get clipped, and half the menu disappears behind the container edge...",
    });
    expect(result.passed).toBe(true);
  });

  it("fails when summary is truncated with ellipsis character", () => {
    const result = runDiscoverQualityCheck({
      ...good,
      summary: "A short description that ends with an ellipsis\u2026",
    });
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("truncated"))).toBe(true);
  });

  it("fails when summary starts with quote and lacks substance", () => {
    const result = runDiscoverQualityCheck({
      ...good,
      summary:
        '"The future of design is systemic." — Anonymous Designer',
    });
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("quote"))).toBe(true);
  });

  it("passes when summary starts with quote but has substantive content after", () => {
    const result = runDiscoverQualityCheck({
      ...good,
      summary:
        '"Design is systemic." This tool provides a framework for building coherent token-based design systems across large teams.',
    });
    expect(result.passed).toBe(true);
  });

  it("fails when summary is too short (under 60 chars)", () => {
    const result = runDiscoverQualityCheck({
      ...good,
      summary: "A short summary that is not descriptive enough.",
    });
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("too short"))).toBe(true);
  });

  it("fails when title is too short", () => {
    const result = runDiscoverQualityCheck({
      ...good,
      title: "SDK",
    });
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("title length"))).toBe(true);
  });

  it("fails when summary contains internal terms", () => {
    const result = runDiscoverQualityCheck({
      ...good,
      summary:
        "This item was processed through the ingest pipeline and classified automatically by the orchestrator.",
    });
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("internal terms"))).toBe(true);
  });

  it("fails when the item reads like release notes without editorial synthesis", () => {
    const result = runDiscoverQualityCheck({
      ...good,
      title: "Workbench maintenance release",
      summary:
        "Updated dependencies, bug fixes, and minor improvements for the latest maintenance release across the Workbench package set.",
    });

    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("release notes"))).toBe(true);
  });
});
