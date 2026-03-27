import { describe, expect, it } from "vitest";

import { normalizeDiscoverCopy, normalizeDiscoverTags } from "../src/shared/discover-copy-normalizer";

describe("discover copy normalizer", () => {
  it("turns GitHub release changelog text into readable discover copy", () => {
    const copy = normalizeDiscoverCopy({
      title: "v6.33.0",
      url: "https://github.com/openai/openai-node/releases/tag/v6.33.0",
      sourceName: "GitHub Releases",
      summary:
        "## 6.33.0 (2026-03-25)\nFull Changelog: [v6.32.0...v6.33.0](https://github.com/openai/openai-node/compare/v6.32.0...v6.33.0)\n### Features\n* **api:** add keys field to computer actions"
    });

    expect(copy.title).toBe("OpenAI Node v6.33.0");
    expect(copy.summary).toContain("API: add keys field to computer actions.");
    expect(copy.summary).not.toContain("Full Changelog");
    expect(copy.summary).not.toContain("## 6.33.0");
  });

  it("cleans compact one-line changelog summaries from stored release rows", () => {
    const copy = normalizeDiscoverCopy({
      title: "OpenAI Node v6.31.0",
      url: "https://github.com/openai/openai-node/releases/tag/v6.31.0",
      sourceName: "GitHub Releases",
      summary:
        "V6.30.1...v6.31.0 ### Features api: add in/nin filter types to Comp..."
    });

    expect(copy.summary).toBe("API: add in/nin filter types to Comp...");
    expect(copy.summary).not.toContain("###");
    expect(copy.summary).not.toContain("V6.30.1...v6.31.0");
  });

  it("softens internal maintenance release lines and strips commit references", () => {
    const copy = normalizeDiscoverCopy({
      title: "OpenAI Node v6.30.1",
      url: "https://github.com/openai/openai-node/releases/tag/v6.30.1",
      sourceName: "GitHub Releases",
      summary:
        "V6.30.0...v6.30.1 ### Chores internal: tweak CI branches ([25f5d74]..."
    });

    expect(copy.summary).toBe("CI branch updates.");
    expect(copy.summary).not.toContain("[25f5d74]");
    expect(copy.summary).not.toContain("Chores");
  });

  it("removes common feed boilerplate from generic summaries", () => {
    const copy = normalizeDiscoverCopy({
      title: "Model Spec update",
      url: "https://openai.com/news/model-spec-update",
      sourceName: "OpenAI News",
      summary:
        "The post Model Spec update appeared first on OpenAI News. Learn how OpenAI's Model Spec serves as a public framework for model behavior."
    });

    expect(copy.title).toBe("Model Spec update");
    expect(copy.summary).toBe(
      "Learn how OpenAI's Model Spec serves as a public framework for model behavior."
    );
  });

  it("formats discover tags into readable labels", () => {
    expect(normalizeDiscoverTags({ tags: ["open-source", "api", "open_source", ""] })).toEqual(["Open Source", "API"]);
    expect(normalizeDiscoverTags({ tags: ["repo", "release", "api"] })).toEqual(["API"]);
  });
});
