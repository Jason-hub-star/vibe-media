import type { DiscoverItem } from "@vibehub/content-contracts";
import { isPublished } from "@vibehub/content-contracts";

import { readLiveIngestSnapshot } from "../../shared/live-ingest-snapshot";
import { discoverEntries } from "../../shared/mock-data";
import { buildEditorialRows } from "../../shared/supabase-editorial-sync";
import { listSupabaseDiscoverItems } from "../../shared/supabase-editorial-read";

export type DiscoverItemsSource = "supabase" | "snapshot" | "mock";

export interface DiscoverItemsResult {
  items: DiscoverItem[];
  source: DiscoverItemsSource;
}

function sortDiscoverItems(items: DiscoverItem[]) {
  return [...items].sort((left, right) => {
    if (left.highlighted !== right.highlighted) return left.highlighted ? -1 : 1;
    if (left.category !== right.category) return left.category.localeCompare(right.category);
    return left.slug.localeCompare(right.slug);
  });
}

function listSnapshotDiscoverItems() {
  const snapshot = readLiveIngestSnapshot();
  if (!snapshot) return [];

  const editorial = buildEditorialRows(snapshot);
  const actionsByDiscoverId = new Map<string, DiscoverItem["actions"]>();

  for (const action of editorial.discoverActions) {
    const list = actionsByDiscoverId.get(action.discover_item_id) ?? [];
    list.push({ kind: action.action_kind, label: action.label, href: action.href });
    actionsByDiscoverId.set(action.discover_item_id, list);
  }

  return editorial.discoverItems.map((item) => ({
    id: item.id,
    slug: item.slug,
    title: item.title,
    category: item.category,
    summary: item.summary,
    status: item.status,
    reviewStatus: item.review_status,
    scheduledAt: item.scheduled_at,
    publishedAt: item.published_at,
    tags: item.tags,
    highlighted: item.highlighted,
    actions: actionsByDiscoverId.get(item.id) ?? []
  })).filter(isPublished);
}

export async function listDiscoverItemsWithSource(): Promise<DiscoverItemsResult> {
  const supabaseItems = await listSupabaseDiscoverItems();
  if (supabaseItems && supabaseItems.length > 0) {
    return { items: sortDiscoverItems(supabaseItems), source: "supabase" };
  }

  const snapshotItems = listSnapshotDiscoverItems();
  if (snapshotItems.length > 0) {
    return { items: sortDiscoverItems(snapshotItems), source: "snapshot" };
  }

  return { items: sortDiscoverItems(discoverEntries.filter(isPublished)), source: "mock" };
}

export async function listDiscoverItems(): Promise<DiscoverItem[]> {
  return (await listDiscoverItemsWithSource()).items;
}
