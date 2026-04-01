import type { DiscoverCategory, DiscoverCategoryGroup } from "@vibehub/content-contracts";
import { DISCOVER_CATEGORIES, DISCOVER_CATEGORY_LABELS, DISCOVER_CATEGORY_GROUPS } from "@vibehub/content-contracts";
import { discoverCategoryVisuals, discoverGroupLabels } from "@vibehub/design-tokens";
import type { CategoryColorToken } from "@vibehub/design-tokens";

export interface CategoryPresentation {
  label: string;
  color: CategoryColorToken;
  icon: string;
  group: DiscoverCategoryGroup;
  groupLabel: string;
}

const DEFAULT_VISUAL = { color: "mint" as CategoryColorToken, icon: "📌" };

export function presentDiscoverCategory(category: DiscoverCategory): CategoryPresentation {
  const visual = discoverCategoryVisuals[category] ?? DEFAULT_VISUAL;
  const group = DISCOVER_CATEGORY_GROUPS[category];
  return {
    label: DISCOVER_CATEGORY_LABELS[category],
    color: visual.color,
    icon: visual.icon,
    group,
    groupLabel: discoverGroupLabels[group] ?? group,
  };
}

/** 카테고리별로 아이템을 그룹핑 — 빈 카테고리는 자동 제외, coverImage 있는 아이템 우선 */
export function groupByCategory<T extends { category: DiscoverCategory; coverImage?: string }>(items: T[]) {
  const grouped = new Map<DiscoverCategory, T[]>();
  for (const item of items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item);
    grouped.set(item.category, list);
  }
  // DISCOVER_CATEGORIES 배열 순서대로 정렬 (SSOT 순서 유지)
  const ordered = new Map<DiscoverCategory, T[]>();
  for (const cat of DISCOVER_CATEGORIES) {
    const list = grouped.get(cat.id);
    if (list && list.length > 0) {
      list.sort((a, b) => (a.coverImage ? 0 : 1) - (b.coverImage ? 0 : 1));
      ordered.set(cat.id, list);
    }
  }
  return ordered;
}
