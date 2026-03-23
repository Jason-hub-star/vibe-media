import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentDiscoverCard } from "../presenter/present-discover-card";
import type { DiscoverItem } from "@vibehub/content-contracts";

export function DiscoverCardGrid({ items }: { items: DiscoverItem[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentDiscoverCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
