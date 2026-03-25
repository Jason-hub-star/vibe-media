import type { DiscoverAction, DiscoverCategory } from "@vibehub/content-contracts";
import { DISCOVER_CATEGORY_IDS } from "@vibehub/content-contracts";

import type {
  LiveIngestSnapshot,
  SnapshotIngestedItemRow,
  SnapshotItemClassificationRow,
  SnapshotSourceRow
} from "./live-ingest-snapshot";
import { toStableUuid } from "./supabase-id";
import { createSupabaseSql } from "./supabase-postgres";

interface BriefPostRow {
  id: string;
  source_item_id: string;
  slug: string;
  title: string;
  summary: string;
  body: string[];
  status: "draft" | "review" | "scheduled" | "published";
  review_status: "pending" | "approved" | "changes_requested" | "rejected";
  scheduled_at: string | null;
  published_at: string | null;
  last_editor_note: string | null;
  source_links: Array<{ label: string; href: string }>;
  source_count: number;
  cover_image_url: string | null;
}

interface DiscoverItemRow {
  id: string;
  source_item_id: string;
  slug: string;
  title: string;
  category: DiscoverCategory;
  summary: string;
  status: "tracked" | "watching" | "featured";
  review_status: "pending" | "approved" | "changes_requested" | "rejected";
  scheduled_at: string | null;
  published_at: string | null;
  tags: string[];
  highlighted: boolean;
}

interface DiscoverActionRow {
  id: string;
  discover_item_id: string;
  action_kind: DiscoverAction["kind"];
  label: string;
  href: string;
  position: number;
}

interface AdminReviewRow {
  id: string;
  target_type: "brief" | "discover" | "video";
  target_id: string;
  review_status: "pending" | "approved" | "changes_requested" | "rejected";
  notes: string;
  reviewed_at: string | null;
}

interface ExistingBriefLifecycleRow {
  source_item_id: string;
  status: BriefPostRow["status"];
  review_status: BriefPostRow["review_status"];
  scheduled_at: string | null;
  published_at: string | null;
  last_editor_note: string | null;
}

interface ExistingDiscoverLifecycleRow {
  source_item_id: string;
  status: DiscoverItemRow["status"];
  review_status: DiscoverItemRow["review_status"];
  scheduled_at: string | null;
  published_at: string | null;
}

interface ExistingAdminReviewRow {
  id: string;
  review_status: AdminReviewRow["review_status"];
  notes: string;
  reviewed_at: string | null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function getSummary(item: SnapshotIngestedItemRow) {
  return String(item.parsed_content.summary ?? item.title);
}

function getTags(item: SnapshotIngestedItemRow) {
  const tags = item.parsed_content.tags;
  if (!Array.isArray(tags)) return [];
  return tags.filter((tag): tag is string => typeof tag === "string");
}

function getImageUrl(item: SnapshotIngestedItemRow): string | null {
  const url = item.parsed_content.imageUrl;
  return typeof url === "string" && url.startsWith("http") ? url : null;
}

function needsReview(classification: SnapshotItemClassificationRow) {
  return Boolean(
    classification.exception_reason ||
      classification.target_surface === "both" ||
      classification.confidence < 0.85 ||
      classification.duplicate_of
  );
}

export function hasLockedEditorialLifecycle(params: {
  reviewStatus: BriefPostRow["review_status"] | DiscoverItemRow["review_status"];
  scheduledAt: string | null;
  publishedAt: string | null;
}) {
  return params.reviewStatus !== "pending" || Boolean(params.scheduledAt) || Boolean(params.publishedAt);
}

export function preserveBriefLifecycle(row: BriefPostRow, existing?: ExistingBriefLifecycleRow | null): BriefPostRow {
  if (!existing || !hasLockedEditorialLifecycle({
    reviewStatus: existing.review_status,
    scheduledAt: existing.scheduled_at,
    publishedAt: existing.published_at
  })) {
    return row;
  }

  return {
    ...row,
    status: existing.status,
    review_status: existing.review_status,
    scheduled_at: existing.scheduled_at,
    published_at: existing.published_at,
    last_editor_note: existing.last_editor_note ?? row.last_editor_note
  };
}

export function preserveDiscoverLifecycle(
  row: DiscoverItemRow,
  existing?: ExistingDiscoverLifecycleRow | null
): DiscoverItemRow {
  if (!existing || !hasLockedEditorialLifecycle({
    reviewStatus: existing.review_status,
    scheduledAt: existing.scheduled_at,
    publishedAt: existing.published_at
  })) {
    return row;
  }

  return {
    ...row,
    status: existing.status,
    review_status: existing.review_status,
    scheduled_at: existing.scheduled_at,
    published_at: existing.published_at
  };
}

export function preserveAdminReviewResolution(row: AdminReviewRow, existing?: ExistingAdminReviewRow | null): AdminReviewRow {
  if (!existing || (existing.review_status === "pending" && !existing.reviewed_at)) {
    return row;
  }

  return {
    ...row,
    review_status: existing.review_status,
    notes: existing.notes,
    reviewed_at: existing.reviewed_at
  };
}

function shouldSkipEditorial(classification: SnapshotItemClassificationRow) {
  return Boolean(
    classification.duplicate_of ||
      classification.target_surface === "archive" ||
      classification.target_surface === "discard"
  );
}

function toDiscoverCategory(value: string): DiscoverCategory {
  const allowedSet = new Set<string>(DISCOVER_CATEGORY_IDS);

  if (allowedSet.has(value)) {
    return value as DiscoverCategory;
  }

  if (value === "analysis") return "news";
  if (value === "release") return "sdk";
  if (value === "repo") return "open_source";
  return "website";
}

function inferBriefStatus(classification: SnapshotItemClassificationRow): BriefPostRow["status"] {
  return needsReview(classification) ? "review" : "draft";
}

function inferReviewStatus(
  classification: SnapshotItemClassificationRow
): BriefPostRow["review_status"] {
  return needsReview(classification) ? "pending" : "approved";
}

function inferDiscoverStatus(classification: SnapshotItemClassificationRow): DiscoverItemRow["status"] {
  if (classification.importance_score >= 90) return "featured";
  if (needsReview(classification)) return "watching";
  return "tracked";
}

function deriveDiscoverActions(
  item: SnapshotIngestedItemRow,
  classification: SnapshotItemClassificationRow,
  briefSlug: string | null
): DiscoverAction[] {
  const actions: DiscoverAction[] = [];
  const url = item.url;
  const category = toDiscoverCategory(classification.category);

  if (url.includes("github.com") || item.content_type === "repo") {
    actions.push({ kind: "github", label: "GitHub", href: url });
  } else if (category === "contest" || category === "grant" || category === "job") {
    actions.push({ kind: "apply", label: "Apply", href: url });
  } else if (category === "research" || category === "tutorial" || category === "newsletter") {
    actions.push({ kind: "docs", label: "Docs", href: url });
  } else {
    actions.push({ kind: "visit", label: "Visit", href: url });
  }

  if (briefSlug && classification.target_surface === "both") {
    actions.push({ kind: "brief", label: "Brief", href: `/brief/${briefSlug}` });
  }

  return actions;
}

export function buildEditorialRows(snapshot: LiveIngestSnapshot) {
  const itemsById = new Map(snapshot.tables.ingested_items.map((item) => [item.id, item]));
  const sourcesById = new Map(snapshot.tables.sources.map((source) => [source.id, source]));

  const briefPosts: BriefPostRow[] = [];
  const discoverItems: DiscoverItemRow[] = [];
  const discoverActions: DiscoverActionRow[] = [];
  const adminReviews: AdminReviewRow[] = [];

  for (const classification of snapshot.tables.item_classifications) {
    if (shouldSkipEditorial(classification)) continue;

    const item = itemsById.get(classification.item_id);
    if (!item) continue;

    const source = sourcesById.get(item.source_id);
    const slugBase = slugify(item.title) || "item";
    const briefSlug = `${slugBase}-${item.id.slice(0, 8)}`;

    if (classification.target_surface === "brief" || classification.target_surface === "both") {
      const briefId = toStableUuid(`brief:${item.id}`)!;
      const row: BriefPostRow = {
        id: briefId,
        source_item_id: toStableUuid(item.id)!,
        slug: briefSlug,
        title: item.title,
        summary: getSummary(item),
        body: [getSummary(item)],
        status: inferBriefStatus(classification),
        review_status: inferReviewStatus(classification),
        scheduled_at: null,
        published_at: null,
        last_editor_note: classification.exception_reason ?? null,
        source_links: [
          {
            label: source?.name ?? item.url,
            href: item.url
          }
        ],
        source_count: 1,
        cover_image_url: getImageUrl(item)
      };

      briefPosts.push(row);

      if (needsReview(classification)) {
        adminReviews.push({
          id: toStableUuid(`review:brief:${briefId}`)!,
          target_type: "brief",
          target_id: briefId,
          review_status: "pending",
          notes: classification.exception_reason ?? "operator review required before publish",
          reviewed_at: null
        });
      }
    }

    if (classification.target_surface === "discover" || classification.target_surface === "both") {
      const discoverId = toStableUuid(`discover:${item.id}`)!;
      const row: DiscoverItemRow = {
        id: discoverId,
        source_item_id: toStableUuid(item.id)!,
        slug: `${slugBase}-${item.id.slice(0, 8)}`,
        title: item.title,
        category: toDiscoverCategory(classification.category),
        summary: getSummary(item),
        status: inferDiscoverStatus(classification),
        review_status: inferReviewStatus(classification),
        scheduled_at: null,
        published_at: null,
        tags: getTags(item),
        highlighted: inferDiscoverStatus(classification) === "featured"
      };

      discoverItems.push(row);

      deriveDiscoverActions(item, classification, classification.target_surface === "both" ? briefSlug : null).forEach(
        (action, index) => {
          discoverActions.push({
            id: toStableUuid(`discover-action:${discoverId}:${index}`)!,
            discover_item_id: discoverId,
            action_kind: action.kind,
            label: action.label,
            href: action.href,
            position: index
          });
        }
      );

      if (needsReview(classification)) {
        adminReviews.push({
          id: toStableUuid(`review:discover:${discoverId}`)!,
          target_type: "discover",
          target_id: discoverId,
          review_status: "pending",
          notes: classification.exception_reason ?? "operator review required before surface release",
          reviewed_at: null
        });
      }
    }
  }

  return { briefPosts, discoverItems, discoverActions, adminReviews };
}

function toJsonParam<T extends ReturnType<typeof createSupabaseSql>>(sql: T, value: unknown) {
  return sql.json(value as Parameters<T["json"]>[0]);
}

export async function syncEditorialSnapshotToSupabase(snapshot: LiveIngestSnapshot) {
  const sql = createSupabaseSql();
  const editorial = buildEditorialRows(snapshot);

  try {
    for (const originalRow of editorial.briefPosts) {
      const existingRows = await sql<ExistingBriefLifecycleRow[]>`
        select
          source_item_id,
          status,
          review_status,
          scheduled_at,
          published_at,
          last_editor_note
        from public.brief_posts
        where source_item_id = ${originalRow.source_item_id}::uuid
        limit 1
      `;
      const row = preserveBriefLifecycle(originalRow, existingRows[0] ?? null);

      await sql`
        insert into public.brief_posts (
          id,
          source_item_id,
          slug,
          title,
          summary,
          body,
          status,
          review_status,
          scheduled_at,
          published_at,
          last_editor_note,
          source_links,
          source_count,
          cover_image_url
        ) values (
          ${row.id}::uuid,
          ${row.source_item_id}::uuid,
          ${row.slug},
          ${row.title},
          ${row.summary},
          ${toJsonParam(sql, row.body)},
          ${row.status},
          ${row.review_status},
          ${row.scheduled_at}::timestamptz,
          ${row.published_at}::timestamptz,
          ${row.last_editor_note},
          ${toJsonParam(sql, row.source_links)},
          ${row.source_count},
          ${row.cover_image_url}
        )
        on conflict (source_item_id) do update set
          slug = excluded.slug,
          title = excluded.title,
          summary = excluded.summary,
          body = excluded.body,
          status = excluded.status,
          review_status = excluded.review_status,
          scheduled_at = excluded.scheduled_at,
          published_at = excluded.published_at,
          last_editor_note = excluded.last_editor_note,
          source_links = excluded.source_links,
          source_count = excluded.source_count,
          cover_image_url = excluded.cover_image_url
      `;
    }

    for (const originalRow of editorial.discoverItems) {
      const existingRows = await sql<ExistingDiscoverLifecycleRow[]>`
        select
          source_item_id,
          status,
          review_status,
          scheduled_at,
          published_at
        from public.discover_items
        where source_item_id = ${originalRow.source_item_id}::uuid
        limit 1
      `;
      const row = preserveDiscoverLifecycle(originalRow, existingRows[0] ?? null);

      await sql`
        insert into public.discover_items (
          id,
          source_item_id,
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
        ) values (
          ${row.id}::uuid,
          ${row.source_item_id}::uuid,
          ${row.slug},
          ${row.title},
          ${row.category},
          ${row.summary},
          ${row.status},
          ${row.review_status},
          ${row.scheduled_at}::timestamptz,
          ${row.published_at}::timestamptz,
          ${toJsonParam(sql, row.tags)},
          ${row.highlighted}
        )
        on conflict (source_item_id) do update set
          slug = excluded.slug,
          title = excluded.title,
          category = excluded.category,
          summary = excluded.summary,
          status = excluded.status,
          review_status = excluded.review_status,
          scheduled_at = excluded.scheduled_at,
          published_at = excluded.published_at,
          tags = excluded.tags,
          highlighted = excluded.highlighted
      `;
    }

    const discoverIds = editorial.discoverItems.map((row) => row.id);
    if (discoverIds.length > 0) {
      for (const discoverId of discoverIds) {
        await sql`
          delete from public.discover_actions
          where discover_item_id = ${discoverId}::uuid
        `;
      }
    }

    for (const row of editorial.discoverActions) {
      await sql`
        insert into public.discover_actions (
          id,
          discover_item_id,
          action_kind,
          label,
          href,
          position
        ) values (
          ${row.id}::uuid,
          ${row.discover_item_id}::uuid,
          ${row.action_kind},
          ${row.label},
          ${row.href},
          ${row.position}
        )
        on conflict (id) do update set
          discover_item_id = excluded.discover_item_id,
          action_kind = excluded.action_kind,
          label = excluded.label,
          href = excluded.href,
          position = excluded.position
      `;
    }

    for (const originalRow of editorial.adminReviews) {
      const existingRows = await sql<ExistingAdminReviewRow[]>`
        select
          id,
          review_status,
          notes,
          reviewed_at
        from public.admin_reviews
        where id = ${originalRow.id}::uuid
        limit 1
      `;
      const row = preserveAdminReviewResolution(originalRow, existingRows[0] ?? null);

      await sql`
        insert into public.admin_reviews (
          id,
          target_type,
          target_id,
          review_status,
          notes,
          reviewed_at
        ) values (
          ${row.id}::uuid,
          ${row.target_type},
          ${row.target_id}::uuid,
          ${row.review_status},
          ${row.notes},
          ${row.reviewed_at}::timestamptz
        )
        on conflict (id) do update set
          target_type = excluded.target_type,
          target_id = excluded.target_id,
          review_status = excluded.review_status,
          notes = excluded.notes,
          reviewed_at = excluded.reviewed_at
      `;
    }

    return editorial;
  } finally {
    await sql.end();
  }
}
