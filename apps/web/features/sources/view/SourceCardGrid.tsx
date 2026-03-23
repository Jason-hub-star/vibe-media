import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentSourceCard } from "../presenter/present-source-card";
import type { SourceEntry } from "@vibehub/content-contracts";

export function SourceCardGrid({ items }: { items: SourceEntry[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentSourceCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
