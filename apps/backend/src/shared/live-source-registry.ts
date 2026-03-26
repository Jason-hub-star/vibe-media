import type { InboxItemContentType } from "@vibehub/content-contracts";

import { createSupabaseSql, getSupabaseDbUrl } from "./supabase-postgres";

export type LiveSourceFetchKind = "rss" | "github-releases";

interface LiveSourceBase {
  id: string;
  sourceName: string;
  sourceTier: "auto-safe" | "render-required" | "manual-review-required";
  fetchKind: LiveSourceFetchKind;
  href: string;
  contentType: InboxItemContentType;
  defaultTags: string[];
  maxItems: number;
  enabled: boolean;
  disableReason?: string;
}

export interface LiveRssSource extends LiveSourceBase {
  fetchKind: "rss";
  feedUrl: string;
}

export interface LiveGitHubReleasesSource extends LiveSourceBase {
  fetchKind: "github-releases";
  owner: string;
  repo: string;
}

export type LiveSourceDefinition = LiveRssSource | LiveGitHubReleasesSource;

/** 하드코딩 fallback — DB 연결 실패 시에만 사용 */
const hardcodedFallback: LiveSourceDefinition[] = [
  {
    id: "openai-news-rss",
    sourceName: "OpenAI News",
    sourceTier: "auto-safe",
    fetchKind: "rss",
    href: "https://openai.com/news/",
    feedUrl: "https://openai.com/news/rss.xml",
    contentType: "article",
    defaultTags: ["launch", "release", "ecosystem"],
    maxItems: 3,
    enabled: true
  },
  {
    id: "google-ai-blog-rss",
    sourceName: "Google AI Blog",
    sourceTier: "auto-safe",
    fetchKind: "rss",
    href: "https://blog.google/innovation-and-ai/technology/ai/",
    feedUrl: "https://blog.google/innovation-and-ai/technology/ai/rss/",
    contentType: "article",
    defaultTags: ["analysis", "research"],
    maxItems: 3,
    enabled: true
  },
  {
    id: "github-releases-openai-node",
    sourceName: "GitHub Releases",
    sourceTier: "auto-safe",
    fetchKind: "github-releases",
    href: "https://github.com/openai/openai-node/releases",
    owner: "openai",
    repo: "openai-node",
    contentType: "repo",
    defaultTags: ["repo", "release"],
    maxItems: 3,
    enabled: true
  }
];

/** 하위호환 — 기존 코드가 import하는 이름 유지 */
export const liveSourceRegistry: LiveSourceDefinition[] = hardcodedFallback;

interface SupabaseFetchSourceRow {
  id: string;
  name: string;
  kind: string;
  base_url: string;
  source_tier: string;
  enabled: boolean;
  feed_url: string | null;
  content_type: string;
  default_tags: string[];
  max_items: number;
  fetch_kind: string;
  github_owner: string | null;
  github_repo: string | null;
}

function mapRowToDefinition(row: SupabaseFetchSourceRow): LiveSourceDefinition | null {
  const base = {
    id: row.id,
    sourceName: row.name,
    sourceTier: row.source_tier as LiveSourceDefinition["sourceTier"],
    href: row.base_url,
    contentType: row.content_type as InboxItemContentType,
    defaultTags: row.default_tags ?? [],
    maxItems: row.max_items,
    enabled: row.enabled
  };

  if (row.fetch_kind === "github-releases" && row.github_owner && row.github_repo) {
    return { ...base, fetchKind: "github-releases", owner: row.github_owner, repo: row.github_repo };
  }

  if (row.feed_url) {
    return { ...base, fetchKind: "rss", feedUrl: row.feed_url };
  }

  // feed_url이 없는 RSS 소스는 skip
  return null;
}

/**
 * Supabase sources 테이블에서 live-fetch 대상 소스를 읽는다.
 * DB 연결 실패 시 하드코딩 fallback을 반환한다.
 */
export async function loadSourcesFromDb(): Promise<LiveSourceDefinition[]> {
  if (!getSupabaseDbUrl()) {
    console.log("[source-registry] SUPABASE_DB_URL 없음 → 하드코딩 fallback 사용 (3개)");
    return hardcodedFallback;
  }

  const sql = createSupabaseSql();
  try {
    const rows = await sql<SupabaseFetchSourceRow[]>`
      SELECT id, name, kind, base_url, source_tier, enabled,
             feed_url, content_type, default_tags, max_items, fetch_kind,
             github_owner, github_repo
      FROM public.sources
      WHERE enabled = true
      ORDER BY name ASC
    `;

    const definitions = rows.map(mapRowToDefinition).filter((d): d is LiveSourceDefinition => d !== null);

    if (definitions.length === 0) {
      console.log("[source-registry] DB에서 유효한 소스 0개 → 하드코딩 fallback 사용");
      return hardcodedFallback;
    }

    console.log(`[source-registry] DB에서 소스 ${definitions.length}개 로드 (RSS ${definitions.filter(d => d.fetchKind === "rss").length}개, GitHub ${definitions.filter(d => d.fetchKind === "github-releases").length}개)`);
    return definitions;
  } catch (error) {
    console.error("[source-registry] DB 읽기 실패 → 하드코딩 fallback 사용:", error instanceof Error ? error.message : error);
    return hardcodedFallback;
  } finally {
    await sql.end();
  }
}
