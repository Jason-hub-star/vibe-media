import type { DiscoverItem } from "@vibehub/content-contracts";

import { discoverEntries } from "../../shared/mock-data";

export function listDiscoverItems(): DiscoverItem[] {
  return discoverEntries;
}
