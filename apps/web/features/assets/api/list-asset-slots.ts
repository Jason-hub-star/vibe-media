import { listAssetSlots as listAssetSlotsBackend } from "@vibehub/backend";

export async function listAssetSlots() {
  return listAssetSlotsBackend();
}
