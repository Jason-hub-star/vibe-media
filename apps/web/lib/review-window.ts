import type { Metadata } from "next";

import type { BriefListItem } from "@vibehub/content-contracts";

export type ReviewWindowRouteId =
  | "home"
  | "brief-list"
  | "brief-detail"
  | "radar-list"
  | "radar-detail"
  | "sources"
  | "newsletter"
  | "about"
  | "privacy"
  | "terms"
  | "editorial-policy"
  | "team"
  | "contact";

export type ReviewContentBucket = "keep" | "rewrite" | "hide";

const NOINDEX_ROUTES = new Set<ReviewWindowRouteId>([
  "radar-list",
  "radar-detail",
  "sources",
  "newsletter",
]);

const INDEXABLE_STATIC_PATHS = new Set([
  "",
  "/brief",
  "/about",
  "/privacy",
  "/terms",
  "/editorial-policy",
  "/team",
  "/contact",
]);

const INTERNAL_TERMS = ["pipeline", "ingest", "draft", "classify", "orchestrat"];
const ARTIFACT_PATTERN =
  /\bsummary:|listen to article|announcements|play episode|\[duration\]\s+minutes/i;
const MARKETING_PATTERN =
  /\b(excited|proud|pleased|happy)\s+to\s+announce\b|originally published on/i;
const LOW_VALUE_PATTERN =
  /\b(glossary|definition|what is|how to|release notes?|changelog|updated dependencies|maintenance release)\b/i;
const LOW_QUALITY_IMAGE_PATTERN =
  /favicon|apple-touch-icon|touch-icon|\/icon(?:[-_0-9x]*)?\.|\.ico(?:$|\?)/i;

function safeDateValue(value: string | null | undefined) {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isShortTruncated(text: string) {
  const trimmed = text.trim();
  return (trimmed.endsWith("...") || trimmed.endsWith("…")) && trimmed.length < 160;
}

function hasInternalTerms(text: string) {
  const lower = text.toLowerCase();
  return INTERNAL_TERMS.some((term) => lower.includes(term));
}

export function isPublicReviewWindowEnabled() {
  return process.env.VIBEHUB_PUBLIC_REVIEW_WINDOW !== "false";
}

export function getPublicPageRobots(routeId: ReviewWindowRouteId): Metadata["robots"] {
  const shouldIndex = !isPublicReviewWindowEnabled() || !NOINDEX_ROUTES.has(routeId);
  return { index: shouldIndex, follow: true };
}

export function shouldIncludeStaticPathInSitemap(path: string) {
  if (!isPublicReviewWindowEnabled()) return true;
  return INDEXABLE_STATIC_PATHS.has(path);
}

export function isLowQualityCoverImage(url: string | null | undefined) {
  if (!url) return false;
  return LOW_QUALITY_IMAGE_PATTERN.test(url);
}

export function classifyBriefForReviewWindow(brief: BriefListItem): ReviewContentBucket {
  const title = brief.title ?? "";
  const summary = brief.summary ?? "";
  const preview = brief.bodyPreview ?? "";
  const combined = `${title}\n${summary}\n${preview}`;

  const weakSources = (brief.sourceCount ?? 0) < 2;
  const thinSummary = summary.trim().length < 60 || isShortTruncated(summary);
  const thinBody = (brief.readTimeMinutes ?? 0) < 2 || preview.trim().length < 120;
  const hasArtifacts = ARTIFACT_PATTERN.test(combined);
  const hasMarketing = MARKETING_PATTERN.test(`${title}\n${summary}`);
  const lowValueTopic = LOW_VALUE_PATTERN.test(`${title}\n${summary}`);
  const internalTerms = hasInternalTerms(combined);
  const lowQualityImage = isLowQualityCoverImage(brief.coverImage);

  if (
    lowValueTopic ||
    (weakSources && thinSummary) ||
    (weakSources && thinBody) ||
    (hasArtifacts && weakSources)
  ) {
    return "hide";
  }

  if (
    thinSummary ||
    thinBody ||
    weakSources ||
    hasArtifacts ||
    hasMarketing ||
    internalTerms ||
    lowQualityImage
  ) {
    return "rewrite";
  }

  return "keep";
}

export function sortBriefsForReviewWindow(briefs: BriefListItem[]) {
  if (!isPublicReviewWindowEnabled()) return briefs;

  const bucketRank: Record<ReviewContentBucket, number> = {
    keep: 0,
    rewrite: 1,
    hide: 2,
  };

  return [...briefs].sort((left, right) => {
    const leftBucket = classifyBriefForReviewWindow(left);
    const rightBucket = classifyBriefForReviewWindow(right);

    if (bucketRank[leftBucket] !== bucketRank[rightBucket]) {
      return bucketRank[leftBucket] - bucketRank[rightBucket];
    }

    return safeDateValue(right.publishedAt) - safeDateValue(left.publishedAt);
  });
}

export function selectReviewWindowFeaturedBriefs(briefs: BriefListItem[], maxItems = 15) {
  if (!isPublicReviewWindowEnabled()) {
    return briefs.slice(0, maxItems);
  }

  return sortBriefsForReviewWindow(briefs)
    .filter((brief) => classifyBriefForReviewWindow(brief) === "keep")
    .slice(0, maxItems);
}
