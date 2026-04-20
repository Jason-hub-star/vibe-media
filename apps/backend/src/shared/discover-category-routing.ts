import type { DiscoverCategory, InboxTargetSurface } from "@vibehub/content-contracts";

const DUAL_SURFACE_TAGS = new Set(["api", "integration", "sdk"]);
const DISCOVER_SURFACE_CATEGORIES = new Set<DiscoverCategory>([
  "open_source",
  "website",
  "event",
  "contest",
  "grant",
  "community",
  "asset",
  "design_token",
  "harness_pattern"
]);

function normalizeTag(tag: string) {
  return tag.trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function hasTag(tags: Set<string>, signals: string[]) {
  return signals.some((signal) => tags.has(signal));
}

export function inferDiscoverCategoryFromTags(tags: string[]): DiscoverCategory | null {
  const normalizedTags = new Set(tags.map(normalizeTag).filter(Boolean));

  // harness_pattern은 최우선 — 전용 태그로 명시적으로 지정된 패턴 소스
  if (hasTag(normalizedTags, ["harness"])) return "harness_pattern";

  if (hasTag(normalizedTags, ["sdk"])) return "sdk";
  if (hasTag(normalizedTags, ["api"])) return "api";
  if (hasTag(normalizedTags, ["integration"])) return "integration";
  if (hasTag(normalizedTags, ["agent", "agents"])) return "agent";
  if (hasTag(normalizedTags, ["template"])) return "template";
  if (hasTag(normalizedTags, ["model", "models"])) return "model";
  if (hasTag(normalizedTags, ["research", "paper"])) return "research";
  if (hasTag(normalizedTags, ["dataset"])) return "dataset";
  if (hasTag(normalizedTags, ["benchmark", "evaluation", "leaderboard"])) return "benchmark";
  if (hasTag(normalizedTags, ["tutorial", "guide"])) return "tutorial";
  if (hasTag(normalizedTags, ["newsletter"])) return "newsletter";
  if (hasTag(normalizedTags, ["repo-list", "repo-lists"])) return "repo_list";
  if (hasTag(normalizedTags, ["job", "career"])) return "job";
  if (hasTag(normalizedTags, ["grant", "funding", "credits"])) return "grant";
  if (hasTag(normalizedTags, ["community"])) return "community";
  if (
    hasTag(normalizedTags, [
      "brand",
      "css",
      "design",
      "design-token",
      "frontend",
      "inspiration",
      "interaction",
      "landing",
      "landing-page",
      "logo",
      "pattern",
      "ux"
    ])
  ) {
    return "design_token";
  }
  if (hasTag(normalizedTags, ["website", "site"])) return "website";
  if (hasTag(normalizedTags, ["contest", "competition", "hackathon"])) return "contest";
  if (hasTag(normalizedTags, ["event", "conference", "meetup"])) return "event";
  if (hasTag(normalizedTags, ["asset"])) return "asset";
  if (hasTag(normalizedTags, ["news"])) return "news";
  if (hasTag(normalizedTags, ["open-source", "oss", "repo", "tool"])) return "open_source";

  return null;
}

export function inferTargetSurfaceFromTags(tags: string[]): InboxTargetSurface {
  const normalizedTags = new Set(tags.map(normalizeTag).filter(Boolean));

  if (Array.from(normalizedTags).some((tag) => DUAL_SURFACE_TAGS.has(tag))) {
    return "both";
  }

  const discoverCategory = inferDiscoverCategoryFromTags(tags);
  if (discoverCategory && DISCOVER_SURFACE_CATEGORIES.has(discoverCategory)) {
    return "discover";
  }

  return "brief";
}
