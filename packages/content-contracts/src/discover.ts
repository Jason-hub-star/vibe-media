import type { LocaleCode, TranslationStatus } from "./locales";
import type { ReviewStatus } from "./review";

// editorial lifecycle 상수 — brief, discover, showcase 공통
export const REVIEW_STATUSES = ["pending", "approved", "changes_requested", "rejected"] as const;

export const DISCOVER_STATUSES = ["tracked", "watching", "featured"] as const;
export type DiscoverStatus = (typeof DISCOVER_STATUSES)[number];

// ── Category SSOT ────────────────────────────────────────────────────────────
// 카테고리 추가 = 이 배열에 1줄 추가하면 타입 + 허용목록 + 프리젠터 라벨이 자동 반영됨
export type DiscoverCategoryGroup = "core" | "builder" | "knowledge" | "opportunity" | "design" | "asset";

export const DISCOVER_CATEGORIES = [
  // Core
  { id: "open_source", label: "Open Source", group: "core" },
  { id: "skill", label: "Skill", group: "core" },
  { id: "plugin", label: "Plugin", group: "core" },
  { id: "os", label: "OS", group: "core" },
  { id: "website", label: "Website", group: "core" },
  { id: "event", label: "Event", group: "core" },
  { id: "contest", label: "Contest", group: "core" },
  { id: "news", label: "News", group: "core" },
  // Builder
  { id: "model", label: "Model", group: "builder" },
  { id: "api", label: "API", group: "builder" },
  { id: "sdk", label: "SDK", group: "builder" },
  { id: "agent", label: "Agent", group: "builder" },
  { id: "template", label: "Template", group: "builder" },
  { id: "integration", label: "Integration", group: "builder" },
  // Knowledge
  { id: "research", label: "Research", group: "knowledge" },
  { id: "dataset", label: "Dataset", group: "knowledge" },
  { id: "benchmark", label: "Benchmark", group: "knowledge" },
  { id: "tutorial", label: "Tutorial", group: "knowledge" },
  { id: "newsletter", label: "Newsletter", group: "knowledge" },
  { id: "repo_list", label: "Repo List", group: "knowledge" },
  // Opportunity
  { id: "job", label: "Job", group: "opportunity" },
  { id: "grant", label: "Grant", group: "opportunity" },
  { id: "community", label: "Community", group: "opportunity" },
  // Design
  { id: "design_token", label: "Design Tokens", group: "design" },
  // Asset
  { id: "asset", label: "Asset", group: "asset" },
] as const;

export type DiscoverCategory = (typeof DISCOVER_CATEGORIES)[number]["id"];

// 파생 유틸리티 — 소비자가 직접 배열 순회 안 해도 됨
export const DISCOVER_CATEGORY_IDS: readonly DiscoverCategory[] = DISCOVER_CATEGORIES.map((c) => c.id);

export const DISCOVER_CATEGORY_LABELS: Record<DiscoverCategory, string> = Object.fromEntries(
  DISCOVER_CATEGORIES.map((c) => [c.id, c.label])
) as Record<DiscoverCategory, string>;

export const DISCOVER_CATEGORY_GROUPS: Record<DiscoverCategory, DiscoverCategoryGroup> = Object.fromEntries(
  DISCOVER_CATEGORIES.map((c) => [c.id, c.group])
) as Record<DiscoverCategory, DiscoverCategoryGroup>;

export type DiscoverActionKind = "visit" | "download" | "docs" | "github" | "apply" | "brief";
/** @deprecated Use TranslationStatus from locales.ts */
export type DiscoverTranslationStatus = TranslationStatus;

export interface DiscoverAction {
  kind: DiscoverActionKind;
  label: string;
  href: string;
}

/** URL 형식 검증 — 런타임 HTTP 체크 없이 형식만 확인 */
export function isValidActionHref(href: string): boolean {
  if (!href || !href.trim()) return false;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
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
  locale?: LocaleCode;
  canonicalLocale?: LocaleCode;
  availableLocales?: LocaleCode[];
  targetLocales?: LocaleCode[];
  translationStatus?: DiscoverTranslationStatus;
}

export interface DiscoverLocaleVariant {
  locale: LocaleCode;
  slug: string;
  title: string;
  summary: string;
  status: DiscoverStatus;
  publishedAt: string | null;
  translationStatus?: DiscoverTranslationStatus;
  isCanonical?: boolean;
}

export interface DiscoverItemDetail extends DiscoverItem {
  fullDescription: string;
  relatedBriefSlugs: string[];
  variants?: DiscoverLocaleVariant[];
}
