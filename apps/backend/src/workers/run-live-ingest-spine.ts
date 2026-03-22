import { runLiveSourceFetch } from "../shared/live-source-fetch";
import {
  liveIngestSnapshotPath,
  materializeLiveIngestSnapshot,
  readLiveIngestSnapshot,
  writeLiveIngestSnapshot
} from "../shared/live-ingest-snapshot";

// Read existing snapshot (saved by fetch worker) to avoid re-fetching sources
let snapshot = readLiveIngestSnapshot();
if (!snapshot) {
  const fetchReport = await runLiveSourceFetch();
  snapshot = materializeLiveIngestSnapshot(fetchReport);
  writeLiveIngestSnapshot(snapshot);
}

console.log("VibeHub live ingest spine");
console.log(`performed at: ${snapshot.generatedAt}`);
console.log(`snapshot path: ${liveIngestSnapshotPath}`);
console.log(`sources stored: ${snapshot.tables.sources.length}`);
console.log(`runs stored: ${snapshot.tables.ingest_runs.length}`);
console.log(`items stored: ${snapshot.tables.ingested_items.length}`);
console.log(`classifications stored: ${snapshot.tables.item_classifications.length}`);
console.log(`inbox projections: ${snapshot.projections.inboxItems.length}`);
