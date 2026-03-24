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

  it("uses snapshot-derived discover items when Supabase returns null", async () => {
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
          published_at: null,
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
      highlighted: true
    });
    expect(items[0]?.actions[0]?.kind).toBe("github");
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
    expect(items.some((item) => item.category === "skill" || item.category === "plugin")).toBe(true);
  });
});
