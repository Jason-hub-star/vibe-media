import { getInboxItemDetail as getInboxItemDetailBackend } from "@vibehub/backend";

export async function getInboxItemDetail(id: string) {
  return getInboxItemDetailBackend(id);
}
