import { describe, it, expect } from "vitest";
import { buildPromoText, buildCrossPromoBlocks } from "../promo-templates";
import type { ChannelName, CrossPromoBlock } from "../channel-types";

const sampleBlocks: CrossPromoBlock[] = [
  { targetChannel: "threads", url: "https://threads.net/@vibehub/post/123", text: "Read on Threads" },
  { targetChannel: "ghost", url: "https://vibehub.com/brief-1", text: "Full article on VibeHub" },
  { targetChannel: "youtube", url: "https://youtube.com/watch?v=abc", text: "Watch on YouTube" },
];

const ctx = {
  title: "AI Brief #1",
  slug: "ai-brief-1",
  publishedUrls: {
    threads: "https://threads.net/@vibehub/post/123",
    ghost: "https://vibehub.com/brief-1",
    youtube: "https://youtube.com/watch?v=abc",
  } as Partial<Record<ChannelName, string>>,
};

describe("buildPromoText", () => {
  it("should exclude self-channel from promo", () => {
    const text = buildPromoText("threads", ctx, sampleBlocks);
    expect(text).not.toContain("Read on Threads");
    expect(text).toContain("VibeHub");
    expect(text).toContain("YouTube");
  });

  it("should respect Threads 500 char limit", () => {
    const text = buildPromoText("threads", ctx, sampleBlocks);
    expect(text.length).toBeLessThanOrEqual(500);
  });

  it("should generate HTML for ghost", () => {
    const text = buildPromoText("ghost", ctx, sampleBlocks);
    expect(text).toContain("<div class=\"cross-promo\">");
    expect(text).toContain("<a href=");
    expect(text).not.toContain("Full article on VibeHub");
  });

  it("should return empty for single block", () => {
    const singleBlock: CrossPromoBlock[] = [
      { targetChannel: "threads", url: "https://threads.net/123", text: "Threads" },
    ];
    const text = buildPromoText("threads", ctx, singleBlock);
    expect(text).toBe("");
  });
});

describe("buildCrossPromoBlocks", () => {
  it("should create blocks from published URLs", () => {
    const blocks = buildCrossPromoBlocks({
      threads: "https://threads.net/123",
      ghost: "https://vibehub.com/article",
    });
    expect(blocks).toHaveLength(2);
    expect(blocks[0].targetChannel).toBe("threads");
    expect(blocks[1].targetChannel).toBe("ghost");
  });

  it("should skip empty URLs", () => {
    const blocks = buildCrossPromoBlocks({
      threads: "https://threads.net/123",
      ghost: undefined,
    });
    expect(blocks).toHaveLength(1);
  });
});
