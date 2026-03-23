import type { AssetSlot } from "@vibehub/content-contracts";
import type { AdminCardProps } from "@/components/AdminCard";

export function presentAssetCard(slot: AssetSlot): AdminCardProps {
  return {
    id: slot.id,
    href: `/admin/assets/${slot.id}`,
    title: slot.name,
    status: slot.type,
    metadata: [
      { label: "Ratio", value: slot.spec.ratio },
      { label: "Min size", value: slot.spec.minSize },
      { label: "Format", value: slot.spec.format },
    ],
  };
}
