import { listAssetSlots as listAssetSlotsApi } from "../api/list-asset-slots";

export function listAssetSlots() {
  return listAssetSlotsApi();
}
