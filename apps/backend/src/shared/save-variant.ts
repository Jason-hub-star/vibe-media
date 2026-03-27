/**
 * UPSERT locale variant into brief_post_variants / discover_item_variants.
 */

import { createSupabaseSql } from "./supabase-postgres";
import type { LocaleCode } from "@vibehub/content-contracts";

// ---------------------------------------------------------------------------
// Brief variant UPSERT
// ---------------------------------------------------------------------------

export interface SaveBriefVariantInput {
  canonicalId: string;
  locale: LocaleCode;
  title: string;
  summary: string;
  body: string[];
  translationStatus: "pending" | "translated" | "quality_failed" | "published";
  qualityStatus?: "pending" | "passed" | "failed";
}

export async function saveBriefVariant(input: SaveBriefVariantInput): Promise<void> {
  const sql = createSupabaseSql();

  try {
    await sql`
      insert into public.brief_post_variants
        (canonical_id, locale, title, summary, body, translation_status, quality_status, translated_at)
      values
        (${input.canonicalId}::uuid, ${input.locale}, ${input.title}, ${input.summary},
         ${JSON.stringify(input.body)}::jsonb,
         ${input.translationStatus}, ${input.qualityStatus ?? "pending"},
         ${input.translationStatus === "translated" ? new Date().toISOString() : null})
      on conflict (canonical_id, locale)
      do update set
        title = excluded.title,
        summary = excluded.summary,
        body = excluded.body,
        translation_status = excluded.translation_status,
        quality_status = excluded.quality_status,
        translated_at = excluded.translated_at
    `;
  } finally {
    await sql.end();
  }
}

// ---------------------------------------------------------------------------
// Discover variant UPSERT
// ---------------------------------------------------------------------------

export interface SaveDiscoverVariantInput {
  canonicalId: string;
  locale: LocaleCode;
  title: string;
  summary: string;
  translationStatus: "pending" | "translated" | "quality_failed" | "published";
  qualityStatus?: "pending" | "passed" | "failed";
}

export async function saveDiscoverVariant(input: SaveDiscoverVariantInput): Promise<void> {
  const sql = createSupabaseSql();

  try {
    await sql`
      insert into public.discover_item_variants
        (canonical_id, locale, title, summary, translation_status, quality_status, translated_at)
      values
        (${input.canonicalId}::uuid, ${input.locale}, ${input.title}, ${input.summary},
         ${input.translationStatus}, ${input.qualityStatus ?? "pending"},
         ${input.translationStatus === "translated" ? new Date().toISOString() : null})
      on conflict (canonical_id, locale)
      do update set
        title = excluded.title,
        summary = excluded.summary,
        translation_status = excluded.translation_status,
        quality_status = excluded.quality_status,
        translated_at = excluded.translated_at
    `;
  } finally {
    await sql.end();
  }
}
