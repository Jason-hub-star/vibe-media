"use client";

import { useMemo, useState } from "react";

import type { BriefListItem } from "@vibehub/content-contracts";

import { FilterBar } from "@/components/FilterBar";

import { BriefCard } from "./BriefCard";
import { BriefPlaceholderCard } from "./BriefPlaceholderCard";

const MIN_VISIBLE = 6;

function uniqueTopics(briefs: BriefListItem[]) {
  const seen = new Set<string>();
  return briefs.reduce<{ id: string; label: string }[]>((acc, b) => {
    if (b.topic && !seen.has(b.topic)) {
      seen.add(b.topic);
      acc.push({ id: b.topic, label: b.topic });
    }
    return acc;
  }, []);
}

export function BriefListWithFilter({ briefs }: { briefs: BriefListItem[] }) {
  const [filter, setFilter] = useState<{ activeFilter: string | null; query: string }>({
    activeFilter: null,
    query: ""
  });

  const topics = useMemo(() => uniqueTopics(briefs), [briefs]);

  const filtered = useMemo(() => {
    let result = briefs;
    if (filter.activeFilter) {
      result = result.filter((b) => b.topic === filter.activeFilter);
    }
    if (filter.query) {
      const q = filter.query.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.summary.toLowerCase().includes(q) ||
          (b.topic?.toLowerCase().includes(q) ?? false)
      );
    }
    return result;
  }, [briefs, filter]);

  const placeholderCount = Math.max(0, MIN_VISIBLE - filtered.length);

  return (
    <>
      <FilterBar
        filters={topics}
        searchPlaceholder="Search briefs..."
        onChange={setFilter}
      />
      <div className="brief-grid">
        {filtered.map((brief, i) => (
          <BriefCard brief={brief} isLead={i === 0} key={brief.slug} />
        ))}
        {Array.from({ length: placeholderCount }, (_, i) => (
          <BriefPlaceholderCard key={`ph-${i}`} index={i} />
        ))}
      </div>
      {filtered.length === 0 && briefs.length > 0 && (
        <p className="muted" style={{ textAlign: "center", padding: "2rem 0" }}>
          No briefs match your filter.
        </p>
      )}
    </>
  );
}
