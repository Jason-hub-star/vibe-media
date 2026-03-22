import { syncLiveIngestToSupabase } from "../shared/supabase-ingest-sync";

const snapshot = await syncLiveIngestToSupabase();

console.log("VibeHub Supabase live ingest sync");
console.log(`generated at: ${snapshot.generatedAt}`);
console.log(`sources synced: ${snapshot.tables.sources.length}`);
console.log(`runs synced: ${snapshot.tables.ingest_runs.length}`);
console.log(`items synced: ${snapshot.tables.ingested_items.length}`);
console.log(`classifications synced: ${snapshot.tables.item_classifications.length}`);
