import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { dispatchPublish, registerPublisher } from "../publish-dispatcher";
import type { ChannelPublisher, ChannelPublishResult, BriefChannelMeta, ChannelConfig } from "../channel-types";
import type { PublishPayload } from "../../types";

// ---------------------------------------------------------------------------
// Mock Publisher
// ---------------------------------------------------------------------------

function createMockPublisher(
  channel: "threads" | "ghost",
  shouldFail = false,
): ChannelPublisher {
  return {
    name: channel,
    channel,
    publish: vi.fn(async (payload: PublishPayload, opts?: { dryRun?: boolean }): Promise<ChannelPublishResult> => {
      if (opts?.dryRun) {
        return { channel, success: true, publishedUrl: `https://dry-run.test/${channel}`, publishedAt: new Date().toISOString() };
      }
      if (shouldFail) {
        return { channel, success: false, error: `${channel} publish failed` };
      }
      return { channel, success: true, publishedUrl: `https://test.com/${channel}/123`, publishedAt: new Date().toISOString() };
    }),
    injectCrossPromo: vi.fn(async () => ({ channel, success: true })),
  };
}

const baseMeta: BriefChannelMeta = {
  briefId: "test-brief-1",
  slug: "test-brief",
  title: "Test Brief Title",
  markdownBody: "Test body content",
  tags: ["ai", "tech"],
  languages: ["en"],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PublishDispatcher", () => {
  beforeEach(() => {
    registerPublisher("threads", () => createMockPublisher("threads"));
    registerPublisher("ghost", () => createMockPublisher("ghost"));
  });

  it("should dispatch to multiple channels in parallel", async () => {
    const channels: ChannelConfig[] = [
      { name: "threads", enabled: true },
      { name: "ghost", enabled: true },
    ];

    const result = await dispatchPublish({ briefMeta: baseMeta, channels });

    expect(result.allSuccess).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.briefId).toBe("test-brief-1");
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should skip disabled channels", async () => {
    const channels: ChannelConfig[] = [
      { name: "threads", enabled: true },
      { name: "ghost", enabled: false },
    ];

    const result = await dispatchPublish({ briefMeta: baseMeta, channels });

    expect(result.results).toHaveLength(1);
    expect(result.results[0].channel).toBe("threads");
  });

  it("should support dryRun mode", async () => {
    const channels: ChannelConfig[] = [
      { name: "threads", enabled: true },
    ];

    const result = await dispatchPublish({ briefMeta: baseMeta, channels, dryRun: true });

    expect(result.allSuccess).toBe(true);
    expect(result.results[0].publishedUrl).toContain("dry-run");
  });

  it("should isolate channel failures", async () => {
    registerPublisher("threads", () => createMockPublisher("threads", true));
    registerPublisher("ghost", () => createMockPublisher("ghost"));

    const channels: ChannelConfig[] = [
      { name: "threads", enabled: true },
      { name: "ghost", enabled: true },
    ];

    const result = await dispatchPublish({ briefMeta: baseMeta, channels });

    expect(result.allSuccess).toBe(false);
    const threadResult = result.results.find((r) => r.channel === "threads");
    const ghostResult = result.results.find((r) => r.channel === "ghost");
    expect(threadResult?.success).toBe(false);
    expect(ghostResult?.success).toBe(true);
  });

  it("should handle unregistered channel gracefully", async () => {
    const channels: ChannelConfig[] = [
      { name: "podcast-rss", enabled: true },
    ];

    const result = await dispatchPublish({ briefMeta: baseMeta, channels });

    expect(result.results[0].success).toBe(false);
    expect(result.results[0].error).toContain("No publisher registered");
  });

  it("should run cross-promo when 2+ channels succeed", async () => {
    const channels: ChannelConfig[] = [
      { name: "threads", enabled: true },
      { name: "ghost", enabled: true },
    ];

    const result = await dispatchPublish({ briefMeta: baseMeta, channels });

    expect(result.crossPromoResults).toBeDefined();
    expect(result.crossPromoResults!.length).toBeGreaterThan(0);
  });

  it("should prefer the configured locale variant payload", async () => {
    const publishSpy = vi.fn(async (payload: PublishPayload) => ({
      channel: "threads" as const,
      success: true,
      publishedUrl: `https://test.com/threads/es`,
      publishedAt: new Date().toISOString(),
    }));

    registerPublisher("threads", () => ({
      name: "threads",
      channel: "threads",
      publish: publishSpy,
      injectCrossPromo: vi.fn(async () => ({ channel: "threads", success: true })),
    }));

    const channels: ChannelConfig[] = [{ name: "threads", enabled: true }];

    await dispatchPublish({
      briefMeta: {
        ...baseMeta,
        defaultLocale: "es",
        availableLocales: ["en", "es"],
        variants: {
          es: {
            locale: "es",
            title: "Titulo en Espanol",
            markdownBody: "Cuerpo en espanol",
            tags: ["ia"],
            thumbnailUrl: "https://cdn.test/thumb-es.png",
            videoUrl: "https://cdn.test/video-es.mp4",
          },
        },
      },
      channels,
    });

    expect(publishSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Titulo en Espanol",
        markdownBody: "Cuerpo en espanol",
        tags: ["ia"],
        thumbnailUrl: "https://cdn.test/thumb-es.png",
        videoUrl: "https://cdn.test/video-es.mp4",
      }),
      expect.anything(),
    );
  });
});
