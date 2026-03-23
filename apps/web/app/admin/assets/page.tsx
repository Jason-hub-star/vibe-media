import { AdminShell } from "@/components/AdminShell";
import { EmptyState } from "@/components/EmptyState";
import { AssetCardGrid } from "@/features/assets/view/AssetCardGrid";
import { listAssetSlots } from "@/features/assets/use-case/list-asset-slots";

export default async function AdminAssetsPage() {
  const slots = await listAssetSlots();

  return (
    <AdminShell
      subtitle="이미지 슬롯의 이름, 타입, 사양을 관리합니다"
      title="에셋 슬롯"
    >
      {slots.length === 0 ? (
        <EmptyState
          body="Asset slot rows will appear here when `asset_slots` is populated. Until then, the backend fallback registry is shown."
          title="No asset slots"
        />
      ) : (
        <AssetCardGrid items={slots} />
      )}
    </AdminShell>
  );
}
