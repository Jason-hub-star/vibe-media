import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { AssetSlotList } from "@/features/assets/view/AssetSlotList";
import { listAssetSlots } from "@/features/assets/use-case/list-asset-slots";

export default async function AdminAssetsPage() {
  const slots = await listAssetSlots();

  return (
    <AdminShell
      subtitle="Every visual slot is named, typed, and documented for later replacement."
      title="Asset Slots"
    >
      {slots.length === 0 ? (
        <EmptyState
          body="Asset slot rows will appear here when `asset_slots` is populated. Until then, the backend fallback registry is shown."
          title="No asset slots"
        />
      ) : (
        <AssetSlotList slots={slots} />
      )}
    </AdminShell>
  );
}
