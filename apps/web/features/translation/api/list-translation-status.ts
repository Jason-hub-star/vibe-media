/**
 * 번역 상태 목록 — brief_posts LEFT JOIN brief_post_variants.
 */

import { createSupabaseSql } from "@vibehub/backend";

export interface TranslationStatusRow {
  slug: string;
  title: string;
  status: string;
  publishedAt: string | null;
  locale: string;
  translationStatus: string | null;
  qualityStatus: string | null;
  publishStatus: string | null;
  translatedAt: string | null;
  variantTitle: string | null;
}

export async function listTranslationStatus(): Promise<TranslationStatusRow[]> {
  let sql: ReturnType<typeof createSupabaseSql>;
  try {
    sql = createSupabaseSql();
  } catch {
    return [];
  }

  try {
    const rows = await sql<Array<{
      slug: string;
      title: string;
      status: string;
      published_at: string | null;
      locale: string | null;
      translation_status: string | null;
      quality_status: string | null;
      publish_status: string | null;
      translated_at: string | null;
      variant_title: string | null;
    }>>`
      select
        bp.slug,
        bp.title,
        bp.status,
        bp.published_at,
        v.locale,
        v.translation_status,
        v.quality_status,
        v.publish_status,
        v.translated_at,
        v.title as variant_title
      from public.brief_posts bp
      left join public.brief_post_variants v on v.canonical_id = bp.id
      order by bp.published_at desc nulls last, bp.slug asc
    `;

    return rows.map((r) => ({
      slug: r.slug,
      title: r.title,
      status: r.status,
      publishedAt: r.published_at,
      locale: r.locale ?? "en",
      translationStatus: r.translation_status,
      qualityStatus: r.quality_status,
      publishStatus: r.publish_status,
      translatedAt: r.translated_at,
      variantTitle: r.variant_title,
    }));
  } finally {
    await sql.end();
  }
}
