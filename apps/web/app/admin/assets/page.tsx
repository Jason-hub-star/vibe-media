import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { AssetSlotList } from "@/features/assets/view/AssetSlotList";
import { listAssetSlots } from "@/features/assets/use-case/list-asset-slots";

export default function AdminAssetsPage() {
  const slots = listAssetSlots();

  return (
    <AdminShell
      subtitle="Every visual slot is named, typed, and documented for later replacement."
      title="Asset Slots"
    >
      {slots.length === 0 ? (
        <EmptyState
          body="Placeholder slots and replacement specs will appear here as soon as they are registered."
          title="No asset slots"
        />
      ) : (
        <AssetSlotList slots={slots} />
      )}
    </AdminShell>
  );
}
