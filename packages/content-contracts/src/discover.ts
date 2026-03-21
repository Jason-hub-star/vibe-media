export type DiscoverCategory =
  | "open_source"
  | "skill"
  | "plugin"
  | "os"
  | "website"
  | "event"
  | "contest"
  | "news"
  | "model"
  | "api"
  | "sdk"
  | "agent"
  | "template"
  | "integration"
  | "research"
  | "dataset"
  | "benchmark"
  | "tutorial"
  | "newsletter"
  | "repo_list"
  | "job"
  | "grant"
  | "community"
  | "asset";

export type DiscoverActionKind = "visit" | "download" | "docs" | "github" | "apply" | "brief";

export interface DiscoverAction {
  kind: DiscoverActionKind;
  label: string;
  href: string;
}

export interface DiscoverItem {
  id: string;
  slug: string;
  title: string;
  category: DiscoverCategory;
  summary: string;
  status: "tracked" | "watching" | "featured";
  tags: string[];
  actions: DiscoverAction[];
  highlighted: boolean;
}
