import { describe, expect, it } from "vitest";

import { buildDiscoverExportReportText, buildReportText } from "../src/shared/telegram-report";

describe("telegram report", () => {
  it("includes operator-facing highlights for zero-count and blocked stages", () => {
    const text = buildReportText({
      stages: [
        { id: "fetch", label: "Source Fetch", status: "done", itemCount: 0, durationMs: 2000 },
        { id: "ingest", label: "Ingest", status: "error", durationMs: 1500, errorMessage: "connection timeout" },
        { id: "sync", label: "Supabase Sync", status: "idle" }
      ],
      totalDurationMs: 3500,
      totalItems: 0,
      errorCount: 1,
      highlights: [
        "Source Fetch returned 0 items. Source freshness or stdout parsing을 확인하세요.",
        "Ingest 단계에서 중단됐고 이후 단계는 실행되지 않았습니다."
      ]
    });

    expect(text).toContain("핵심 알림");
    expect(text).toContain("Source Fetch returned 0 items.");
    expect(text).toContain("Ingest 단계에서 중단됐고 이후 단계는 실행되지 않았습니다.");
  });

  it("includes saved paths and vault root in the discover export report", () => {
    const text = buildDiscoverExportReportText({
      vaultRoot: "/vault",
      savedCount: 2,
      createdCount: 1,
      updatedCount: 1,
      skippedCount: 0,
      failedCount: 1,
      folderCounts: [
        { folderName: "GitHub Releases", count: 1 },
        { folderName: "Skills", count: 1 }
      ],
      savedPaths: ["Radar/GitHub Releases/sdk-release.md", "Radar/Skills/skill-guide.md"],
      results: [
        { title: "SDK Release", status: "created" },
        { title: "Skill Guide", status: "updated" },
        { title: "Broken export", status: "failed", reason: "disk full" }
      ]
    });

    expect(text).toContain("저장 루트: /vault");
    expect(text).toContain("Radar/GitHub Releases/sdk-release.md");
    expect(text).toContain("Broken export: disk full");
  });
});
