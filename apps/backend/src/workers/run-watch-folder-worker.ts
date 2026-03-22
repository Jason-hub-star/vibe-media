import "../shared/load-env";
import { startWatchFolderWorker } from "../shared/watch-folder-worker";

const watchDir = process.env.VIDEO_WATCH_DIR?.trim() || "apps/backend/state/watch-folder";
const pollingIntervalMs = Number(process.env.VIDEO_WATCH_POLLING_MS || "5000");
const stableObservationCount = Number(process.env.VIDEO_WATCH_STABLE_OBSERVATIONS || "2");

console.log("VibeHub watch folder worker");
console.log(`watch dir: ${watchDir}`);
console.log(`polling interval: ${pollingIntervalMs}ms`);
console.log(`stable observations: ${stableObservationCount}`);

const worker = await startWatchFolderWorker({
  watchDir,
  pollingIntervalMs,
  stableObservationCount
});

process.on("SIGINT", () => {
  worker.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  worker.close();
  process.exit(0);
});
