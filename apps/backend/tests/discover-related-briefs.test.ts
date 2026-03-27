import { afterEach, describe, expect, it, vi } from "vitest";

const listSupabaseDiscoverItems = vi.fn();
const listSupabaseBriefs = vi.fn();
const readLiveIngestSnapshot = vi.fn().mockReturnValue(null);
const buildEditorialRows = vi.fn().mockReturnValue({
  discoverItems: [],
  discoverActions: [],
  briefPosts: [],
  adminReviews: [],
});

vi.mock("../src/shared/supabase-editorial-read", () => ({
  listSupabaseDiscoverItems,
  listSupabaseBriefs,
}));

vi.mock("../src/shared/live-ingest-snapshot", () => ({
  readLiveIngestSnapshot,
}));

vi.mock("../src/shared/supabase-editorial-sync", () => ({
  buildEditorialRows,
}));

describe("getDiscoverItemDetail related briefs", () => {
  afterEach(() => {
    vi.resetAllMocks();
    readLiveIngestSnapshot.mockReturnValue(null);
    buildEditorialRows.mockReturnValue({
      discoverItems: [],
      discoverActions: [],
      briefPosts: [],
      adminReviews: [],
    });
  });

  it("returns matching brief slugs based on tag overlap with brief title", async () => {
    listSupabaseDiscoverItems.mockResolvedValue([
      {
        id: "d1",
        slug: "openai-sdk",
        title: "OpenAI SDK v7",
        category: "sdk",
        summary: "New SDK release",
        status: "featured",
        reviewStatus: "approved",
        scheduledAt: null,
        publishedAt: "2026-03-20T00:00:00.000Z",
        tags: ["OpenAI", "SDK"],
        highlighted: false,
        actions: [],
      },
    ]);

    listSupabaseBriefs.mockResolvedValue([
      {
        slug: "openai-brief",
        title: "OpenAI launches new API",
        summary: "Brief about OpenAI",
        status: "published",
        publishedAt: "2026-03-19T00:00:00.000Z",
        sourceCount: 2,
        body: [],
        sourceLinks: [],
      },
      {
        slug: "unrelated-brief",
        title: "Climate change report",
        summary: "Unrelated brief",
        status: "published",
        publishedAt: "2026-03-18T00:00:00.000Z",
        sourceCount: 1,
        body: [],
        sourceLinks: [],
      },
    ]);

    const { getDiscoverItemDetail } = await import(
      "../src/features/discover/get-discover-item-detail"
    );
    const detail = await getDiscoverItemDetail("d1");

    expect(detail).not.toBeNull();
    expect(detail!.relatedBriefSlugs).toContain("openai-brief");
    expect(detail!.relatedBriefSlugs).not.toContain("unrelated-brief");
  });

  it("returns empty array when no tags match", async () => {
    listSupabaseDiscoverItems.mockResolvedValue([
      {
        id: "d2",
        slug: "some-tool",
        title: "Some tool",
        category: "plugin",
        summary: "A plugin",
        status: "tracked",
        reviewStatus: "approved",
        scheduledAt: null,
        publishedAt: "2026-03-20T00:00:00.000Z",
        tags: ["niche-tag"],
        highlighted: false,
        actions: [],
      },
    ]);

    listSupabaseBriefs.mockResolvedValue([
      {
        slug: "unrelated",
        title: "Totally different topic",
        summary: "No overlap",
        status: "published",
        publishedAt: "2026-03-19T00:00:00.000Z",
        sourceCount: 1,
        body: [],
        sourceLinks: [],
      },
    ]);

    const { getDiscoverItemDetail } = await import(
      "../src/features/discover/get-discover-item-detail"
    );
    const detail = await getDiscoverItemDetail("d2");

    expect(detail).not.toBeNull();
    expect(detail!.relatedBriefSlugs).toEqual([]);
  });

  it("returns at most 3 related briefs", async () => {
    listSupabaseDiscoverItems.mockResolvedValue([
      {
        id: "d3",
        slug: "ai-tool",
        title: "AI Tool",
        category: "agent",
        summary: "An AI tool",
        status: "featured",
        reviewStatus: "approved",
        scheduledAt: null,
        publishedAt: "2026-03-20T00:00:00.000Z",
        tags: ["AI"],
        highlighted: false,
        actions: [],
      },
    ]);

    listSupabaseBriefs.mockResolvedValue(
      Array.from({ length: 5 }, (_, i) => ({
        slug: `ai-brief-${i}`,
        title: `AI related brief ${i}`,
        summary: `Brief ${i}`,
        status: "published",
        publishedAt: `2026-03-${15 + i}T00:00:00.000Z`,
        sourceCount: 1,
        body: [],
        sourceLinks: [],
      }))
    );

    const { getDiscoverItemDetail } = await import(
      "../src/features/discover/get-discover-item-detail"
    );
    const detail = await getDiscoverItemDetail("d3");

    expect(detail).not.toBeNull();
    expect(detail!.relatedBriefSlugs.length).toBeLessThanOrEqual(3);
  });
});
