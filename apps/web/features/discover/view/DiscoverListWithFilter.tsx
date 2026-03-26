"use client";

import { useMemo, useState } from "react";

import type { DiscoverItem, DiscoverCategory } from "@vibehub/content-contracts";
import { DISCOVER_CATEGORIES } from "@vibehub/content-contracts";

import { FilterBar, type FilterOption } from "@/components/FilterBar";

import { DiscoverCard } from "./DiscoverCard";
import { presentDiscoverCategory, groupByCategory } from "../presenter/present-discover-category";

/** Build filter options from SSOT category groups (not individual categories). */
function buildGroupFilters(): FilterOption[] {
  const seen = new Set<string>();
  return DISCOVER_CATEGORIES.reduce<FilterOption[]>((acc, cat) => {
    if (!seen.has(cat.group)) {
      seen.add(cat.group);
      const pres = presentDiscoverCategory(cat.id as DiscoverCategory);
      acc.push({
        id: cat.group,
        label: pres.groupLabel,
        icon: pres.icon
      });
    }
    return acc;
  }, []);
}

interface Props {
  items: DiscoverItem[];
}

export function DiscoverListWithFilter({ items }: Props) {
  const [filter, setFilter] = useState<{ activeFilter: string | null; query: string }>({
    activeFilter: null,
    query: ""
  });

  const groupFilters = useMemo(() => buildGroupFilters(), []);

  const filtered = useMemo(() => {
    let result = items;
    if (filter.activeFilter) {
      const groupCats = new Set(
        DISCOVER_CATEGORIES
          .filter((c) => c.group === filter.activeFilter)
          .map((c) => c.id)
      );
      result = result.filter((item) => groupCats.has(item.category));
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
        filters={groupFilters}
        searchPlaceholder="Search tools, events, repos..."
        onChange={setFilter}
      />
      {grouped.size === 0 ? (
        <p className="muted" style={{ textAlign: "center", padding: "2rem 0" }}>
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
