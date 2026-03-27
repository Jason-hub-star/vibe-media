import { createSupabaseSql, getSupabaseDbUrl } from "./supabase-postgres";

export type ToolCandidateFetchKind = "rss" | "hn-show" | "github-search";
export type ToolCandidateSourceTier =
  | "auto-safe"
  | "render-required"
  | "manual-review-required"
  | "blocked";

export interface ToolCandidateSourceDefinition {
  id: string;
  sourceName: string;
  sourceTier: ToolCandidateSourceTier;
  pipelineLane: "tool_candidate";
  fetchKind: ToolCandidateFetchKind;
  href: string;
  defaultTags: string[];
  maxItems: number;
  enabled: boolean;
  feedUrl?: string;
  githubSearchQuery?: string;
  disableReason?: string;
}

const hardcodedFallback: ToolCandidateSourceDefinition[] = [
  {
    id: "hn-show-hn",
    sourceName: "Hacker News Show HN",
    sourceTier: "auto-safe",
    pipelineLane: "tool_candidate",
    fetchKind: "hn-show",
    href: "https://news.ycombinator.com/showhn.html",
    defaultTags: ["show-hn", "launch", "indie"],
    maxItems: 10,
    enabled: true,
  },
  {
    id: "github-search-devtools",
    sourceName: "GitHub Search: developer tools",
    sourceTier: "auto-safe",
    pipelineLane: "tool_candidate",
    fetchKind: "github-search",
    href: "https://github.com/search",
    githubSearchQuery:
      "(topic:agent OR topic:automation OR topic:developer-tools) archived:false is:public",
    defaultTags: ["github", "open-source", "tooling"],
    maxItems: 8,
    enabled: true,
  },
  {
    id: "devhunt-launches",
    sourceName: "DevHunt",
    sourceTier: "render-required",
    pipelineLane: "tool_candidate",
    fetchKind: "rss",
    href: "https://devhunt.org/",
    feedUrl: "https://devhunt.org/rss.xml",
    defaultTags: ["devtools", "launch", "community"],
    maxItems: 8,
    enabled: false,
    disableReason: "render-required",
  },
  {
    id: "leanvibe-projects",
    sourceName: "LeanVibe",
    sourceTier: "manual-review-required",
    pipelineLane: "tool_candidate",
    fetchKind: "rss",
    href: "https://leanvibe.io/",
    feedUrl: "https://leanvibe.io/rss",
    defaultTags: ["community", "projects", "manual-review"],
    maxItems: 8,
    enabled: false,
    disableReason: "manual-review-required",
  },
  {
    id: "betalist-launches",
    sourceName: "BetaList",
    sourceTier: "manual-review-required",
    pipelineLane: "tool_candidate",
    fetchKind: "rss",
    href: "https://betalist.com/",
    feedUrl: "https://betalist.com/feed",
    defaultTags: ["launch", "startup", "manual-review"],
    maxItems: 8,
    enabled: false,
    disableReason: "manual-review-required",
  },
  {
    id: "product-hunt-launches",
    sourceName: "Product Hunt",
    sourceTier: "manual-review-required",
    pipelineLane: "tool_candidate",
    fetchKind: "rss",
    href: "https://www.producthunt.com/",
    feedUrl: "https://www.producthunt.com/feed",
    defaultTags: ["launch", "manual-review", "products"],
    maxItems: 8,
    enabled: false,
    disableReason: "manual-review-required",
  },
];

interface SupabaseToolCandidateSourceRow {
  id: string;
  name: string;
  base_url: string;
  source_tier: string;
  pipeline_lane: string;
  enabled: boolean;
  feed_url: string | null;
  default_tags: string[];
  max_items: number;
  fetch_kind: string;
  github_search_query: string | null;
  failure_reason: string | null;
}

function mapRowToDefinition(
  row: SupabaseToolCandidateSourceRow,
): ToolCandidateSourceDefinition | null {
  const base = {
    id: row.id,
    sourceName: row.name,
    sourceTier: row.source_tier as ToolCandidateSourceTier,
    pipelineLane: "tool_candidate" as const,
    href: row.base_url,
    defaultTags: row.default_tags ?? [],
    maxItems: row.max_items,
    enabled: row.enabled,
    disableReason: row.failure_reason ?? undefined,
  };

  if (row.fetch_kind === "rss" && row.feed_url) {
    return { ...base, fetchKind: "rss", feedUrl: row.feed_url };
  }

  if (row.fetch_kind === "hn-show") {
    return { ...base, fetchKind: "hn-show" };
  }

  if (row.fetch_kind === "github-search" && row.github_search_query) {
    return {
      ...base,
      fetchKind: "github-search",
      githubSearchQuery: row.github_search_query,
    };
  }

  return null;
}

export async function loadToolCandidateSourcesFromDb(): Promise<
  ToolCandidateSourceDefinition[]
> {
  try {
    getSupabaseDbUrl();
  } catch {
    return hardcodedFallback;
  }

  const sql = createSupabaseSql();
  try {
    const rows = await sql<SupabaseToolCandidateSourceRow[]>`
      select
        id,
        name,
        base_url,
        source_tier,
        pipeline_lane,
        enabled,
        feed_url,
        default_tags,
        max_items,
        fetch_kind,
        github_search_query,
        failure_reason
      from public.sources
      where pipeline_lane = 'tool_candidate'
      order by name asc
    `;

    const definitions = rows
      .map(mapRowToDefinition)
      .filter((row): row is ToolCandidateSourceDefinition => row !== null);

    return definitions.length > 0 ? definitions : hardcodedFallback;
  } catch {
    return hardcodedFallback;
  } finally {
    await sql.end();
  }
}
