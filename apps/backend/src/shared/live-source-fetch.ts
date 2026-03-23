import { createHash } from "node:crypto";

import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";

import type { IngestSourceFixture } from "./ingest-source-fixtures";
import { runBriefDiscoverCycle, type BriefDiscoverCycleReport } from "./brief-discover-cycle";
import type { LiveSourceDefinition } from "./live-source-registry";
import { liveSourceRegistry } from "./live-source-registry";
import { parseGitHubReleaseItems, parseRssItems } from "./live-source-parse";

export type LiveItemParserName = "rss-summary" | "defuddle";
export type LiveItemParseStatus = "summary-only" | "content-enriched" | "content-failed";
const ARTICLE_FETCH_TIMEOUT_MS = 10_000;

export interface LiveFetchedItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceTier: "auto-safe";
  title: string;
  url: string;
  publishedAt: string | null;
  parsedSummary: string;
  contentMarkdown?: string;
  parserName: LiveItemParserName;
  parseStatus: LiveItemParseStatus;
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

function normalizeMarkdownPreview(value: string) {
  return value
    .replace(/[`*_>#-]+/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCycleSummary(item: LiveFetchedItem) {
  if (!item.contentMarkdown) {
    return item.parsedSummary;
  }

  const markdownPreview = summarizeText(normalizeMarkdownPreview(item.contentMarkdown), 240);
  if (!markdownPreview) {
    return item.parsedSummary;
  }

  if (markdownPreview.includes(item.parsedSummary)) {
    return markdownPreview;
  }

  return summarizeText(`${item.parsedSummary} ${markdownPreview}`, 240);
}

function shouldSuppressDefuddleLog(args: unknown[]) {
  const text = args.map((value) => String(value)).join(" ");
  return text.includes("without img") || text.includes("Defuddle Error processing document");
}

async function runDefuddleQuietly<T>(run: () => Promise<T>) {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    if (!shouldSuppressDefuddleLog(args)) {
      originalLog(...args);
    }
  };
  console.warn = (...args: unknown[]) => {
    if (!shouldSuppressDefuddleLog(args)) {
      originalWarn(...args);
    }
  };
  console.error = (...args: unknown[]) => {
    if (!shouldSuppressDefuddleLog(args)) {
      originalError(...args);
    }
  };

  try {
    return await run();
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  }
}

function toFixture(item: LiveFetchedItem): IngestSourceFixture {
  return {
    id: item.id,
    sourceName: item.sourceName,
    sourceTier: item.sourceTier,
    title: item.title,
    contentType: item.contentType,
    parsedSummary: buildCycleSummary(item),
    tags: item.tags
  };
}

function createItemId(sourceId: string, url: string) {
  return `live-${sourceId}-${createHash("sha1").update(url).digest("hex").slice(0, 10)}`;
}

function shouldEnrichArticle(source: LiveSourceDefinition) {
  return source.fetchKind === "rss" && source.contentType === "article";
}

async function enrichArticleContent(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(ARTICLE_FETCH_TIMEOUT_MS),
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "vibehub-media"
    }
  });

  if (!response.ok) {
    throw new Error(`article fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const dom = parseHTML(html) as ReturnType<typeof parseHTML> & {
    getComputedStyle?: (element: Element) => CSSStyleDeclaration;
  };

  if (typeof dom.getComputedStyle !== "function") {
    dom.getComputedStyle = () =>
      new Proxy(
        { getPropertyValue: () => "" },
        {
          get(target, property) {
            if (property in target) {
              return target[property as keyof typeof target];
            }
            return "";
          }
        }
      ) as unknown as CSSStyleDeclaration;
  }

  const result = await runDefuddleQuietly(() =>
    Defuddle(dom.document, url, {
      separateMarkdown: true,
      useAsync: false
    })
  );
  const contentMarkdown = result.contentMarkdown?.trim();

  if (!contentMarkdown) {
    throw new Error("defuddle returned empty markdown");
  }

  return contentMarkdown;
}

async function fetchSource(source: LiveSourceDefinition): Promise<LiveFetchedItem[]> {
  if (source.fetchKind === "rss") {
    const response = await fetch(source.feedUrl, { headers: { accept: "application/rss+xml, application/xml, text/xml" } });
    if (!response.ok) throw new Error(`rss fetch failed: ${response.status}`);
    const xml = await response.text();

    const items: LiveFetchedItem[] = [];

    for (const item of parseRssItems(xml).slice(0, source.maxItems)) {
      let contentMarkdown: string | undefined;
      let parserName: LiveItemParserName = "rss-summary";
      let parseStatus: LiveItemParseStatus = "summary-only";

      if (shouldEnrichArticle(source)) {
        try {
          contentMarkdown = await enrichArticleContent(item.url);
          parserName = "defuddle";
          parseStatus = "content-enriched";
        } catch {
          parseStatus = "content-failed";
        }
      }

      items.push({
        id: createItemId(source.id, item.url),
        sourceId: source.id,
        sourceName: source.sourceName,
        sourceTier: source.sourceTier,
        title: item.title,
        url: item.url,
        publishedAt: item.publishedAt,
        parsedSummary: summarizeText(item.summary),
        contentMarkdown,
        parserName,
        parseStatus,
        contentType: source.contentType,
        tags: inferTags(source, item.title, item.summary)
      });
    }

    return items;
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
    parserName: "rss-summary" as const,
    parseStatus: "summary-only" as const,
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
