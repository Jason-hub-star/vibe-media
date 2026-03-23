import { listAssetSlots as listAssetSlotsApi } from "../api/list-asset-slots";

export async function listAssetSlots() {
  return listAssetSlotsApi();
}
