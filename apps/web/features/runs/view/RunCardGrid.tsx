import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentRunCard } from "../presenter/present-run-card";
import type { IngestRun } from "@vibehub/content-contracts";

export function RunCardGrid({ items }: { items: IngestRun[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentRunCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
