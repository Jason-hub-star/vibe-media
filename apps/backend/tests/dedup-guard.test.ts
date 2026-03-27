import { afterEach, describe, expect, it, vi } from "vitest";

const mockSql = vi.fn();
const mockEnd = vi.fn();

vi.mock("../src/shared/supabase-postgres", () => ({
  createSupabaseSql: () => {
    const sql = Object.assign(mockSql, { end: mockEnd });
    return sql;
  },
}));

describe("runDedupGuard", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("detects title+summary Jaccard duplicates", async () => {
    // 1st call: new briefs
    mockSql.mockResolvedValueOnce([
      {
        id: "new-1",
        slug: "openai-new-sdk",
        title: "OpenAI Releases New SDK for Developers",
        summary: "OpenAI has launched a new SDK targeting developers building AI apps",
        source_links: '[{"label":"OpenAI","href":"https://openai.com/new-sdk"}]',
      },
    ]);
    // 2nd call: existing briefs
    mockSql.mockResolvedValueOnce([
      {
        id: "old-1",
        slug: "openai-sdk-release",
        title: "OpenAI Releases SDK for Developers",
        summary: "OpenAI launched a developer SDK for building AI applications",
        source_links: '[{"label":"OpenAI Blog","href":"https://openai.com/blog/sdk"}]',
      },
    ]);
    // 3rd call: UPDATE for tagging
    mockSql.mockResolvedValueOnce([]);

    const { runDedupGuard } = await import("../src/shared/supabase-dedup-guard");
    const report = await runDedupGuard();

    expect(report.checked).toBe(1);
    expect(report.duplicates).toBe(1);
    expect(report.matches[0].type).toMatch(/title/);
  });

  it("detects same source_links duplicates", async () => {
    const sharedLink = '[{"label":"TechCrunch","href":"https://techcrunch.com/article-123"}]';

    mockSql.mockResolvedValueOnce([
      {
        id: "new-2",
        slug: "tc-article-new",
        title: "Completely Different Title",
        summary: "Completely different summary",
        source_links: sharedLink,
      },
    ]);
    mockSql.mockResolvedValueOnce([
      {
        id: "old-2",
        slug: "tc-article-old",
        title: "Another Title Entirely",
        summary: "Another summary entirely",
        source_links: sharedLink,
      },
    ]);
    mockSql.mockResolvedValueOnce([]);

    const { runDedupGuard } = await import("../src/shared/supabase-dedup-guard");
    const report = await runDedupGuard();

    expect(report.duplicates).toBe(1);
    expect(report.matches[0].type).toBe("same-source");
  });

  it("returns empty when no duplicates", async () => {
    mockSql.mockResolvedValueOnce([
      {
        id: "new-3",
        slug: "ai-robotics",
        title: "AI in Robotics",
        summary: "Robots using AI",
        source_links: '[{"label":"IEEE","href":"https://ieee.org/ai-robots"}]',
      },
    ]);
    mockSql.mockResolvedValueOnce([
      {
        id: "old-3",
        slug: "quantum-computing",
        title: "Quantum Computing Breakthrough",
        summary: "New quantum chip",
        source_links: '[{"label":"Nature","href":"https://nature.com/quantum"}]',
      },
    ]);

    const { runDedupGuard } = await import("../src/shared/supabase-dedup-guard");
    const report = await runDedupGuard();

    expect(report.duplicates).toBe(0);
    expect(report.matches).toEqual([]);
  });
});
