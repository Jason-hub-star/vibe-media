import { createHash } from "node:crypto";

import type { ImportedToolCandidateDraft } from "./tool-candidate-import-screening";
import {
  loadToolCandidateSourcesFromDb,
  type ToolCandidateSourceDefinition,
} from "./tool-candidate-source-registry";

function toSlugSeed(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function compact(value: string | null | undefined, maxLength = 200) {
  const normalized = (value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function inferLinks(url: string, homepage?: string | null) {
  const canonicalHomepage = homepage?.trim() || null;
  const githubUrl = /github\.com/.test(url) ? url : /github\.com/.test(canonicalHomepage ?? "") ? canonicalHomepage : null;
  const websiteUrl = canonicalHomepage && !/github\.com/.test(canonicalHomepage) ? canonicalHomepage : url;

  return { websiteUrl, githubUrl };
}

async function fetchHnShow(
  source: ToolCandidateSourceDefinition,
): Promise<ImportedToolCandidateDraft[]> {
  const storiesRes = await fetch(
    "https://hacker-news.firebaseio.com/v0/showstories.json",
  );
  if (!storiesRes.ok) {
    throw new Error(`hn show stories fetch failed: ${storiesRes.status}`);
  }

  const storyIds = (await storiesRes.json()) as number[];
  const drafts: ImportedToolCandidateDraft[] = [];

  for (const storyId of storyIds.slice(0, source.maxItems * 2)) {
    if (drafts.length >= source.maxItems) break;

    const itemRes = await fetch(
      `https://hacker-news.firebaseio.com/v0/item/${storyId}.json`,
    );
    if (!itemRes.ok) continue;
    const item = (await itemRes.json()) as {
      id: number;
      title?: string;
      url?: string;
      text?: string;
      by?: string;
      type?: string;
    };

    if (item.type !== "story" || !item.title || !item.url) continue;
    if (!item.title.startsWith("Show HN:")) continue;

    drafts.push({
      title: item.title.replace(/^Show HN:\s*/i, "").trim(),
      summary: compact(item.text || item.title),
      description: item.text || `Imported from Show HN by ${item.by ?? "unknown"}.`,
      websiteUrl: item.url,
      tags: [...source.defaultTags],
      sourceId: source.id,
      sourceName: source.sourceName,
      sourceEntryUrl: `https://news.ycombinator.com/item?id=${item.id}`,
      sourceEntryExternalId: String(item.id),
    });
  }

  return drafts;
}

async function fetchGitHubSearch(
  source: ToolCandidateSourceDefinition,
): Promise<ImportedToolCandidateDraft[]> {
  const query = encodeURIComponent(source.githubSearchQuery ?? "");
  const response = await fetch(
    `https://api.github.com/search/repositories?q=${query}&sort=updated&order=desc&per_page=${source.maxItems}`,
    {
      headers: {
        accept: "application/vnd.github+json",
        "user-agent": "vibehub-media",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`github search fetch failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    items?: Array<{
      id: number;
      name: string;
      full_name: string;
      description: string | null;
      html_url: string;
      homepage: string | null;
      topics?: string[];
    }>;
  };

  return (payload.items ?? []).map((item) => {
    const links = inferLinks(item.html_url, item.homepage);
    return {
      title: item.name,
      summary: compact(item.description || `${item.full_name} repository`),
      description:
        item.description || `Imported from GitHub search result ${item.full_name}.`,
      websiteUrl: links.websiteUrl,
      githubUrl: links.githubUrl,
      tags: [...source.defaultTags, ...(item.topics ?? []).slice(0, 3)],
      sourceId: source.id,
      sourceName: source.sourceName,
      sourceEntryUrl: item.html_url,
      sourceEntryExternalId: String(item.id),
    };
  });
}

async function fetchRssDirectory(
  source: ToolCandidateSourceDefinition,
): Promise<ImportedToolCandidateDraft[]> {
  if (!source.feedUrl) return [];
  const response = await fetch(source.feedUrl, {
    headers: { accept: "application/rss+xml, application/xml, text/xml" },
  });
  if (!response.ok) {
    throw new Error(`rss directory fetch failed: ${response.status}`);
  }

  const xml = await response.text();
  const entryMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(
    0,
    source.maxItems,
  );

  return (entryMatches
    .map((match) => {
      const itemXml = match[1];
      const title = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.slice(1).find(Boolean)?.trim();
      const link = itemXml.match(/<link>(.*?)<\/link>/)?.[1]?.trim();
      const description = itemXml
        .match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)
        ?.slice(1)
        .find(Boolean)
        ?.trim();

      if (!title || !link) return null;

      return {
        title,
        summary: compact(description || title),
        description: description || `Imported from ${source.sourceName}.`,
        websiteUrl: link,
        tags: [...source.defaultTags],
        sourceId: source.id,
        sourceName: source.sourceName,
        sourceEntryUrl: link,
        sourceEntryExternalId: createHash("sha1").update(`${source.id}:${link}`).digest("hex"),
      } satisfies ImportedToolCandidateDraft;
    })
    .filter(Boolean)) as ImportedToolCandidateDraft[];
}

async function fetchSource(
  source: ToolCandidateSourceDefinition,
): Promise<ImportedToolCandidateDraft[]> {
  if (source.fetchKind === "hn-show") {
    return fetchHnShow(source);
  }

  if (source.fetchKind === "github-search") {
    return fetchGitHubSearch(source);
  }

  return fetchRssDirectory(source);
}

export async function fetchImportedToolCandidates() {
  const sources = await loadToolCandidateSourcesFromDb();
  const candidates: ImportedToolCandidateDraft[] = [];
  const sourceStatuses: Array<{
    sourceId: string;
    sourceName: string;
    status: "fetched" | "failed" | "skipped";
    itemCount: number;
    note: string | null;
  }> = [];

  for (const source of sources) {
    if (!source.enabled) {
      sourceStatuses.push({
        sourceId: source.id,
        sourceName: source.sourceName,
        status: "skipped",
        itemCount: 0,
        note: source.disableReason ?? "disabled",
      });
      continue;
    }

    try {
      const rows = await fetchSource(source);
      candidates.push(...rows);
      sourceStatuses.push({
        sourceId: source.id,
        sourceName: source.sourceName,
        status: "fetched",
        itemCount: rows.length,
        note: null,
      });
    } catch (error) {
      sourceStatuses.push({
        sourceId: source.id,
        sourceName: source.sourceName,
        status: "failed",
        itemCount: 0,
        note: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    performedAt: new Date().toISOString(),
    candidates,
    sourceStatuses,
  };
}
