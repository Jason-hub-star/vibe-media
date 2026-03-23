import { getPublishItemDetail as getPublishItemDetailBackend } from "@vibehub/backend";

export async function getPublishItemDetail(id: string) {
  return getPublishItemDetailBackend(id);
}
