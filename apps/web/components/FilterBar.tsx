"use client";

import { useState } from "react";

export interface FilterOption {
  id: string;
  label: string;
  icon?: string;
  color?: string;
}

interface FilterBarProps {
  /** Filter chips — pass [] to hide */
  filters: FilterOption[];
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Initial active filter (from URL param) */
  initialFilter?: string | null;
  /** Initial search query (from URL param) */
  initialQuery?: string;
  /** Called on filter or search change */
  onChange: (state: { activeFilter: string | null; query: string }) => void;
}

/**
 * Reusable filter bar — search input + pill row.
 * Used by both /brief (topic) and /radar (category).
 */
export function FilterBar({
  filters,
  searchPlaceholder = "Search...",
  initialFilter,
  initialQuery,
  onChange
}: FilterBarProps) {
  const [active, setActive] = useState<string | null>(initialFilter ?? null);
  const [query, setQuery] = useState(initialQuery ?? "");

  function handleFilter(id: string | null) {
    const next = active === id ? null : id;
    setActive(next);
    onChange({ activeFilter: next, query });
  }

  function handleSearch(value: string) {
    setQuery(value);
    onChange({ activeFilter: active, query: value });
  }

  return (
    <div className="filter-bar">
      <input
        type="search"
        className="filter-search input"
        placeholder={searchPlaceholder}
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        aria-label="Search"
      />
      {filters.length > 0 && (
        <div className="filter-pill-row">
          <button
            type="button"
            className={`filter-pill${active === null ? " filter-pill--active" : ""}`}
            onClick={() => handleFilter(null)}
          >
            All
          </button>
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`filter-pill${active === f.id ? " filter-pill--active" : ""}`}
              onClick={() => handleFilter(f.id)}
            >
              {f.icon && <span className="filter-pill-icon">{f.icon}</span>}
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
