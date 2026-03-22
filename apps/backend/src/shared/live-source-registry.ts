import type { InboxItemContentType } from "@vibehub/content-contracts";

export type LiveSourceFetchKind = "rss" | "github-releases";

interface LiveSourceBase {
  id: string;
  sourceName: string;
  sourceTier: "auto-safe";
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

export const liveSourceRegistry: LiveSourceDefinition[] = [
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
  },
  {
    id: "openai-api-changelog",
    sourceName: "OpenAI API Changelog",
    sourceTier: "auto-safe",
    fetchKind: "rss",
    href: "https://platform.openai.com/docs/changelog",
    feedUrl: "https://platform.openai.com/docs/changelog",
    contentType: "article",
    defaultTags: ["api", "release"],
    maxItems: 3,
    enabled: false,
    disableReason: "stable RSS/API endpoint not wired yet"
  },
  {
    id: "anthropic-research",
    sourceName: "Anthropic Research",
    sourceTier: "auto-safe",
    fetchKind: "rss",
    href: "https://www.anthropic.com/research",
    feedUrl: "https://www.anthropic.com/news/rss.xml",
    contentType: "doc",
    defaultTags: ["research", "analysis"],
    maxItems: 3,
    enabled: false,
    disableReason: "public RSS endpoint returned 404 during live fetch verification"
  }
];
