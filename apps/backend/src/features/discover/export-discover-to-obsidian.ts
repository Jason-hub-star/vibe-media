import {
  exportDiscoverItemsToObsidian,
  type DiscoverObsidianExportOptions
} from "../../shared/obsidian-discover-export";
import { listDiscoverItemsWithSource } from "./list-discover-items";

export async function exportDiscoverToObsidian(options: DiscoverObsidianExportOptions = {}) {
  const { items, source } = await listDiscoverItemsWithSource();
  return exportDiscoverItemsToObsidian(items, { ...options, source });
}
