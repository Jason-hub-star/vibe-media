import { listInboxItems as listInboxItemsBackend } from "@vibehub/backend";

export async function listInboxItems() {
  return listInboxItemsBackend();
}
