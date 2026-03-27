/**
 * 번역 재시도 / 강제 승인 API.
 * Server Action으로 사용 가능.
 */

import { createSupabaseSql } from "@vibehub/backend";

export async function retryTranslation(slug: string, locale: string): Promise<{ success: boolean; error?: string }> {
  let sql: ReturnType<typeof createSupabaseSql>;
  try {
    sql = createSupabaseSql();
  } catch (err) {
    return { success: false, error: "DB connection failed" };
  }

  try {
    // translation_status를 pending으로 리셋 → 다음 워커 실행 시 재번역
    await sql`
      update public.brief_post_variants v
      set translation_status = 'pending',
          quality_status = 'pending'
      from public.brief_posts bp
      where v.canonical_id = bp.id
        and bp.slug = ${slug}
        and v.locale = ${locale}
    `;
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await sql.end();
  }
}

export async function forceApproveTranslation(slug: string, locale: string): Promise<{ success: boolean; error?: string }> {
  let sql: ReturnType<typeof createSupabaseSql>;
  try {
    sql = createSupabaseSql();
  } catch (err) {
    return { success: false, error: "DB connection failed" };
  }

  try {
    await sql`
      update public.brief_post_variants v
      set quality_status = 'passed',
          translation_status = 'translated',
          quality_checked_at = now()
      from public.brief_posts bp
      where v.canonical_id = bp.id
        and bp.slug = ${slug}
        and v.locale = ${locale}
    `;
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    await sql.end();
  }
}
