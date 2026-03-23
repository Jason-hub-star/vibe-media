import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { DiscoverItem } from "@vibehub/content-contracts";

import { exportDiscoverItemsToObsidian } from "../src/shared/obsidian-discover-export";

function createDiscoverItem(overrides: Partial<DiscoverItem>): DiscoverItem {
  return {
    id: "discover-default",
    slug: "default-item",
    title: "Default item",
    category: "open_source",
    summary: "Summary",
    status: "tracked",
    tags: ["repo"],
    actions: [{ kind: "github", label: "GitHub", href: "https://github.com/example/repo" }],
    highlighted: false,
    ...overrides
  };
}

describe("obsidian discover export", () => {
  it("routes open source, skill, and plugin items to the right folders", async () => {
    const vaultRoot = await mkdtemp(path.join(os.tmpdir(), "vibehub-obsidian-"));
    const report = await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-open-source",
          slug: "open-source-tool",
          title: "Open source tool",
          category: "open_source",
          tags: ["tool"]
        }),
        createDiscoverItem({
          id: "discover-skill",
          slug: "skill-guide",
          title: "Skill guide",
          category: "skill",
          actions: [{ kind: "docs", label: "Docs", href: "https://example.com/skill" }]
        }),
        createDiscoverItem({
          id: "discover-plugin",
          slug: "plugin-kit",
          title: "Plugin kit",
          category: "plugin",
          actions: [{ kind: "visit", label: "Visit", href: "https://example.com/plugin" }]
        })
      ],
      { vaultRoot }
    );

    expect(report.savedCount).toBe(3);
    expect(report.savedPaths).toEqual([
      path.join("Radar", "Open Source", "open-source-tool.md"),
      path.join("Radar", "Plugins", "plugin-kit.md"),
      path.join("Radar", "Skills", "skill-guide.md")
    ]);
  });

  it("routes github release items to releases and repo items to repositories", async () => {
    const vaultRoot = await mkdtemp(path.join(os.tmpdir(), "vibehub-obsidian-"));
    const report = await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-release",
          slug: "sdk-release",
          title: "SDK Release",
          category: "open_source",
          tags: ["release", "repo"]
        }),
        createDiscoverItem({
          id: "discover-repo",
          slug: "repo-item",
          title: "Repository item",
          category: "open_source",
          tags: ["repo"]
        })
      ],
      { vaultRoot }
    );

    expect(report.savedPaths).toContain(path.join("Radar", "GitHub Releases", "sdk-release.md"));
    expect(report.savedPaths).toContain(path.join("Radar", "Repositories", "repo-item.md"));
  });

  it("updates the same note when the vibehub item is exported again", async () => {
    const vaultRoot = await mkdtemp(path.join(os.tmpdir(), "vibehub-obsidian-"));

    await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-repeat",
          slug: "repeat-item",
          title: "Repeat item",
          summary: "First summary",
          category: "skill",
          actions: [{ kind: "docs", label: "Docs", href: "https://example.com/first" }]
        })
      ],
      { vaultRoot }
    );

    const report = await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-repeat",
          slug: "repeat-item",
          title: "Repeat item",
          summary: "Updated summary",
          category: "skill",
          actions: [{ kind: "docs", label: "Docs", href: "https://example.com/updated" }]
        })
      ],
      { vaultRoot }
    );

    const notePath = path.join(vaultRoot, "Radar", "Skills", "repeat-item.md");
    const markdown = await readFile(notePath, "utf8");

    expect(report.updatedCount).toBe(1);
    expect(markdown).toContain("Updated summary");
    expect(markdown).toContain("https://example.com/updated");
  });

  it("keeps a single note when the same vibehub item changes slug", async () => {
    const vaultRoot = await mkdtemp(path.join(os.tmpdir(), "vibehub-obsidian-"));

    await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-stable-id",
          slug: "first-slug",
          title: "Stable item",
          category: "open_source",
          tags: ["repo"]
        })
      ],
      { vaultRoot }
    );

    const report = await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-stable-id",
          slug: "second-slug",
          title: "Stable item",
          category: "open_source",
          tags: ["repo", "harness"]
        })
      ],
      { vaultRoot }
    );

    await expect(readFile(path.join(vaultRoot, "Radar", "Repositories", "first-slug.md"), "utf8")).rejects.toThrow();

    const movedMarkdown = await readFile(path.join(vaultRoot, "Radar", "Repositories", "second-slug.md"), "utf8");
    expect(report.updatedCount).toBe(1);
    expect(movedMarkdown).toContain('vibehub_id: "discover-stable-id"');
    expect(movedMarkdown).toContain('"harness"');
  });

  it("skips non-phase-one categories without failing the export", async () => {
    const vaultRoot = await mkdtemp(path.join(os.tmpdir(), "vibehub-obsidian-"));
    const report = await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-event",
          slug: "event-item",
          title: "Event item",
          category: "event",
          actions: [{ kind: "visit", label: "Visit", href: "https://example.com/event" }]
        })
      ],
      { vaultRoot }
    );

    expect(report.savedCount).toBe(0);
    expect(report.skippedCount).toBe(1);
    expect(report.results[0]?.reason).toContain("not exported");
  });
});
