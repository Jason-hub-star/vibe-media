import type { DiscoverItem } from "@vibehub/content-contracts";

import { listSupabaseDiscoverItems } from "../../shared/supabase-editorial-read";

export async function listDiscoverItems(): Promise<DiscoverItem[]> {
  return (await listSupabaseDiscoverItems()) ?? [];
}
