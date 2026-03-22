import { createHash } from "node:crypto";

import type { IngestSourceFixture } from "./ingest-source-fixtures";
import { runBriefDiscoverCycle, type BriefDiscoverCycleReport } from "./brief-discover-cycle";
import type { LiveSourceDefinition } from "./live-source-registry";
import { liveSourceRegistry } from "./live-source-registry";
import { parseGitHubReleaseItems, parseRssItems } from "./live-source-parse";

export interface LiveFetchedItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceTier: "auto-safe";
  title: string;
  url: string;
  publishedAt: string | null;
  parsedSummary: string;
  contentType: IngestSourceFixture["contentType"];
  tags: string[];
}

export interface LiveSourceFetchStatus {
  sourceId: string;
  sourceName: string;
  status: "fetched" | "skipped" | "failed";
  itemCount: number;
  note: string | null;
}

export interface LiveSourceFetchReport {
  performedAt: string;
  sourceStatuses: LiveSourceFetchStatus[];
  items: LiveFetchedItem[];
  fixtures: IngestSourceFixture[];
  cycleReport: BriefDiscoverCycleReport;
}

function summarizeText(value: string, maxLength = 180) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1).trim()}...`;
}

function inferTags(source: LiveSourceDefinition, title: string, summary: string) {
  const tags = new Set(source.defaultTags);
  const haystack = `${title} ${summary}`.toLowerCase();

  if (/\b(sdk|agent sdk|responses|integration)\b/.test(haystack)) tags.add("sdk");
  if (/\b(api|changelog|migration)\b/.test(haystack)) tags.add("api");
  if (/\b(release|launch|rollout|version|v\d+)\b/.test(haystack)) tags.add("release");
  if (/\b(research|paper|benchmark|evaluation)\b/.test(haystack)) tags.add("research");
  if (source.contentType === "repo") tags.add("repo");

  return Array.from(tags);
}

function toFixture(item: LiveFetchedItem): IngestSourceFixture {
  return {
    id: item.id,
    sourceName: item.sourceName,
    sourceTier: item.sourceTier,
    title: item.title,
    contentType: item.contentType,
    parsedSummary: item.parsedSummary,
    tags: item.tags
  };
}

function createItemId(sourceId: string, url: string) {
  return `live-${sourceId}-${createHash("sha1").update(url).digest("hex").slice(0, 10)}`;
}

async function fetchSource(source: LiveSourceDefinition): Promise<LiveFetchedItem[]> {
  if (source.fetchKind === "rss") {
    const response = await fetch(source.feedUrl, { headers: { accept: "application/rss+xml, application/xml, text/xml" } });
    if (!response.ok) throw new Error(`rss fetch failed: ${response.status}`);
    const xml = await response.text();

    return parseRssItems(xml).slice(0, source.maxItems).map((item) => ({
      id: createItemId(source.id, item.url),
      sourceId: source.id,
      sourceName: source.sourceName,
      sourceTier: source.sourceTier,
      title: item.title,
      url: item.url,
      publishedAt: item.publishedAt,
      parsedSummary: summarizeText(item.summary),
      contentType: source.contentType,
      tags: inferTags(source, item.title, item.summary)
    }));
  }

  const response = await fetch(`https://api.github.com/repos/${source.owner}/${source.repo}/releases`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "vibehub-media" }
  });
  if (!response.ok) throw new Error(`github releases fetch failed: ${response.status}`);
  const payload = await response.text();

  return parseGitHubReleaseItems(payload).slice(0, source.maxItems).map((item) => ({
    id: createItemId(source.id, item.url),
    sourceId: source.id,
    sourceName: source.sourceName,
    sourceTier: source.sourceTier,
    title: item.title,
    url: item.url,
    publishedAt: item.publishedAt,
    parsedSummary: summarizeText(item.summary),
    contentType: source.contentType,
    tags: inferTags(source, item.title, item.summary)
  }));
}

export async function runLiveSourceFetch(
  sources: LiveSourceDefinition[] = liveSourceRegistry,
  performedAt = new Date().toISOString()
): Promise<LiveSourceFetchReport> {
  const sourceStatuses: LiveSourceFetchStatus[] = [];
  const items: LiveFetchedItem[] = [];

  for (const source of sources) {
    if (!source.enabled) {
      sourceStatuses.push({
        sourceId: source.id,
        sourceName: source.sourceName,
        status: "skipped",
        itemCount: 0,
        note: source.disableReason || "disabled"
      });
      continue;
    }

    try {
      const fetchedItems = await fetchSource(source);
      items.push(...fetchedItems);
      sourceStatuses.push({
        sourceId: source.id,
        sourceName: source.sourceName,
        status: "fetched",
        itemCount: fetchedItems.length,
        note: null
      });
    } catch (error) {
      sourceStatuses.push({
        sourceId: source.id,
        sourceName: source.sourceName,
        status: "failed",
        itemCount: 0,
        note: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const fixtures = items.map(toFixture);

  return {
    performedAt,
    sourceStatuses,
    items,
    fixtures,
    cycleReport: runBriefDiscoverCycle(fixtures, performedAt)
  };
}
