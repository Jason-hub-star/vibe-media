import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentBriefCard } from "../presenter/present-brief-card";
import type { BriefListItem } from "@vibehub/content-contracts";

export function BriefCardGrid({ items }: { items: BriefListItem[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentBriefCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
