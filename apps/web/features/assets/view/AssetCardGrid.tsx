import { AdminCard } from "@/components/AdminCard";
import { AdminCardGrid } from "@/components/AdminCardGrid";
import { presentAssetCard } from "../presenter/present-asset-card";
import type { AssetSlot } from "@vibehub/content-contracts";

export function AssetCardGrid({ items }: { items: AssetSlot[] }) {
  return (
    <AdminCardGrid>
      {items.map((item) => {
        const card = presentAssetCard(item);
        return <AdminCard key={card.id} {...card} />;
      })}
    </AdminCardGrid>
  );
}
