"use client";

import { useCallback, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const DEBOUNCE_MS = 300;

export interface FilterState {
  activeFilter: string | null;
  query: string;
}

interface UseFilterUrlSyncOptions {
  /** Base route path without leading query (e.g. "/brief", "/radar") */
  basePath: string;
  /** URL param name for the filter value (e.g. "topic", "group") */
  filterParam: string;
  /** URL param name for the search query (default: "q") */
  queryParam?: string;
}

/**
 * Shared hook — reads initial filter/query from URL search params,
 * keeps local state in sync, and debounces URL updates.
 */
export function useFilterUrlSync({
  basePath,
  filterParam,
  queryParam = "q"
}: UseFilterUrlSyncOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const initialFilter = searchParams.get(filterParam) ?? null;
  const initialQuery = searchParams.get(queryParam) ?? "";

  const [filter, setFilter] = useState<FilterState>({
    activeFilter: initialFilter,
    query: initialQuery
  });

  const syncUrl = useCallback(
    (state: FilterState) => {
      const params = new URLSearchParams();
      if (state.activeFilter) params.set(filterParam, state.activeFilter);
      if (state.query) params.set(queryParam, state.query);
      const qs = params.toString();
      router.replace(`${basePath}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [router, basePath, filterParam, queryParam]
  );

  const handleChange = useCallback(
    (state: FilterState) => {
      setFilter(state);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => syncUrl(state), DEBOUNCE_MS);
    },
    [syncUrl]
  );

  return { filter, initialFilter, initialQuery, handleChange };
}
