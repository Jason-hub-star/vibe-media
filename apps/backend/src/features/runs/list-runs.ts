import { readLiveIngestSnapshot } from "../../shared/live-ingest-snapshot";
import { readSupabaseProjectionBundle } from "../../shared/supabase-read-projections";

export async function listRuns() {
  return (
    (await readSupabaseProjectionBundle())?.ingestRuns ??
    readLiveIngestSnapshot()?.projections.ingestRuns ??
    []
  );
}
