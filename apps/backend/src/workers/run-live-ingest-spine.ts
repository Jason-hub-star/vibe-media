import { runLiveSourceFetch } from "../shared/live-source-fetch";
import {
  liveIngestSnapshotPath,
  materializeLiveIngestSnapshot,
  writeLiveIngestSnapshot
} from "../shared/live-ingest-snapshot";

const fetchReport = await runLiveSourceFetch();
const snapshot = materializeLiveIngestSnapshot(fetchReport);

writeLiveIngestSnapshot(snapshot);

console.log("VibeHub live ingest spine");
console.log(`performed at: ${snapshot.generatedAt}`);
console.log(`snapshot path: ${liveIngestSnapshotPath}`);
console.log(`sources stored: ${snapshot.tables.sources.length}`);
console.log(`runs stored: ${snapshot.tables.ingest_runs.length}`);
console.log(`items stored: ${snapshot.tables.ingested_items.length}`);
console.log(`classifications stored: ${snapshot.tables.item_classifications.length}`);
console.log(`inbox projections: ${snapshot.projections.inboxItems.length}`);
