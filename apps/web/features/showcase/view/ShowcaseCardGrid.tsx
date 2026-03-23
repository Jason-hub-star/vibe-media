import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentShowcaseCard } from "../presenter/present-showcase-card";
import type { ShowcaseEntry } from "@vibehub/content-contracts";

export function ShowcaseCardGrid({ items }: { items: ShowcaseEntry[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentShowcaseCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
