import { describe, expect, it } from "vitest";

import {
  inferDiscoverCategoryFromTags,
  inferTargetSurfaceFromTags
} from "../src/shared/discover-category-routing";

describe("discover category routing", () => {
  it("routes design inspiration tags to design_token discover items", () => {
    expect(inferTargetSurfaceFromTags(["design", "landing-page", "inspiration"])).toBe("discover");
    expect(inferDiscoverCategoryFromTags(["design", "css", "frontend"])).toBe("design_token");
  });

  it("keeps builder signals ahead of generic design tags", () => {
    expect(inferTargetSurfaceFromTags(["design", "sdk", "frontend"])).toBe("both");
    expect(inferDiscoverCategoryFromTags(["design", "sdk", "frontend"])).toBe("sdk");
  });

  it("prefers website over generic tool tags for launch pages", () => {
    expect(inferDiscoverCategoryFromTags(["website", "launch", "tool"])).toBe("website");
  });
});
