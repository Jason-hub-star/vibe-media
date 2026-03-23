import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentExceptionCard } from "../presenter/present-exception-card";
import type { ExceptionQueueItem } from "@vibehub/content-contracts";

export function ExceptionCardGrid({ items }: { items: ExceptionQueueItem[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentExceptionCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
