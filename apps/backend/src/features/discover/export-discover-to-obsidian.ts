import {
  exportDiscoverItemsToObsidian,
  type DiscoverObsidianExportOptions
} from "../../shared/obsidian-discover-export";
import { listDiscoverItemsWithSource } from "./list-discover-items";

export async function exportDiscoverToObsidian(options: DiscoverObsidianExportOptions = {}) {
  const { items, source } = await listDiscoverItemsWithSource({ includeUnpublished: true });
  const approvedItems = items.filter((item) => item.reviewStatus === "approved");

  return exportDiscoverItemsToObsidian(approvedItems, { ...options, source });
}
