import { describe, expect, it } from "vitest";

import type { BriefListItem, DiscoverItem, VideoJob } from "./index";

describe("shared contract shapes", () => {
  it("accepts a valid brief list item", () => {
    const brief: BriefListItem = {
      slug: "openai-agents-sdk-update",
      title: "Agents SDK update",
      summary: "What changed and why it matters.",
      status: "review",
      publishedAt: null,
      sourceCount: 3
    };

    expect(brief.status).toBe("review");
  });

  it("accepts a valid video job", () => {
    const job: VideoJob = {
      id: "job-1",
      title: "Minecraft evening run",
      kind: "gameplay",
      status: "asset_pending",
      assetLinkState: "partial",
      sourceSession: "2026-03-21-evening"
    };

    expect(job.assetLinkState).toBe("partial");
  });

  it("accepts a valid discover item", () => {
    const item: DiscoverItem = {
      id: "discover-stitch",
      slug: "stitch-sdk",
      title: "Stitch SDK",
      category: "plugin",
      summary: "Design variant generation for rapid exploration.",
      status: "featured",
      tags: ["design", "sdk"],
      highlighted: true,
      actions: [
        { kind: "github", label: "GitHub", href: "https://github.com/google-labs-code/stitch-sdk" }
      ]
    };

    expect(item.category).toBe("plugin");
  });
});
