import type { AssetSlotDetail } from "@vibehub/content-contracts";

import { listAssetSlots } from "./list-asset-slots";

export async function getAssetDetail(id: string): Promise<AssetSlotDetail | null> {
  const items = listAssetSlots();
  const item = items.find((i) => i.id === id);
  if (!item) return null;
  return {
    ...item,
    usages: [],
  };
}
