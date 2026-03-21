import { listInboxItems as listInboxItemsFromApi } from "../api/list-inbox-items";

export function listInboxItems() {
  return listInboxItemsFromApi();
}
