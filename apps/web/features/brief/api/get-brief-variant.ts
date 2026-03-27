/**
 * brief locale variant 조회 — DB에서 번역된 variant를 가져온다.
 * variant가 없거나 품질 미통과면 null 반환 → 영어 fallback.
 */

import type { LocaleCode } from "@vibehub/content-contracts";

export interface BriefVariantData {
  locale: LocaleCode;
  title: string;
  summary: string;
  body: string[];
  translationStatus: string;
  qualityStatus: string;
}

export async function getBriefVariant(
  slug: string,
  locale: LocaleCode,
): Promise<BriefVariantData | null> {
  // canonical locale은 variant가 아니라 원본
  if (locale === "en") return null;

  try {
    const { createSupabaseSql } = await import("@vibehub/backend/shared/supabase-postgres");
    const sql = createSupabaseSql();

    try {
      const rows = await sql<Array<{
        locale: string;
        title: string;
        summary: string;
        body: string[];
        translation_status: string;
        quality_status: string;
      }>>`
        select v.locale, v.title, v.summary, v.body, v.translation_status, v.quality_status
        from public.brief_post_variants v
        join public.brief_posts bp on bp.id = v.canonical_id
        where bp.slug = ${slug}
          and v.locale = ${locale}
          and v.translation_status in ('translated', 'published')
          and v.quality_status = 'passed'
        limit 1
      `;

      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        locale: row.locale,
        title: row.title,
        summary: row.summary,
        body: Array.isArray(row.body) ? row.body : [],
        translationStatus: row.translation_status,
        qualityStatus: row.quality_status,
      };
    } finally {
      await sql.end();
    }
  } catch {
    // Supabase 연결 실패 등 → 영어 fallback
    return null;
  }
}
