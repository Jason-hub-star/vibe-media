"use client";

import { useMemo } from "react";

import type { DiscoverItem, DiscoverCategory } from "@vibehub/content-contracts";
import { DISCOVER_CATEGORIES } from "@vibehub/content-contracts";

import { FilterBar, type FilterOption } from "@/components/FilterBar";
import { useFilterUrlSync } from "@/features/shared/view/use-filter-url-sync";

import { DiscoverCard } from "./DiscoverCard";
import { presentDiscoverCategory, groupByCategory } from "../presenter/present-discover-category";

/** Build category-level tabs from the SSOT order so Radar can deep-link one category at a time. */
function buildCategoryFilters(): FilterOption[] {
  return DISCOVER_CATEGORIES.map((cat) => {
    const pres = presentDiscoverCategory(cat.id as DiscoverCategory);
    return {
      id: cat.id,
      label: pres.label,
      icon: pres.icon
    };
  });
}

interface Props {
  items: DiscoverItem[];
}

export function DiscoverListWithFilter({ items }: Props) {
  const { filter, initialFilter, initialQuery, handleChange } = useFilterUrlSync({
    basePath: "/radar",
    filterParam: "category",
    legacyFilterParams: ["group"]
  });

  const categoryFilters = useMemo(() => buildCategoryFilters(), []);

  const filtered = useMemo(() => {
    let result = items;

    if (filter.activeFilter) {
      result = result.filter((item) => item.category === filter.activeFilter);
    }
    if (filter.query) {
      const q = filter.query.toLowerCase();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [items, filter]);

  const grouped = groupByCategory(filtered);

  return (
    <>
      <FilterBar
        filters={categoryFilters}
        searchPlaceholder="Search tools, design references, events..."
        initialFilter={initialFilter}
        initialQuery={initialQuery}
        onChange={handleChange}
      />
      {grouped.size === 0 ? (
        <p className="muted empty-filter-message">
          {items.length > 0
            ? "No items match your filter."
            : "Discovery items will appear after curation."}
        </p>
      ) : (
        Array.from(grouped.entries()).map(([category, catItems]) => {
          const cat = presentDiscoverCategory(category);
          return (
            <div key={category} className="discover-filter-section">
              <h3 className="eyebrow">
                {cat.icon} {cat.label} ({catItems.length})
              </h3>
              <div className="panel-grid">
                {catItems.map((item) => (
                  <DiscoverCard item={item} key={item.id} />
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
}
