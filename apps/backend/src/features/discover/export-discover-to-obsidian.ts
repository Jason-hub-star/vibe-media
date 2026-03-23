import type { DiscoverItem } from "@vibehub/content-contracts";

import {
  exportDiscoverItemsToObsidian,
  type DiscoverObsidianExportOptions
} from "../../shared/obsidian-discover-export";
import { listSupabaseDiscoverItems } from "../../shared/supabase-editorial-read";

function sortDiscoverItems(items: DiscoverItem[]) {
  return [...items].sort((left, right) => {
    if (left.highlighted !== right.highlighted) return left.highlighted ? -1 : 1;
    if (left.category !== right.category) return left.category.localeCompare(right.category);
    return left.slug.localeCompare(right.slug);
  });
}

export async function exportDiscoverToObsidian(options: DiscoverObsidianExportOptions = {}) {
  const items = sortDiscoverItems((await listSupabaseDiscoverItems()) ?? []);
  return exportDiscoverItemsToObsidian(items, options);
}
