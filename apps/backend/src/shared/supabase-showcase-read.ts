import type { ShowcaseEntry, ShowcaseLink } from "@vibehub/content-contracts";

import { createSupabaseSql, getSupabaseDbUrl } from "./supabase-postgres";

interface ShowcaseEntryRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  cover_asset: string | null;
  tags: string[];
  primary_link_kind: ShowcaseLink["kind"];
  primary_link_label: string;
  primary_link_href: string;
  review_status: ShowcaseEntry["reviewStatus"];
  scheduled_at: string | null;
  published_at: string | null;
  origin: ShowcaseEntry["origin"];
  created_by: string | null;
  submitted_by: string | null;
  author_label: string | null;
  source_discover_item_id: string | null;
  featured_home: boolean;
  featured_radar: boolean;
  featured_submit_hub: boolean;
  display_order: number;
  created_at: string;
}

interface ShowcaseLinkRow {
  showcase_entry_id: string;
  link_kind: ShowcaseLink["kind"];
  label: string;
  href: string;
  position: number;
}

const SHOWCASE_CACHE_TTL_MS = 30_000;

let cachedEntries: ShowcaseEntry[] | null = null;
let cachedAt = 0;
let inFlight: Promise<ShowcaseEntry[] | null> | null = null;

function canReadSupabase() {
  try {
    getSupabaseDbUrl();
    return true;
  } catch {
    return false;
  }
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function buildShowcaseEntries(rows: ShowcaseEntryRow[], linkRows: ShowcaseLinkRow[]) {
  const linkMap = new Map<string, ShowcaseLink[]>();

  for (const row of linkRows) {
    const list = linkMap.get(row.showcase_entry_id) ?? [];
    list.push({
      kind: row.link_kind,
      label: row.label,
      href: row.href
    });
    linkMap.set(row.showcase_entry_id, list);
  }

  return rows.map(
    (row) =>
      ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        body: toStringArray(row.body),
        coverAsset: row.cover_asset,
        tags: toStringArray(row.tags),
        primaryLink: {
          kind: row.primary_link_kind,
          label: row.primary_link_label,
          href: row.primary_link_href
        },
        links: linkMap.get(row.id) ?? [],
        reviewStatus: row.review_status,
        scheduledAt: row.scheduled_at,
        publishedAt: row.published_at,
        origin: row.origin,
        createdBy: row.created_by,
        submittedBy: row.submitted_by,
        authorLabel: row.author_label,
        sourceDiscoverItemId: row.source_discover_item_id,
        featuredHome: row.featured_home,
        featuredRadar: row.featured_radar,
        featuredSubmitHub: row.featured_submit_hub,
        displayOrder: row.display_order
      }) satisfies ShowcaseEntry
  );
}

async function fetchShowcaseData() {
  const sql = createSupabaseSql();

  try {
    const [entryRows, linkRows] = await Promise.all([
      sql<ShowcaseEntryRow[]>`
        select
          id,
          slug,
          title,
          summary,
          body,
          cover_asset,
          tags,
          primary_link_kind,
          primary_link_label,
          primary_link_href,
          review_status,
          scheduled_at,
          published_at,
          origin,
          created_by,
          submitted_by,
          author_label,
          source_discover_item_id,
          featured_home,
          featured_radar,
          featured_submit_hub,
          display_order,
          created_at
        from public.showcase_entries
        order by display_order asc, published_at desc nulls last, created_at desc
      `,
      sql<ShowcaseLinkRow[]>`
        select
          showcase_entry_id,
          link_kind,
          label,
          href,
          position
        from public.showcase_links
        order by showcase_entry_id asc, position asc
      `
    ]);

    return buildShowcaseEntries(entryRows, linkRows);
  } finally {
    await sql.end();
  }
}

export async function listSupabaseShowcaseEntries() {
  if (!canReadSupabase()) return null;

  const now = Date.now();
  if (cachedEntries && now - cachedAt < SHOWCASE_CACHE_TTL_MS) {
    return cachedEntries;
  }

  if (inFlight) return inFlight;

  inFlight = fetchShowcaseData()
    .then((entries) => {
      cachedEntries = entries;
      cachedAt = Date.now();
      return entries;
    })
    .catch(() => null)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}
