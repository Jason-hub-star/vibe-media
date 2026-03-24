import { mkdtemp, readFile, writeFile } from "node:fs/promises";
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
      { vaultRoot, source: "mock" }
    );

    expect(report.savedCount).toBe(3);
    expect(report.source).toBe("mock");
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
      { vaultRoot, source: "snapshot" }
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
      { vaultRoot, source: "supabase" }
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
      { vaultRoot, source: "supabase" }
    );

    const notePath = path.join(vaultRoot, "Radar", "Skills", "repeat-item.md");
    const markdown = await readFile(notePath, "utf8");

    expect(report.updatedCount).toBe(1);
    expect(markdown).toContain("Updated summary");
    expect(markdown).toContain("https://example.com/updated");
  });

  it("preserves manual notes when the same note is exported again", async () => {
    const vaultRoot = await mkdtemp(path.join(os.tmpdir(), "vibehub-obsidian-"));

    await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-manual",
          slug: "manual-item",
          title: "Manual item",
          summary: "First summary",
          category: "skill",
          actions: [{ kind: "docs", label: "Docs", href: "https://example.com/manual" }]
        })
      ],
      { vaultRoot, source: "supabase" }
    );

    const notePath = path.join(vaultRoot, "Radar", "Skills", "manual-item.md");
    const originalMarkdown = await readFile(notePath, "utf8");
    const markdownWithManualNote = originalMarkdown.replace(
      "## Manual Notes\n-",
      "## Manual Notes\n- Keep this note"
    );
    await writeFile(notePath, markdownWithManualNote, "utf8");

    await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-manual",
          slug: "manual-item",
          title: "Manual item",
          summary: "Updated summary",
          category: "skill",
          actions: [{ kind: "docs", label: "Docs", href: "https://example.com/manual-updated" }]
        })
      ],
      { vaultRoot, source: "supabase" }
    );

    const updatedMarkdown = await readFile(notePath, "utf8");
    expect(updatedMarkdown).toContain("Updated summary");
    expect(updatedMarkdown).toContain("Keep this note");
    expect(updatedMarkdown).toContain("MANUAL-NOTES:START");
  });

  it("writes richer metadata and folder indexes for exported notes", async () => {
    const vaultRoot = await mkdtemp(path.join(os.tmpdir(), "vibehub-obsidian-"));

    const report = await exportDiscoverItemsToObsidian(
      [
        createDiscoverItem({
          id: "discover-rich",
          slug: "rich-item",
          title: "Rich item",
          category: "open_source",
          status: "featured",
          highlighted: true,
          tags: ["repo", "release"],
          actions: [
            { kind: "github", label: "GitHub", href: "https://github.com/example/rich-item" },
            { kind: "brief", label: "Brief", href: "/brief/rich-item-brief" }
          ]
        })
      ],
      { vaultRoot }
    );

    const notePath = path.join(vaultRoot, "Radar", "GitHub Releases", "rich-item.md");
    const folderIndexPath = path.join(vaultRoot, "Radar", "GitHub Releases", "_Index.md");
    const rootIndexPath = path.join(vaultRoot, "Radar", "_Index.md");

    const noteMarkdown = await readFile(notePath, "utf8");
    const folderIndexMarkdown = await readFile(folderIndexPath, "utf8");
    const rootIndexMarkdown = await readFile(rootIndexPath, "utf8");

    expect(noteMarkdown).toContain('folder_name: "GitHub Releases"');
    expect(noteMarkdown).toContain('brief_slug: "rich-item-brief"');
    expect(noteMarkdown).toContain("## Why It Matters");
    expect(noteMarkdown).toContain("## Related Brief");
    expect(folderIndexMarkdown).toContain("[[rich-item]]");
    expect(rootIndexMarkdown).toContain("[[GitHub Releases/_Index]]");
    expect(report.indexPaths).toContain(path.join("Radar", "_Index.md"));
    expect(report.indexPaths).toContain(path.join("Radar", "GitHub Releases", "_Index.md"));
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

    const firstPath = path.join(vaultRoot, "Radar", "Repositories", "first-slug.md");
    const originalMarkdown = await readFile(firstPath, "utf8");
    await writeFile(
      firstPath,
      originalMarkdown.replace("## Manual Notes\n-", "## Manual Notes\n- Preserve during move"),
      "utf8"
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
    expect(movedMarkdown).toContain("Preserve during move");
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
