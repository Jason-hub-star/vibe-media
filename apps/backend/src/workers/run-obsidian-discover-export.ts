import { exportDiscoverToObsidian } from "../features/discover/export-discover-to-obsidian";
import { sendDiscoverExportReport, sendHarnessPatternReport } from "../shared/telegram-report";

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

const harnessResults = report.results.filter(
  (r) => (r.status === "created" || r.status === "updated") && r.category === "harness_pattern"
);
if (harnessResults.length > 0) {
  await sendHarnessPatternReport({
    items: harnessResults.map((r) => ({ title: r.title, slug: r.filePath.split("/").pop()?.replace(".md", "") ?? "" })),
    totalCount: harnessResults.length,
  });
}
