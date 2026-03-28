import { runBriefEnrichBackfill } from "../shared/supabase-brief-enrich-backfill";

const dryRun = process.argv.includes("--dry-run");

const report = await runBriefEnrichBackfill(dryRun);

console.log(`## Brief Enrich Backfill${dryRun ? " (DRY RUN)" : ""}`);
console.log(`- scanned: ${report.scanned}`);
console.log(`- body updated: ${report.bodyUpdated}`);
console.log(`- image updated: ${report.imageUpdated}`);
console.log(`- errors: ${report.errors}`);

if (report.results.length > 0) {
  console.log("\n| slug | body | image | paragraphs | error |");
  console.log("|------|------|-------|------------|-------|");
  for (const r of report.results) {
    const bodyFlag = r.bodyUpdated ? "✅" : "—";
    const imageFlag = r.imageUpdated ? "✅" : "—";
    const error = r.error ? r.error.slice(0, 40) : "—";
    console.log(`| ${r.slug.slice(0, 50)} | ${bodyFlag} | ${imageFlag} | ${r.newBodyLen} | ${error} |`);
  }
}
