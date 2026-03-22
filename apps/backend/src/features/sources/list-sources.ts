import { readLiveIngestSnapshot } from "../../shared/live-ingest-snapshot";
import { readSupabaseSourceEntries } from "../../shared/supabase-read-projections";

export async function listSources() {
  return (
    (await readSupabaseSourceEntries()) ??
    readLiveIngestSnapshot()?.projections.sourceEntries ??
    []
  );
}
