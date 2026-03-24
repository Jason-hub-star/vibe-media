import { exportDiscoverToObsidian } from "../features/discover/export-discover-to-obsidian";
import { sendDiscoverExportReport } from "../shared/telegram-report";

const report = await exportDiscoverToObsidian();

console.log("VibeHub Obsidian discover export");
console.log(`vault root: ${report.vaultRoot}`);
console.log(`data source: ${report.source}`);
console.log(`items exported: ${report.savedCount}`);
console.log(`items created: ${report.createdCount}`);
console.log(`items updated: ${report.updatedCount}`);
console.log(`items skipped: ${report.skippedCount}`);
console.log(`items failed: ${report.failedCount}`);

for (const folder of report.folderCounts) {
  console.log(`folder ${folder.folderName}: ${folder.count}`);
}

await sendDiscoverExportReport(report);
