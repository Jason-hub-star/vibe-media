import type { Dirent } from "node:fs";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { DiscoverAction, DiscoverCategory, DiscoverItem } from "@vibehub/content-contracts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../../..");
const DEFAULT_OBSIDIAN_VAULT_ROOT = path.resolve(REPO_ROOT, "../jasonob");
const DEFAULT_OBSIDIAN_DISCOVER_ROOT = "Radar";
const EXPORTED_DISCOVER_CATEGORIES = new Set<DiscoverCategory>(["open_source", "skill", "plugin"]);
const EXPORTED_DISCOVER_FOLDERS = ["Open Source", "Skills", "Plugins", "GitHub Releases", "Repositories"] as const;

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
  results: DiscoverObsidianExportResult[];
  savedCount: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  folderCounts: Array<{ folderName: string; count: number }>;
  savedPaths: string[];
}

export interface DiscoverObsidianExportOptions {
  vaultRoot?: string;
  discoverRoot?: string;
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

function formatActionLine(action: DiscoverAction) {
  return `- ${action.label} [${action.kind}](${action.href})`;
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

function buildDiscoverMarkdown(item: DiscoverItem, syncedAt: string) {
  const tags = normalizeTags(item);
  const primaryUrl = getPrimaryUrl(item);
  const actionLines = item.actions.length > 0 ? item.actions.map(formatActionLine).join("\n") : "- 없음";

  return `---
vibehub_id: ${toYamlString(item.id)}
title: ${toYamlString(item.title)}
category: ${toYamlString(item.category)}
status: ${toYamlString(item.status)}
tags: ${JSON.stringify(tags)}
source: ${toYamlString("vibehub-discover")}
primary_url: ${toYamlString(primaryUrl)}
synced_at: ${toYamlString(syncedAt)}
highlighted: ${item.highlighted}
---

# ${item.title}

## Summary
${item.summary}

## Actions
${actionLines}

## Related Notes
- 
`;
}

export function getDefaultDiscoverObsidianExportOptions(): Required<DiscoverObsidianExportOptions> {
  return {
    vaultRoot: process.env.OBSIDIAN_VAULT_ROOT?.trim() || DEFAULT_OBSIDIAN_VAULT_ROOT,
    discoverRoot: process.env.OBSIDIAN_DISCOVER_ROOT?.trim() || DEFAULT_OBSIDIAN_DISCOVER_ROOT
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
  const markdown = buildDiscoverMarkdown(item, new Date().toISOString());
  const existingRelativeFilePath = await findExistingNotePathByItemId(item.id, options);

  try {
    await mkdir(absoluteFolderPath, { recursive: true });

    let existed = Boolean(existingRelativeFilePath);
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

        existed = targetVibehubId === item.id || Boolean(targetMarkdown);
      } catch {
        existed = false;
      }
    }

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
  options: Required<DiscoverObsidianExportOptions>
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
    results,
    savedCount: results.filter((result) => result.status === "created" || result.status === "updated").length,
    createdCount: results.filter((result) => result.status === "created").length,
    updatedCount: results.filter((result) => result.status === "updated").length,
    skippedCount: results.filter((result) => result.status === "skipped").length,
    failedCount: results.filter((result) => result.status === "failed").length,
    folderCounts: Array.from(folderCounts.entries())
      .map(([folderName, count]) => ({ folderName, count }))
      .sort((left, right) => left.folderName.localeCompare(right.folderName)),
    savedPaths
  };
}

export async function exportDiscoverItemsToObsidian(
  items: DiscoverItem[],
  options: DiscoverObsidianExportOptions = {}
): Promise<DiscoverObsidianExportSummary> {
  const resolvedOptions = {
    ...getDefaultDiscoverObsidianExportOptions(),
    ...options
  };
  const results: DiscoverObsidianExportResult[] = [];

  for (const item of items) {
    results.push(await upsertDiscoverNote(item, resolvedOptions));
  }

  return summarizeResults(results, resolvedOptions);
}
