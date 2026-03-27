import { runAutoApprove } from "../shared/supabase-auto-approve";

const maxBriefs = parseInt(argsValue("--max") ?? "10", 10);

function argsValue(flag: string) {
  const arg = process.argv.slice(2).find((value) => value.startsWith(`${flag}=`));
  return arg?.split("=")[1] ?? null;
}

const report = await runAutoApprove({ maxBriefs });

console.log(`\n## Auto Approve Report — ${report.ranAt}`);
console.log(`- 대상: ${report.total}건`);
console.log(`- approved: ${report.approved}건`);
console.log(`- held: ${report.held}건`);

if (report.results.length > 0) {
  console.log("\n| slug | action | quality | 비고 |");
  console.log("|------|--------|---------|------|");
  for (const result of report.results) {
    const quality = `${result.grade} ${result.qualityScore}`;
    const note = result.action === "held" ? (result.reason ?? "") : "✓ guardrails passed";
    console.log(`| ${result.slug} | ${result.action} | ${quality} | ${note} |`);
  }
}

process.exit(0);
