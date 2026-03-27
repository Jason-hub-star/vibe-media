import { afterEach, describe, expect, it, vi } from "vitest";

const mockSql = vi.fn();
const mockEnd = vi.fn();

vi.mock("../src/shared/supabase-postgres", () => ({
  createSupabaseSql: () => {
    const sql = Object.assign(mockSql, { end: mockEnd });
    return sql;
  },
}));

describe("runSourceHealth", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("disables failing sources and counts active", async () => {
    // 1st: failing sources
    mockSql.mockResolvedValueOnce([
      {
        id: "src-1",
        name: "broken-rss",
        feed_url: "https://broken.com/rss",
        failure_reason: "404 Not Found",
        last_failure_at: new Date().toISOString(),
      },
    ]);
    // 2nd: UPDATE for disable
    mockSql.mockResolvedValueOnce([]);
    // 3rd: inactive sources (30 days)
    mockSql.mockResolvedValueOnce([]);
    // 4th: source brief counts
    mockSql.mockResolvedValueOnce([]);
    // 5th: recent hrefs
    mockSql.mockResolvedValueOnce([]);
    // 6th: existing base URLs
    mockSql.mockResolvedValueOnce([]);
    // 7th: active count
    mockSql.mockResolvedValueOnce([{ count: "24" }]);

    const { runSourceHealth } = await import("../src/shared/supabase-source-health");
    const report = await runSourceHealth();

    expect(report.disabledThisRun).toHaveLength(1);
    expect(report.disabledThisRun[0].name).toBe("broken-rss");
    expect(report.activeSourceCount).toBe(24);
  });

  it("finds new source candidates from recent briefs", async () => {
    // 1st: no failing
    mockSql.mockResolvedValueOnce([]);
    // 2nd: no inactive
    mockSql.mockResolvedValueOnce([]);
    // 3rd: source brief counts
    mockSql.mockResolvedValueOnce([]);
    // 4th: recent hrefs
    mockSql.mockResolvedValueOnce([
      { href: "https://newsite.com/article/123" },
      { href: "https://known.com/post/456" },
    ]);
    // 5th: existing base URLs
    mockSql.mockResolvedValueOnce([{ base_url: "https://known.com" }]);
    // 6th: active count
    mockSql.mockResolvedValueOnce([{ count: "25" }]);

    const { runSourceHealth } = await import("../src/shared/supabase-source-health");
    const report = await runSourceHealth();

    expect(report.newSourceCandidates).toHaveLength(1);
    expect(report.newSourceCandidates[0].domain).toBe("newsite.com");
  });

  it("suggests maxItems changes based on brief count", async () => {
    mockSql.mockResolvedValueOnce([]); // failing
    mockSql.mockResolvedValueOnce([]); // inactive
    mockSql.mockResolvedValueOnce([   // source brief counts
      { name: "prolific-source", brief_count: "15", max_items: 3 },
      { name: "low-source", brief_count: "0", max_items: 3 },
    ]);
    mockSql.mockResolvedValueOnce([]); // hrefs
    mockSql.mockResolvedValueOnce([]); // base urls
    mockSql.mockResolvedValueOnce([{ count: "25" }]); // active count

    const { runSourceHealth } = await import("../src/shared/supabase-source-health");
    const report = await runSourceHealth();

    expect(report.maxItemsSuggestions).toHaveLength(2);
    expect(report.maxItemsSuggestions.find((s) => s.name === "prolific-source")?.suggestion).toBe(
      "increase",
    );
    expect(report.maxItemsSuggestions.find((s) => s.name === "low-source")?.suggestion).toBe(
      "disable-candidate",
    );
  });
});
