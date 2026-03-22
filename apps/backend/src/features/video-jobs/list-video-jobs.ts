import { listSupabaseVideoJobs } from "../../shared/supabase-video-jobs";

export async function listVideoJobs() {
  return (await listSupabaseVideoJobs()) ?? [];
}
