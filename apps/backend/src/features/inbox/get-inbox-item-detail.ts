import type { InboxItem } from "@vibehub/content-contracts";

import { listInboxItems } from "./list-inbox-items";

export async function getInboxItemDetail(
  id: string,
): Promise<InboxItem | null> {
  const items = await listInboxItems();
  return items.find((item) => item.id === id) ?? null;
}
