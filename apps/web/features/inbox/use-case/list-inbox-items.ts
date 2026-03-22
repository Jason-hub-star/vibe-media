import { listInboxItems as listInboxItemsFromApi } from "../api/list-inbox-items";

export async function listInboxItems() {
  return listInboxItemsFromApi();
}
