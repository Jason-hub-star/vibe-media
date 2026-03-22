import { readLiveIngestSnapshot } from "../../shared/live-ingest-snapshot";
import { readSupabaseProjectionBundle } from "../../shared/supabase-read-projections";

export async function listInboxItems() {
  return (
    (await readSupabaseProjectionBundle())?.inboxItems ??
    readLiveIngestSnapshot()?.projections.inboxItems ??
    []
  );
}
