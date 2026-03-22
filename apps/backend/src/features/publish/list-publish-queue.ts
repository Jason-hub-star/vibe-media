import { readLiveIngestSnapshot } from "../../shared/live-ingest-snapshot";
import { readSupabaseProjectionBundle } from "../../shared/supabase-read-projections";

export async function listPublishQueue() {
  return (
    (await readSupabaseProjectionBundle())?.publishQueueItems ??
    readLiveIngestSnapshot()?.projections.publishQueueItems ??
    []
  );
}
