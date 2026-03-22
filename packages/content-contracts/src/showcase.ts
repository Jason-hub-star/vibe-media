import type { ReviewStatus } from "./review";

export type ShowcaseOrigin = "editorial" | "imported" | "user_submission";
export type ShowcaseReviewStatus = "draft" | ReviewStatus;
export type ShowcaseLinkKind = "primary" | "github" | "demo" | "docs" | "video" | "brief";

export interface ShowcaseLink {
  kind: ShowcaseLinkKind;
  label: string;
  href: string;
}

export interface ShowcaseEntry {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  coverAsset: string | null;
  tags: string[];
  primaryLink: ShowcaseLink;
  links: ShowcaseLink[];
  reviewStatus: ShowcaseReviewStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  origin: ShowcaseOrigin;
  createdBy: string | null;
  submittedBy: string | null;
  authorLabel: string | null;
  sourceDiscoverItemId: string | null;
  featuredHome: boolean;
  featuredRadar: boolean;
  displayOrder: number;
}

export interface ShowcaseTeaser {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverAsset: string | null;
  tags: string[];
  primaryLink: ShowcaseLink;
  authorLabel: string | null;
  featuredHome: boolean;
  featuredRadar: boolean;
  publishedAt: string | null;
}
