import { getDiscoverItemDetail as getDiscoverItemDetailApi } from "../api/get-discover-item-detail";

export async function getDiscoverItemDetail(id: string) {
  return getDiscoverItemDetailApi(id);
}
