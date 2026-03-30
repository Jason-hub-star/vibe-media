import "../shared/load-env";
import {
  resolveSupabaseRetentionPolicy,
  runSupabaseRetention,
} from "../shared/supabase-retention";

const dryRun =
  process.argv.includes("--dry-run") ||
  process.env.SUPABASE_RETENTION_DRY_RUN === "1";

const policy = resolveSupabaseRetentionPolicy();
const report = await runSupabaseRetention({ dryRun, policy });

console.log(`\n## Supabase Retention — ${report.ranAt}`);
console.log(`- mode: ${report.dryRun ? "dry-run" : "apply"}`);
console.log(`- affected rows: ${report.totalAffectedRows}`);

for (const operation of report.operations) {
  const verb = report.dryRun ? "would affect" : "affected";
  console.log(
    `- ${operation.name}: ${verb} ${operation.affectedRows} rows (${operation.mode}, ${operation.days}d cutoff)`,
  );
}

process.exit(0);
