import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { presentBriefAccentColor } from "./present-brief-topic";

describe("presentBriefAccentColor", () => {
  it("returns a valid palette color", () => {
    const validColors = ["mint", "sky", "purple", "yellow", "orange", "rose"];
    const result = presentBriefAccentColor("ai-models", "test-slug");
    assert.ok(validColors.includes(result), `${result} is not a valid palette color`);
  });

  it("is deterministic — same input always produces same output", () => {
    const a = presentBriefAccentColor("research", "slug-1");
    const b = presentBriefAccentColor("research", "slug-1");
    assert.equal(a, b);
  });

  it("falls back to slug when topic is undefined", () => {
    const a = presentBriefAccentColor(undefined, "my-slug");
    const b = presentBriefAccentColor(undefined, "my-slug");
    assert.equal(a, b);
  });

  it("different topics produce different colors (probabilistically)", () => {
    const colors = new Set(
      ["ai", "web", "security", "data", "cloud", "mobile", "research", "devops"]
        .map((t) => presentBriefAccentColor(t, "x"))
    );
    // With 8 different inputs and 6 colors, we expect at least 2 distinct colors
    assert.ok(colors.size >= 2, `Expected diversity but got ${colors.size} unique colors`);
  });
});
