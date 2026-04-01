import { runDiscoverSummaryEnrich } from "../shared/discover-summary-enrich";

const dryRun = process.argv.includes("--dry-run");

console.log(`## Discover Summary Enrichment${dryRun ? " (DRY RUN)" : ""}`);
console.log("");

const report = await runDiscoverSummaryEnrich(dryRun);

console.log(`- scanned: ${report.scanned}`);
console.log(`- enriched: ${report.enriched}`);
console.log(`- skipped: ${report.skipped}`);
console.log(`- errors: ${report.errors}`);
console.log("");

for (const r of report.results) {
  const status = r.newSummary ? "OK" : r.error === "SKIP" ? "SKIP" : "ERR";
  console.log(`[${status}] ${r.title}`);
  if (r.newSummary) {
    console.log(`  OLD: ${r.oldSummary}`);
    console.log(`  NEW: ${r.newSummary}`);
  }
  if (r.error && r.error !== "SKIP") console.log(`  ERR: ${r.error}`);
}
