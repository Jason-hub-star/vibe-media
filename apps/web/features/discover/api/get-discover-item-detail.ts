import { getDiscoverItemDetail as getDiscoverItemDetailBackend } from "@vibehub/backend";

export async function getDiscoverItemDetail(id: string) {
  return getDiscoverItemDetailBackend(id);
}
