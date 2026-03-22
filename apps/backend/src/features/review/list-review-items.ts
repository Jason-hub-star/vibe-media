import { readLiveIngestSnapshot } from "../../shared/live-ingest-snapshot";
import { readSupabaseProjectionBundle } from "../../shared/supabase-read-projections";

export async function listReviewItems() {
  return (
    (await readSupabaseProjectionBundle())?.reviewItems ??
    readLiveIngestSnapshot()?.projections.reviewItems ??
    []
  );
}
