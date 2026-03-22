import { listSupabaseBriefs } from "../../shared/supabase-editorial-read";

export async function listBriefs() {
  const remote = await listSupabaseBriefs();

  return remote?.map(({ body, sourceLinks, ...item }) => item) ?? [];
}
