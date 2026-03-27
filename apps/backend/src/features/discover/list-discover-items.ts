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

function normalizeHref(href: string) {
  return href.trim().replace(/\/+$/, "").toLowerCase();
}

function getCanonicalDiscoverKey(item: DiscoverItem) {
  const primaryExternalAction = item.actions.find(
    (action) => action.kind !== "brief" && /^https?:\/\//i.test(action.href)
  );
  const fallbackAction = item.actions.find((action) => /^https?:\/\//i.test(action.href));
  const href = primaryExternalAction?.href ?? fallbackAction?.href;

  if (href) {
    return `href:${normalizeHref(href)}`;
  }

  return `title:${item.category}:${item.title.trim().toLowerCase()}`;
}

function getPublishedAtTime(value: string | null) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function shouldReplaceDiscoverCandidate(current: DiscoverItem, candidate: DiscoverItem) {
  if (current.highlighted !== candidate.highlighted) return candidate.highlighted;

  const currentPublishedAt = getPublishedAtTime(current.publishedAt);
  const candidatePublishedAt = getPublishedAtTime(candidate.publishedAt);
  if (currentPublishedAt !== candidatePublishedAt) {
    return candidatePublishedAt > currentPublishedAt;
  }

  if (current.actions.length !== candidate.actions.length) {
    return candidate.actions.length > current.actions.length;
  }

  if (current.tags.length !== candidate.tags.length) {
    return candidate.tags.length > current.tags.length;
  }

  return candidate.id.localeCompare(current.id) < 0;
}

function dedupeDiscoverItems(items: DiscoverItem[]) {
  const byKey = new Map<string, DiscoverItem>();

  for (const item of items) {
    const key = getCanonicalDiscoverKey(item);
    const existing = byKey.get(key);
    if (!existing || shouldReplaceDiscoverCandidate(existing, item)) {
      byKey.set(key, item);
    }
  }

  return Array.from(byKey.values());
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
  }));
}

async function resolveDiscoverSource(opts?: { includeUnpublished?: boolean }): Promise<DiscoverItemsResult> {
  const filter = opts?.includeUnpublished ? (items: DiscoverItem[]) => items : (items: DiscoverItem[]) => items.filter(isPublished);

  const supabaseItems = await listSupabaseDiscoverItems();
  if (supabaseItems && supabaseItems.length > 0) {
    const filtered = filter(supabaseItems);
    if (filtered.length > 0) {
      return { items: sortDiscoverItems(dedupeDiscoverItems(filtered)), source: "supabase" };
    }
  }

  const snapshotItems = listSnapshotDiscoverItems();
  if (snapshotItems.length > 0) {
    const filtered = filter(snapshotItems);
    if (filtered.length > 0) {
      return { items: sortDiscoverItems(dedupeDiscoverItems(filtered)), source: "snapshot" };
    }
  }

  return { items: sortDiscoverItems(dedupeDiscoverItems(filter(discoverEntries))), source: "mock" };
}

export async function listDiscoverItemsWithSource(): Promise<DiscoverItemsResult> {
  return resolveDiscoverSource();
}

/** Public: only approved + published items */
export async function listDiscoverItems(): Promise<DiscoverItem[]> {
  return (await resolveDiscoverSource()).items;
}

/** Admin: all items regardless of review/publish status */
export async function listAllDiscoverItems(): Promise<DiscoverItem[]> {
  return (await resolveDiscoverSource({ includeUnpublished: true })).items;
}
