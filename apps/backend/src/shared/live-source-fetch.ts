import { createHash } from "node:crypto";

import { Defuddle } from "defuddle/node";
import { parseHTML } from "linkedom";

import type { IngestSourceFixture } from "./ingest-source-fixtures";
import { runBriefDiscoverCycle, type BriefDiscoverCycleReport } from "./brief-discover-cycle";
import { normalizeDiscoverCopy } from "./discover-copy-normalizer";
import type { LiveSourceDefinition } from "./live-source-registry";
import { liveSourceRegistry, loadSourcesFromDb } from "./live-source-registry";
import { isValidCoverImageUrl } from "./image-url-validator";
import { parseGitHubReleaseItems, parseRssItems } from "./live-source-parse";

export type LiveItemParserName = "rss-summary" | "defuddle";
export type LiveItemParseStatus = "summary-only" | "content-enriched" | "content-failed";
const ARTICLE_FETCH_TIMEOUT_MS = 10_000;

export interface LiveFetchedItem {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceTier: "auto-safe" | "render-required" | "manual-review-required";
  title: string;
  url: string;
  publishedAt: string | null;
  parsedSummary: string;
  contentMarkdown?: string;
  parserName: LiveItemParserName;
  parseStatus: LiveItemParseStatus;
  contentType: IngestSourceFixture["contentType"];
  tags: string[];
  imageUrl?: string;
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
  sources?: LiveSourceDefinition[];
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
    tags: item.tags,
    parseStatus: item.parseStatus
  };
}

function createItemId(sourceId: string, url: string) {
  return `live-${sourceId}-${createHash("sha1").update(url).digest("hex").slice(0, 10)}`;
}

function shouldEnrichArticle(source: LiveSourceDefinition) {
  return source.fetchKind === "rss" && source.contentType === "article";
}

const OG_IMAGE_FETCH_TIMEOUT_MS = 6_000;
const OG_IMAGE_MAX_BYTES = 16_384;

/** Lightweight og:image extraction — reads only the first 16KB of HTML */
async function fetchOgImageOnly(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(OG_IMAGE_FETCH_TIMEOUT_MS),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "vibehub-media"
      }
    });
    if (!response.ok || !response.body) return null;

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;

    while (totalBytes < OG_IMAGE_MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      totalBytes += value.length;
    }
    reader.cancel();

    const html = new TextDecoder().decode(Buffer.concat(chunks));
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const candidate = match?.[1]?.trim() || null;
    return candidate && isValidCoverImageUrl(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

/** summary가 부실한지 판단 — "Comments" 한 단어이거나 30자 미만 */
function isThinSummary(summary: string) {
  const trimmed = summary.trim();
  return trimmed.length < 30 || /^comments\.?$/i.test(trimmed);
}

export async function enrichArticleContent(url: string) {
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

  // og:image 추출 — HTML을 이미 fetch했으므로 추가 요청 없음
  const ogImageMeta = dom.document.querySelector('meta[property="og:image"]');
  const rawOgImage = ogImageMeta?.getAttribute("content")?.trim() || null;
  const ogImageUrl = rawOgImage && isValidCoverImageUrl(rawOgImage) ? rawOgImage : null;

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

  return { contentMarkdown, ogImageUrl };
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
      const copy = normalizeDiscoverCopy({
        title: item.title,
        summary: item.summary,
        url: item.url,
        sourceName: source.sourceName
      });

      let ogImageUrl: string | null = null;
      // HN 등 RSS description이 부실한 소스도 enrichment 대상에 포함
      const needsEnrich = shouldEnrichArticle(source) || isThinSummary(copy.summary);
      if (needsEnrich) {
        try {
          const enriched = await enrichArticleContent(item.url);
          contentMarkdown = enriched.contentMarkdown;
          ogImageUrl = enriched.ogImageUrl;
          parserName = "defuddle";
          parseStatus = "content-enriched";
        } catch {
          parseStatus = "content-failed";
        }
      }

      // RSS에도 enrichment에도 이미지 없으면 경량 og:image 추출 시도
      if (!item.imageUrl && !ogImageUrl && !needsEnrich) {
        ogImageUrl = await fetchOgImageOnly(item.url);
      }

      // enriched markdown이 있으면 summary를 본문 첫 부분으로 대체
      const enrichedSummary = contentMarkdown && isThinSummary(copy.summary)
        ? summarizeText(normalizeMarkdownPreview(contentMarkdown), 180)
        : null;

      // 최종 이미지 URL: RSS → og:image → undefined, 검증 게이트 적용
      const rawImageUrl = item.imageUrl ?? ogImageUrl ?? undefined;
      const validatedImageUrl = rawImageUrl && isValidCoverImageUrl(rawImageUrl) ? rawImageUrl : undefined;

      items.push({
        id: createItemId(source.id, item.url),
        sourceId: source.id,
        sourceName: source.sourceName,
        sourceTier: source.sourceTier,
        title: copy.title,
        url: item.url,
        publishedAt: item.publishedAt,
        parsedSummary: enrichedSummary || summarizeText(copy.summary),
        contentMarkdown,
        parserName,
        parseStatus,
        contentType: source.contentType,
        tags: inferTags(source, copy.title, copy.summary),
        imageUrl: validatedImageUrl
      });
    }

    return items;
  }

  const response = await fetch(`https://api.github.com/repos/${source.owner}/${source.repo}/releases`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "vibehub-media" }
  });
  if (!response.ok) throw new Error(`github releases fetch failed: ${response.status}`);
  const payload = await response.text();

  return parseGitHubReleaseItems(payload).slice(0, source.maxItems).map((item) => {
    const copy = normalizeDiscoverCopy({
      title: item.title,
      summary: item.summary,
      url: item.url,
      sourceName: source.sourceName
    });

    return {
      id: createItemId(source.id, item.url),
      sourceId: source.id,
      sourceName: source.sourceName,
      sourceTier: source.sourceTier,
      title: copy.title,
      url: item.url,
      publishedAt: item.publishedAt,
      parsedSummary: summarizeText(copy.summary),
      parserName: "rss-summary" as const,
      parseStatus: "summary-only" as const,
      contentType: source.contentType,
      tags: inferTags(source, copy.title, copy.summary)
    };
  });
}

export async function runLiveSourceFetch(
  sources?: LiveSourceDefinition[],
  performedAt = new Date().toISOString()
): Promise<LiveSourceFetchReport> {
  // DB SSOT: 인자 없으면 DB에서 로드, 실패 시 하드코딩 fallback
  if (!sources) {
    sources = await loadSourcesFromDb();
  }
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
    sources,
    sourceStatuses,
    items,
    fixtures,
    cycleReport: runBriefDiscoverCycle(fixtures, performedAt)
  };
}
