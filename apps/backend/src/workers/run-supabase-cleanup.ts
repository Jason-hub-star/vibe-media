import "../shared/load-env";
import { backupAndCleanupLegacyPublicObjects } from "../shared/supabase-cleanup";

console.log("VibeHub Supabase legacy cleanup");

const report = await backupAndCleanupLegacyPublicObjects({
  commit: process.env.SUPABASE_CLEANUP_COMMIT === "1",
  onProgress(message) {
    console.log(message);
  }
});

console.log(`backup dir: ${report.backupDir}`);
console.log(`legacy tables found: ${report.existingLegacyTables.length}`);
console.log(`cleanup committed: ${report.committed ? "yes" : "no"}`);
console.log(
  `remaining legacy tables: ${report.remainingLegacy.length > 0 ? report.remainingLegacy.join(", ") : "(none)"}`
);
