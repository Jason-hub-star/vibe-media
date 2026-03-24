import type { Dirent } from "node:fs";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DiscoverAction, DiscoverCategory, DiscoverItem } from "@vibehub/content-contracts";
import type { DiscoverItemsSource } from "../features/discover/list-discover-items";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_OBSIDIAN_VAULT_ROOT = path.resolve(REPO_ROOT, "../jasonob");
const DEFAULT_OBSIDIAN_DISCOVER_ROOT = "Radar";
const EXPORTED_DISCOVER_CATEGORIES = new Set<DiscoverCategory>(["open_source", "skill", "plugin"]);
const EXPORTED_DISCOVER_FOLDERS = ["Open Source", "Skills", "Plugins", "GitHub Releases", "Repositories"] as const;
const AUTO_SECTION_START = "<!-- AUTO-GENERATED:START -->";
const AUTO_SECTION_END = "<!-- AUTO-GENERATED:END -->";
const MANUAL_SECTION_START = "<!-- MANUAL-NOTES:START -->";
const MANUAL_SECTION_END = "<!-- MANUAL-NOTES:END -->";

export type DiscoverExportStatus = "created" | "updated" | "skipped" | "failed";

export interface DiscoverObsidianExportResult {
  discoverItemId: string;
  title: string;
  category: DiscoverCategory;
  folderName: string;
  filePath: string;
  status: DiscoverExportStatus;
  reason?: string;
}

export interface DiscoverObsidianExportSummary {
  vaultRoot: string;
  source: DiscoverItemsSource;
  results: DiscoverObsidianExportResult[];
  savedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  folderCounts: Array<{ folderName: string; count: number }>;
  savedPaths: string[];
  indexPaths: string[];
}

export interface DiscoverObsidianExportOptions {
  vaultRoot?: string;
  discoverRoot?: string;
  source?: DiscoverItemsSource;
}

function toYamlString(value: string) {
  return JSON.stringify(value);
}

function slugToFileName(slug: string) {
  const normalized = slug.replace(/[^a-z0-9-_]+/gi, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  return `${normalized || "discover-item"}.md`;
}

function normalizeTags(item: DiscoverItem) {
  const tags = new Set(item.tags.map((tag) => tag.trim()).filter(Boolean));
  const hasHarnessTag = Array.from(tags).some((tag) => tag.toLowerCase() === "harness");

  if (hasHarnessTag && (item.category === "skill" || item.category === "open_source")) {
    tags.add("harness");
  }

  return Array.from(tags);
}

function isGitHubRelease(item: DiscoverItem) {
  const hasGitHubAction = item.actions.some((action) => action.kind === "github");
  const hasReleaseTag = item.tags.some((tag) => tag.toLowerCase() === "release");
  return item.category === "open_source" && hasGitHubAction && hasReleaseTag;
}

function isRepository(item: DiscoverItem) {
  const hasGitHubAction = item.actions.some((action) => action.kind === "github");
  const hasRepoTag = item.tags.some((tag) => tag.toLowerCase() === "repo");
  return item.category === "open_source" && hasGitHubAction && hasRepoTag && !isGitHubRelease(item);
}

function getFolderName(item: DiscoverItem) {
  if (item.category === "skill") return "Skills";
  if (item.category === "plugin") return "Plugins";
  if (isGitHubRelease(item)) return "GitHub Releases";
  if (isRepository(item)) return "Repositories";
  return "Open Source";
}

function getPrimaryUrl(item: DiscoverItem) {
  return item.actions[0]?.href ?? "";
}

function getActionKinds(item: DiscoverItem) {
  return Array.from(new Set(item.actions.map((action) => action.kind)));
}

function getBriefSlug(item: DiscoverItem) {
  const briefAction = item.actions.find((action) => action.kind === "brief");
  if (!briefAction) return null;

  const match = briefAction.href.match(/\/brief\/([^/?#]+)/);
  return match?.[1] ?? null;
}

function getWhyItMatters(item: DiscoverItem, folderName: string) {
  if (item.highlighted) {
    return `Highlighted ${folderName} pick synced from the VibeHub Radar flow.`;
  }
  if (item.status === "watching") {
    return `Watching ${folderName.toLowerCase()} item worth revisiting as updates land.`;
  }
  if (item.status === "featured") {
    return `Featured ${folderName.toLowerCase()} item that is ready to surface in curation.`;
  }
  return `Tracked ${folderName.toLowerCase()} item saved for follow-up and indexing.`;
}

function formatActionLine(action: DiscoverAction) {
  return `- ${action.label} [${action.kind}](${action.href})`;
}

function getDefaultManualNotesBlock() {
  return ["## Manual Notes", "- "].join("\n");
}

function extractVibehubId(markdown: string) {
  const match = markdown.match(/^vibehub_id:\s*(.+)$/m);
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractManualNotesBlock(markdown: string | null) {
  if (!markdown) return getDefaultManualNotesBlock();

  const manualBlockMatch = markdown.match(
    new RegExp(`${MANUAL_SECTION_START}\\n([\\s\\S]*?)\\n${MANUAL_SECTION_END}`)
  );
  if (manualBlockMatch?.[1]?.trim()) {
    return manualBlockMatch[1].trimEnd();
  }

  const legacyRelatedNotesMatch = markdown.match(/\n## Related Notes\n([\s\S]*)$/);
  if (legacyRelatedNotesMatch) {
    const legacyBody = legacyRelatedNotesMatch[1]?.trimEnd() || "- ";
    return ["## Manual Notes", legacyBody].join("\n");
  }

  return getDefaultManualNotesBlock();
}

function buildAutoGeneratedBody(item: DiscoverItem) {
  const folderName = getFolderName(item);
  const tags = normalizeTags(item);
  const primaryUrl = getPrimaryUrl(item);
  const briefSlug = getBriefSlug(item);
  const whyItMatters = getWhyItMatters(item, folderName);
  const actionLines = item.actions.length > 0 ? item.actions.map(formatActionLine).join("\n") : "- 없음";
  const tagLines = tags.length > 0 ? tags.map((tag) => `#${tag.replace(/\s+/g, "-")}`).join(" ") : "- 없음";
  const relatedBrief = briefSlug ? `- /brief/${briefSlug}` : "- 없음";

  return `# ${item.title}

## Summary
${item.summary}

## Why It Matters
${whyItMatters}

## Actions
${actionLines}

## Related Brief
${relatedBrief}

## Tags
${tagLines}
`;
}

function buildDiscoverMarkdown(item: DiscoverItem, syncedAt: string, manualNotesBlock: string) {
  const tags = normalizeTags(item);
  const primaryUrl = getPrimaryUrl(item);
  const folderName = getFolderName(item);
  const briefSlug = getBriefSlug(item);
  const whyItMatters = getWhyItMatters(item, folderName);
  const actionKinds = getActionKinds(item);

  return `---
vibehub_id: ${toYamlString(item.id)}
title: ${toYamlString(item.title)}
category: ${toYamlString(item.category)}
status: ${toYamlString(item.status)}
folder_name: ${toYamlString(folderName)}
tags: ${JSON.stringify(tags)}
source: ${toYamlString("vibehub-discover")}
primary_url: ${toYamlString(primaryUrl)}
action_kinds: ${JSON.stringify(actionKinds)}
brief_slug: ${briefSlug ? toYamlString(briefSlug) : "null"}
why_it_matters: ${toYamlString(whyItMatters)}
synced_at: ${toYamlString(syncedAt)}
exported_at: ${toYamlString(syncedAt)}
highlighted: ${item.highlighted}
---

${AUTO_SECTION_START}
${buildAutoGeneratedBody(item)}
${AUTO_SECTION_END}

${MANUAL_SECTION_START}
${manualNotesBlock.trimEnd()}
${MANUAL_SECTION_END}
`;
}

function extractFrontmatterString(markdown: string, key: string) {
  const match = markdown.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return null;

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function extractFrontmatterBoolean(markdown: string, key: string) {
  const match = markdown.match(new RegExp(`^${key}:\\s*(true|false)$`, "m"));
  if (!match) return null;
  return match[1] === "true";
}

async function buildFolderIndexMarkdown(folderName: string, folderPath: string) {
  const entries = await readdir(folderPath, { withFileTypes: true });
  const notes = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "_Index.md")
      .map(async (entry) => {
        const markdown = await readFile(path.join(folderPath, entry.name), "utf8");
        return {
          fileName: entry.name.replace(/\.md$/, ""),
          title: extractFrontmatterString(markdown, "title") ?? entry.name.replace(/\.md$/, ""),
          status: extractFrontmatterString(markdown, "status") ?? "unknown",
          highlighted: extractFrontmatterBoolean(markdown, "highlighted") ?? false
        };
      })
  );

  notes.sort((left, right) => {
    if (left.highlighted !== right.highlighted) return left.highlighted ? -1 : 1;
    return left.title.localeCompare(right.title);
  });

  const noteLines = notes.length > 0
    ? notes.map((note) => `- [[${note.fileName}]] · ${note.status}`).join("\n")
    : "- 없음";

  return `# ${folderName} Index

## Count
- ${notes.length} notes

## Notes
${noteLines}
`;
}

async function generateRadarIndexes(options: Required<DiscoverObsidianExportOptions>) {
  const radarRootPath = path.join(options.vaultRoot, options.discoverRoot);
  await mkdir(radarRootPath, { recursive: true });

  const rootEntries = await Promise.all(
    EXPORTED_DISCOVER_FOLDERS.map(async (folderName) => {
      const folderPath = path.join(radarRootPath, folderName);

      try {
        const markdown = await buildFolderIndexMarkdown(folderName, folderPath);
        await writeFile(path.join(folderPath, "_Index.md"), markdown, "utf8");

        const fileCount = (await readdir(folderPath, { withFileTypes: true }))
          .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "_Index.md").length;

        return {
          folderName,
          fileCount,
          indexPath: path.join(options.discoverRoot, folderName, "_Index.md")
        };
      } catch {
        return null;
      }
    })
  );

  const existingFolders = rootEntries.flatMap((entry) => (entry && entry.fileCount > 0 ? [entry] : []));
  const rootMarkdown = `# Radar Index

## Folders
${existingFolders.length > 0
    ? existingFolders.map((entry) => `- [[${entry.folderName}/_Index]] · ${entry.fileCount} notes`).join("\n")
    : "- 없음"}
`;

  const rootIndexPath = path.join(options.discoverRoot, "_Index.md");
  await writeFile(path.join(radarRootPath, "_Index.md"), rootMarkdown, "utf8");

  return [rootIndexPath, ...existingFolders.map((entry) => entry.indexPath)];
}

export function getDefaultDiscoverObsidianExportOptions(): Required<DiscoverObsidianExportOptions> {
  return {
    vaultRoot: process.env.OBSIDIAN_VAULT_ROOT?.trim() || DEFAULT_OBSIDIAN_VAULT_ROOT,
    discoverRoot: process.env.OBSIDIAN_DISCOVER_ROOT?.trim() || DEFAULT_OBSIDIAN_DISCOVER_ROOT,
    source: "supabase"
  };
}

async function findExistingNotePathByItemId(
  itemId: string,
  options: Required<DiscoverObsidianExportOptions>
) {
  for (const folderName of EXPORTED_DISCOVER_FOLDERS) {
    const absoluteFolderPath = path.join(options.vaultRoot, options.discoverRoot, folderName);

    let entries: Dirent[];
    try {
      entries = await readdir(absoluteFolderPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const absoluteFilePath = path.join(absoluteFolderPath, entry.name);

      try {
        const markdown = await readFile(absoluteFilePath, "utf8");
        if (extractVibehubId(markdown) === itemId) {
          return path.join(options.discoverRoot, folderName, entry.name);
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

async function upsertDiscoverNote(
  item: DiscoverItem,
  options: Required<DiscoverObsidianExportOptions>
): Promise<DiscoverObsidianExportResult> {
  if (!EXPORTED_DISCOVER_CATEGORIES.has(item.category)) {
    return {
      discoverItemId: item.id,
      title: item.title,
      category: item.category,
      folderName: "Skipped",
      filePath: "",
      status: "skipped",
      reason: `Category ${item.category} is not exported in phase 1.`
    };
  }

  const folderName = getFolderName(item);
  const relativeFolderPath = path.join(options.discoverRoot, folderName);
  const relativeFilePath = path.join(relativeFolderPath, slugToFileName(item.slug));
  const absoluteFolderPath = path.join(options.vaultRoot, relativeFolderPath);
  const absoluteFilePath = path.join(options.vaultRoot, relativeFilePath);
  const existingRelativeFilePath = await findExistingNotePathByItemId(item.id, options);

  try {
    await mkdir(absoluteFolderPath, { recursive: true });

    let existed = Boolean(existingRelativeFilePath);
    let existingMarkdown: string | null = null;
    if (existingRelativeFilePath) {
      existingMarkdown = await readFile(path.join(options.vaultRoot, existingRelativeFilePath), "utf8");
    }

    if (!existed) {
      try {
        const targetMarkdown = await readFile(absoluteFilePath, "utf8");
        const targetVibehubId = extractVibehubId(targetMarkdown);

        if (targetVibehubId && targetVibehubId !== item.id) {
          return {
            discoverItemId: item.id,
            title: item.title,
            category: item.category,
            folderName,
            filePath: relativeFilePath,
            status: "failed",
            reason: `Target file is already owned by ${targetVibehubId}.`
          };
        }

        existingMarkdown = targetMarkdown;
        existed = targetVibehubId === item.id || Boolean(targetMarkdown);
      } catch {
        existed = false;
      }
    }

    if (existingRelativeFilePath && existingRelativeFilePath !== relativeFilePath) {
      try {
        const targetMarkdown = await readFile(absoluteFilePath, "utf8");
        const targetVibehubId = extractVibehubId(targetMarkdown);

        if (targetVibehubId && targetVibehubId !== item.id) {
          return {
            discoverItemId: item.id,
            title: item.title,
            category: item.category,
            folderName,
            filePath: relativeFilePath,
            status: "failed",
            reason: `Target file is already owned by ${targetVibehubId}.`
          };
        }
      } catch {
        // New slug path is free to use.
      }
    }

    const markdown = buildDiscoverMarkdown(
      item,
      new Date().toISOString(),
      extractManualNotesBlock(existingMarkdown)
    );

    await writeFile(absoluteFilePath, markdown, "utf8");

    if (existingRelativeFilePath && existingRelativeFilePath !== relativeFilePath) {
      await unlink(path.join(options.vaultRoot, existingRelativeFilePath)).catch(() => undefined);
    }

    return {
      discoverItemId: item.id,
      title: item.title,
      category: item.category,
      folderName,
      filePath: relativeFilePath,
      status: existed ? "updated" : "created"
    };
  } catch (error) {
    return {
      discoverItemId: item.id,
      title: item.title,
      category: item.category,
      folderName,
      filePath: relativeFilePath,
      status: "failed",
      reason: error instanceof Error ? error.message : String(error)
    };
  }
}

function summarizeResults(
  results: DiscoverObsidianExportResult[],
  options: Required<DiscoverObsidianExportOptions>,
  indexPaths: string[]
): DiscoverObsidianExportSummary {
  const folderCounts = new Map<string, number>();
  const savedPaths = results
    .filter((result) => result.status === "created" || result.status === "updated")
    .map((result) => result.filePath)
    .sort((left, right) => left.localeCompare(right))
    .slice(0, 5);

  for (const result of results) {
    if (result.status === "created" || result.status === "updated") {
      folderCounts.set(result.folderName, (folderCounts.get(result.folderName) ?? 0) + 1);
    }
  }

  return {
    vaultRoot: options.vaultRoot,
    source: options.source,
    results,
    savedCount: results.filter((result) => result.status === "created" || result.status === "updated").length,
    createdCount: results.filter((result) => result.status === "created").length,
    updatedCount: results.filter((result) => result.status === "updated").length,
    skippedCount: results.filter((result) => result.status === "skipped").length,
    failedCount: results.filter((result) => result.status === "failed").length,
    folderCounts: Array.from(folderCounts.entries())
      .map(([folderName, count]) => ({ folderName, count }))
      .sort((left, right) => left.folderName.localeCompare(right.folderName)),
    savedPaths,
    indexPaths
  };
}

export async function exportDiscoverItemsToObsidian(
  items: DiscoverItem[],
  options: DiscoverObsidianExportOptions = {}
): Promise<DiscoverObsidianExportSummary> {
  const resolvedOptions = {
    ...getDefaultDiscoverObsidianExportOptions(),
    source: options.source ?? "supabase",
    ...options
  };
  const results: DiscoverObsidianExportResult[] = [];

  for (const item of items) {
    results.push(await upsertDiscoverNote(item, resolvedOptions));
  }

  const indexPaths = await generateRadarIndexes(resolvedOptions);
  return summarizeResults(results, resolvedOptions, indexPaths);
}
