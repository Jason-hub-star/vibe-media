import { afterEach, describe, expect, it, vi } from "vitest";

const readLiveIngestSnapshot = vi.fn();
const listSupabaseDiscoverItems = vi.fn();
const buildEditorialRows = vi.fn();

vi.mock("../src/shared/live-ingest-snapshot", () => ({
  readLiveIngestSnapshot
}));

vi.mock("../src/shared/supabase-editorial-read", () => ({
  listSupabaseDiscoverItems
}));

vi.mock("../src/shared/supabase-editorial-sync", () => ({
  buildEditorialRows
}));

describe("listDiscoverItems fallback", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("uses snapshot-derived discover items when Supabase returns null and item is published", async () => {
    listSupabaseDiscoverItems.mockResolvedValue(null);
    readLiveIngestSnapshot.mockReturnValue({ generatedAt: "2026-03-24T00:00:00.000Z" });
    buildEditorialRows.mockReturnValue({
      discoverItems: [
        {
          id: "discover-snapshot",
          slug: "snapshot-item",
          title: "Snapshot item",
          category: "open_source",
          summary: "Snapshot summary",
          status: "featured",
          review_status: "approved",
          scheduled_at: null,
          published_at: "2026-03-24T00:00:00.000Z",
          tags: ["repo", "release"],
          highlighted: true
        }
      ],
      discoverActions: [
        {
          id: "action-snapshot",
          discover_item_id: "discover-snapshot",
          action_kind: "github",
          label: "GitHub",
          href: "https://github.com/example/snapshot-item",
          position: 0
        }
      ],
      briefPosts: [],
      adminReviews: []
    });

    const { listDiscoverItemsWithSource } = await import("../src/features/discover/list-discover-items");
    const { items, source } = await listDiscoverItemsWithSource();

    expect(items).toHaveLength(1);
    expect(source).toBe("snapshot");
    expect(items[0]).toMatchObject({
      id: "discover-snapshot",
      slug: "snapshot-item",
      category: "open_source",
      status: "featured",
      reviewStatus: "approved",
      publishedAt: "2026-03-24T00:00:00.000Z",
      highlighted: true
    });
    expect(items[0]?.actions[0]?.kind).toBe("github");
  });

  it("filters out unpublished snapshot items", async () => {
    listSupabaseDiscoverItems.mockResolvedValue(null);
    readLiveIngestSnapshot.mockReturnValue({ generatedAt: "2026-03-24T00:00:00.000Z" });
    buildEditorialRows.mockReturnValue({
      discoverItems: [
        {
          id: "discover-pending",
          slug: "pending-item",
          title: "Pending item",
          category: "sdk",
          summary: "Pending summary",
          status: "tracked",
          review_status: "pending",
          scheduled_at: null,
          published_at: null,
          tags: ["sdk"],
          highlighted: false
        }
      ],
      discoverActions: [],
      briefPosts: [],
      adminReviews: []
    });

    const { listDiscoverItemsWithSource } = await import("../src/features/discover/list-discover-items");
    const { items, source } = await listDiscoverItemsWithSource();

    // pending item should be filtered out, falling back to mock
    expect(source).toBe("mock");
    expect(items.every((item) => item.reviewStatus === "approved" && item.publishedAt != null)).toBe(true);
  });

  it("falls back to mock discover entries when both Supabase and snapshot are unavailable", async () => {
    listSupabaseDiscoverItems.mockResolvedValue([]);
    readLiveIngestSnapshot.mockReturnValue(null);
    buildEditorialRows.mockReturnValue({
      discoverItems: [],
      discoverActions: [],
      briefPosts: [],
      adminReviews: []
    });

    const { listDiscoverItemsWithSource } = await import("../src/features/discover/list-discover-items");
    const { items, source } = await listDiscoverItemsWithSource();

    expect(items.length).toBeGreaterThan(0);
    expect(source).toBe("mock");
    // mock entries with pending/null publishedAt should be filtered out
    expect(items.every((item) => item.reviewStatus === "approved" && item.publishedAt != null)).toBe(true);
  });

  it("dedupes published Supabase discover items that share the same canonical link", async () => {
    listSupabaseDiscoverItems.mockResolvedValue([
      {
        id: "discover-old",
        slug: "openai-node-v6-31-old",
        title: "OpenAI Node v6.31.0",
        category: "open_source",
        summary: "Older duplicated row",
        status: "featured",
        reviewStatus: "approved",
        scheduledAt: null,
        publishedAt: "2026-03-16T09:00:00.000Z",
        tags: ["Repo"],
        highlighted: false,
        actions: [
          {
            kind: "github",
            label: "GitHub",
            href: "https://github.com/openai/openai-node/releases/tag/v6.31.0"
          }
        ]
      },
      {
        id: "discover-new",
        slug: "openai-node-v6-31-new",
        title: "OpenAI Node v6.31.0",
        category: "open_source",
        summary: "Newer canonical row",
        status: "featured",
        reviewStatus: "approved",
        scheduledAt: null,
        publishedAt: "2026-03-18T09:00:00.000Z",
        tags: ["Repo", "Release"],
        highlighted: true,
        actions: [
          {
            kind: "github",
            label: "GitHub",
            href: "https://github.com/openai/openai-node/releases/tag/v6.31.0"
          },
          {
            kind: "brief",
            label: "Brief",
            href: "/brief/openai-node-v6-31"
          }
        ]
      }
    ]);
    readLiveIngestSnapshot.mockReturnValue(null);
    buildEditorialRows.mockReturnValue({
      discoverItems: [],
      discoverActions: [],
      briefPosts: [],
      adminReviews: []
    });

    const { listDiscoverItemsWithSource } = await import("../src/features/discover/list-discover-items");
    const { items, source } = await listDiscoverItemsWithSource();

    expect(source).toBe("supabase");
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("discover-new");
    expect(items[0]?.highlighted).toBe(true);
    expect(items[0]?.actions).toHaveLength(2);
  });
});
