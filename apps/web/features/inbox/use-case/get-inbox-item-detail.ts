import { getInboxItemDetail as getInboxItemDetailApi } from "../api/get-inbox-item-detail";

export async function getInboxItemDetail(id: string) {
  return getInboxItemDetailApi(id);
}
