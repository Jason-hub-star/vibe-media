import { getAssetDetail as getAssetDetailBackend } from "@vibehub/backend";

export async function getAssetDetail(id: string) {
  return getAssetDetailBackend(id);
}
