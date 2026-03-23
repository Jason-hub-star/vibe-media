import { getPublishItemDetail as getPublishItemDetailApi } from "../api/get-publish-item-detail";

export async function getPublishItemDetail(id: string) {
  return getPublishItemDetailApi(id);
}
