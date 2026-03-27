import { listDiscoverItems as listDiscoverItemsBackend, listAllDiscoverItems as listAllDiscoverItemsBackend } from "@vibehub/backend";

export async function listDiscoverItems() {
  return listDiscoverItemsBackend();
}

export async function listAllDiscoverItems() {
  return listAllDiscoverItemsBackend();
}
