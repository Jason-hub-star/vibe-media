import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentInboxCard } from "../presenter/present-inbox-card";
import type { InboxItem } from "@vibehub/content-contracts";

export function InboxCardGrid({ items }: { items: InboxItem[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentInboxCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
