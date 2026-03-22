import { listDiscoverItems as listDiscoverItemsApi } from "../api/list-discover-items";

export async function listDiscoverItems() {
  return listDiscoverItemsApi();
}
