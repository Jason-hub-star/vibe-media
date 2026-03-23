import { getAssetDetail as getAssetDetailApi } from "../api/get-asset-detail";

export async function getAssetDetail(id: string) {
  return getAssetDetailApi(id);
}
