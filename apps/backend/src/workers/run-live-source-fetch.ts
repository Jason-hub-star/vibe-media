import { runLiveSourceFetch } from "../shared/live-source-fetch";
import { materializeLiveIngestSnapshot, writeLiveIngestSnapshot } from "../shared/live-ingest-snapshot";

const report = await runLiveSourceFetch();

// Save snapshot so downstream workers (ingest, sync) can read without re-fetching
const snapshot = materializeLiveIngestSnapshot(report);
writeLiveIngestSnapshot(snapshot);

console.log("VibeHub live source fetch");
console.log(`performed at: ${report.performedAt}`);
console.log(`sources attempted: ${report.sourceStatuses.length}`);
console.log(`items fetched: ${report.items.length}`);
console.log(`pipeline items: ${report.cycleReport.inboxItems.length}`);
console.log("");
console.log("Source statuses:");
for (const status of report.sourceStatuses) {
  const note = status.note ? ` (${status.note})` : "";
  console.log(`- ${status.sourceName}: ${status.status} ${status.itemCount}${note}`);
}
console.log("");
console.log("Fetched items:");
for (const item of report.items.slice(0, 10)) {
  console.log(`- ${item.sourceName} :: ${item.title} -> ${item.url}`);
}
