import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentDiscoverCard } from "../presenter/present-discover-card";
import type { DiscoverItem } from "@vibehub/content-contracts";

export function DiscoverCardGrid({ items, showReviewStatus }: { items: DiscoverItem[]; showReviewStatus?: boolean }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentDiscoverCard(item, { showReviewStatus });
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
