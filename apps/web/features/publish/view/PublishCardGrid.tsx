import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentPublishCard } from "../presenter/present-publish-card";
import type { PublishQueueItem } from "@vibehub/content-contracts";

export function PublishCardGrid({ items }: { items: PublishQueueItem[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentPublishCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
