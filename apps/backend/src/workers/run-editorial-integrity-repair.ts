import { repairBriefWorkflowIntegrity } from "../shared/supabase-editorial-integrity";

const report = await repairBriefWorkflowIntegrity();

console.log("## Editorial Integrity Repair");
console.log(`- scanned: ${report.scanned}`);
console.log(`- repaired: ${report.repaired}`);
console.log(`- flagged: ${report.flagged}`);

if (report.results.length > 0) {
  console.log("\n| slug | repaired | issues |");
  console.log("|------|----------|--------|");
  for (const result of report.results) {
    console.log(`| ${result.slug} | ${result.repaired ? "yes" : "no"} | ${result.issues.join("; ") || "-" } |`);
  }
}
