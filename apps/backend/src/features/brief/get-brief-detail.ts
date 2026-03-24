import { getSupabaseBriefDetail } from "../../shared/supabase-editorial-read";

/** Public: only returns published briefs */
export async function getBriefDetail(slug: string) {
  const brief = await getSupabaseBriefDetail(slug);
  if (!brief || brief.status !== "published") return null;
  return brief;
}

/** Admin: returns any brief regardless of status */
export async function getBriefDetailAdmin(slug: string) {
  return (await getSupabaseBriefDetail(slug)) ?? null;
}
