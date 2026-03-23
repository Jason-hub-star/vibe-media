import { assetEntries } from "../../shared/mock-data";
import { listSupabaseAssetSlots } from "../../shared/supabase-asset-slots";

export async function listAssetSlots() {
  const remote = await listSupabaseAssetSlots();
  if (!remote || remote.length === 0) {
    return assetEntries;
  }
  return remote;
}
