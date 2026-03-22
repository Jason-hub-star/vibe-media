import { readLiveIngestSnapshot } from "../../shared/live-ingest-snapshot";
import { readSupabaseProjectionBundle } from "../../shared/supabase-read-projections";

export async function listExceptionQueue() {
  return (
    (await readSupabaseProjectionBundle())?.exceptionQueueItems ??
    readLiveIngestSnapshot()?.projections.exceptionQueueItems ??
    []
  );
}
