import { getSupabaseBriefDetail } from "../../shared/supabase-editorial-read";

export async function getBriefDetail(slug: string) {
  return (await getSupabaseBriefDetail(slug)) ?? null;
}
