import type { ReviewStatus } from "./review";

// editorial lifecycle 상수 — brief, discover, showcase 공통
export const REVIEW_STATUSES = ["pending", "approved", "changes_requested", "rejected"] as const;

export const DISCOVER_STATUSES = ["tracked", "watching", "featured"] as const;
export type DiscoverStatus = (typeof DISCOVER_STATUSES)[number];

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
  status: DiscoverStatus;
  reviewStatus: ReviewStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  tags: string[];
  actions: DiscoverAction[];
  highlighted: boolean;
}

export interface DiscoverItemDetail extends DiscoverItem {
  fullDescription: string;
  relatedBriefSlugs: string[];
}
