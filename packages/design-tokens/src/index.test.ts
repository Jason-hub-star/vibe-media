import { describe, expect, it } from "vitest";

import { assetSlots, colorTokens, stateTokens } from "./index";

describe("design tokens", () => {
  it("keeps status colors aligned to the shared palette", () => {
    expect(stateTokens.review).toBe(colorTokens.orange);
    expect(stateTokens.ready).toBe(colorTokens.mint);
  });

  it("defines placeholder slots with explicit formats and sizes", () => {
    expect(assetSlots.every((slot) => slot.spec.minSize.includes("x"))).toBe(true);
    expect(assetSlots.every((slot) => ["svg", "webp", "avif"].includes(slot.spec.format))).toBe(true);
  });
});
