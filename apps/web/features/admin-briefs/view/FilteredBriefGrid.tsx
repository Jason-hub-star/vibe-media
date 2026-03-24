"use client";

import { Suspense } from "react";
import { AdminTabSwitcher, useTabParam } from "@/features/shared/view/AdminTabSwitcher";
import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { EmptyState } from "@/components/EmptyState";
import { presentBriefCard } from "../presenter/present-brief-card";
import type { BriefListItem } from "@vibehub/content-contracts";

const FILTERS = [
  { key: "all", label: "전체" },
  { key: "draft", label: "초안" },
  { key: "review", label: "검수 중" },
  { key: "scheduled", label: "예약" },
  { key: "published", label: "발행됨" },
] as const;

export function FilteredBriefGrid({ items }: { items: BriefListItem[] }) {
  return (
    <Suspense>
      <Inner items={items} />
    </Suspense>
  );
}

function Inner({ items }: { items: BriefListItem[] }) {
  const [activeFilter, setFilter] = useTabParam("all");

  const filtered =
    activeFilter === "all"
      ? items
      : items.filter((b) => b.status === activeFilter);

  return (
    <>
      <AdminTabSwitcher
        tabs={[...FILTERS]}
        activeTab={activeFilter}
        onTabChange={setFilter}
      />
      {filtered.length === 0 ? (
        <EmptyState
          body="이 상태에 해당하는 브리프가 없습니다."
          title="브리프 없음"
        />
      ) : (
        <AdminCardGrid>
          {filtered.map((item) => {
            const card = presentBriefCard(item);
            return <AdminCard key={card.id} {...card} />;
          })}
        </AdminCardGrid>
      )}
    </>
  );
}
