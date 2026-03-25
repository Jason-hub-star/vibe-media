import type { BriefDetail, BriefListItem, DiscoverAction, DiscoverItem, ReviewStatus } from "@vibehub/content-contracts";
import { isPublished } from "@vibehub/content-contracts";

import { createSupabaseSql, getSupabaseDbUrl } from "./supabase-postgres";

interface BriefRow {
  slug: string;
  title: string;
  summary: string;
  body: string[];
  status: BriefListItem["status"];
  published_at: string | null;
  source_links: Array<{ label: string; href: string }>;
  source_count: number;
  cover_image_url: string | null;
}

interface DiscoverRow {
  id: string;
  slug: string;
  title: string;
  category: DiscoverItem["category"];
  summary: string;
  status: DiscoverItem["status"];
  review_status: ReviewStatus;
  scheduled_at: string | null;
  published_at: string | null;
  tags: string[];
  highlighted: boolean;
  actions: DiscoverAction[];
}

const EDITORIAL_CACHE_TTL_MS = 30_000;

let cachedBriefs: BriefDetail[] | null = null;
let cachedDiscover: DiscoverItem[] | null = null;
let cachedAt = 0;
let inFlight: Promise<{ briefs: BriefDetail[]; discover: DiscoverItem[] } | null> | null = null;

function canReadSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

async function fetchEditorialData() {
  const sql = createSupabaseSql();

  try {
    const [briefRows, discoverRows, actionRows] = await Promise.all([
      sql<BriefRow[]>`
        select
          slug,
          title,
          summary,
          body,
          status,
          published_at,
          source_links,
          source_count,
          cover_image_url
        from public.brief_posts
        order by published_at desc nulls last, slug asc
      `,
      sql<Omit<DiscoverRow, "actions">[]>`
        select
          id,
          slug,
          title,
          category,
          summary,
          status,
          review_status,
          scheduled_at,
          published_at,
          tags,
          highlighted
        from public.discover_items
        order by highlighted desc, created_at desc
      `,
      sql<Array<{ discover_item_id: string; action_kind: DiscoverAction["kind"]; label: string; href: string; position: number }>>`
        select
          discover_item_id,
          action_kind,
          label,
          href,
          position
        from public.discover_actions
        order by discover_item_id asc, position asc
      `
    ]);

    const actionMap = new Map<string, DiscoverAction[]>();
    for (const action of actionRows) {
      const list = actionMap.get(action.discover_item_id) ?? [];
      list.push({ kind: action.action_kind, label: action.label, href: action.href });
      actionMap.set(action.discover_item_id, list);
    }

    return {
      briefs: briefRows.map((row) => ({
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        status: row.status,
        publishedAt: row.published_at,
        sourceCount: row.source_count,
        body: Array.isArray(row.body) ? row.body : [],
        sourceLinks: Array.isArray(row.source_links) ? row.source_links : [],
        coverImage: row.cover_image_url ?? undefined
      })),
      discover: discoverRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        category: row.category,
        summary: row.summary,
        status: row.status,
        reviewStatus: row.review_status,
        scheduledAt: row.scheduled_at,
        publishedAt: row.published_at,
        tags: row.tags,
        highlighted: row.highlighted,
        actions: actionMap.get(row.id) ?? []
      })).filter(isPublished)
    };
  } finally {
    await sql.end();
  }
}

async function readEditorialData() {
  if (!canReadSupabase()) return null;

  const now = Date.now();
  if (cachedBriefs && cachedDiscover && now - cachedAt < EDITORIAL_CACHE_TTL_MS) {
    return { briefs: cachedBriefs, discover: cachedDiscover };
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = fetchEditorialData()
    .then((data) => {
      cachedBriefs = data.briefs;
      cachedDiscover = data.discover;
      cachedAt = Date.now();
      return data;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

export async function listSupabaseBriefs() {
  return (await readEditorialData())?.briefs ?? null;
}

export async function getSupabaseBriefDetail(slug: string) {
  return (await readEditorialData())?.briefs.find((item) => item.slug === slug) ?? null;
}

export async function listSupabaseDiscoverItems() {
  return (await readEditorialData())?.discover ?? null;
}
