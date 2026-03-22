import type { ShowcaseEntry, ShowcaseLink } from "@vibehub/content-contracts";

import { createSupabaseSql } from "./supabase-postgres";

export interface SaveShowcaseEntryInput {
  id?: string | null;
  slug?: string | null;
  title: string;
  summary: string;
  body: string[];
  coverAsset?: string | null;
  tags: string[];
  primaryLink: ShowcaseLink;
  links?: ShowcaseLink[];
  reviewStatus: ShowcaseEntry["reviewStatus"];
  scheduledAt?: string | null;
  publishedAt?: string | null;
  origin: ShowcaseEntry["origin"];
  createdBy?: string | null;
  submittedBy?: string | null;
  authorLabel?: string | null;
  sourceDiscoverItemId?: string | null;
  featuredHome?: boolean;
  featuredRadar?: boolean;
  displayOrder?: number;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizeLinks(primaryLink: ShowcaseLink, links: ShowcaseLink[] | undefined) {
  return (links ?? []).filter(
    (link) =>
      link.href &&
      link.label &&
      !(link.href === primaryLink.href && link.label === primaryLink.label && link.kind === primaryLink.kind)
  );
}

export async function saveSupabaseShowcaseEntry(input: SaveShowcaseEntryInput) {
  const sql = createSupabaseSql();

  if (input.publishedAt && input.reviewStatus !== "approved") {
    throw new Error("Published showcase entries must be approved before they go live.");
  }

  const slug = slugify(input.slug?.trim() || input.title);
  if (!slug) {
    throw new Error("Showcase entries require a title or slug.");
  }

  const extraLinks = normalizeLinks(input.primaryLink, input.links);
  const connection = await sql.reserve();
  let transactionStarted = false;

  try {
    await connection`begin`;
    transactionStarted = true;

    const rows = await connection<Array<{ id: string }>>`
      insert into public.showcase_entries (
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
        display_order
      )
      values (
        coalesce(${input.id ?? null}::uuid, gen_random_uuid()),
        ${slug},
        ${input.title},
        ${input.summary},
        ${JSON.stringify(input.body)}::jsonb,
        ${input.coverAsset ?? null},
        ${JSON.stringify(input.tags)}::jsonb,
        ${input.primaryLink.kind},
        ${input.primaryLink.label},
        ${input.primaryLink.href},
        ${input.reviewStatus},
        ${input.scheduledAt ?? null}::timestamptz,
        ${input.publishedAt ?? null}::timestamptz,
        ${input.origin},
        ${input.createdBy ?? null},
        ${input.submittedBy ?? null},
        ${input.authorLabel ?? null},
        ${input.sourceDiscoverItemId ?? null}::uuid,
        ${input.featuredHome ?? false},
        ${input.featuredRadar ?? false},
        ${input.displayOrder ?? 0}
      )
      on conflict (id) do update set
        slug = excluded.slug,
        title = excluded.title,
        summary = excluded.summary,
        body = excluded.body,
        cover_asset = excluded.cover_asset,
        tags = excluded.tags,
        primary_link_kind = excluded.primary_link_kind,
        primary_link_label = excluded.primary_link_label,
        primary_link_href = excluded.primary_link_href,
        review_status = excluded.review_status,
        scheduled_at = excluded.scheduled_at,
        published_at = excluded.published_at,
        origin = excluded.origin,
        created_by = excluded.created_by,
        submitted_by = excluded.submitted_by,
        author_label = excluded.author_label,
        source_discover_item_id = excluded.source_discover_item_id,
        featured_home = excluded.featured_home,
        featured_radar = excluded.featured_radar,
        display_order = excluded.display_order,
        updated_at = now()
      returning id
    `;

    const entryId = rows[0]?.id;
    if (!entryId) {
      throw new Error("Failed to save showcase entry.");
    }

    await connection`
      delete from public.showcase_links
      where showcase_entry_id = ${entryId}::uuid
    `;

    for (const [index, link] of extraLinks.entries()) {
      await connection`
        insert into public.showcase_links (
          showcase_entry_id,
          link_kind,
          label,
          href,
          position
        )
        values (
          ${entryId}::uuid,
          ${link.kind},
          ${link.label},
          ${link.href},
          ${index}
        )
      `;
    }

    await connection`commit`;

    return { id: entryId, slug };
  } catch (error) {
    if (transactionStarted) {
      await connection`rollback`;
    }
    throw error;
  } finally {
    connection.release();
    await sql.end();
  }
}
