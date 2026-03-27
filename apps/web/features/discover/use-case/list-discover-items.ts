import { listDiscoverItems as listDiscoverItemsApi, listAllDiscoverItems as listAllDiscoverItemsApi } from "../api/list-discover-items";

export async function listDiscoverItems() {
  return listDiscoverItemsApi();
}

export async function listAllDiscoverItems() {
  return listAllDiscoverItemsApi();
}
