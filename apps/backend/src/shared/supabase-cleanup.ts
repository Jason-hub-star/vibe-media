import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createSupabaseSql, readCleanupSql } from "./supabase-postgres";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../../..");

export const keepPublicTables = [
  "admin_reviews",
  "asset_slots",
  "brief_posts",
  "discover_actions",
  "discover_items",
  "ingest_runs",
  "ingested_items",
  "item_classifications",
  "newsletter_subscribers",
  "source_entries",
  "sources",
  "video_jobs",
  "ingest_run_attempts",
  "video_job_attempts"
] as const;

export const legacyPublicTables = [
  "comments",
  "community_poll_options",
  "community_poll_votes",
  "community_polls",
  "community_post_tags",
  "community_posts",
  "news_articles",
  "news_categories",
  "profiles",
  "project_categories",
  "project_features",
  "project_technologies",
  "project_tools",
  "projects",
  "refresh_control",
  "reports",
  "review_categories",
  "tool_reviews",
  "user_profiles",
  "vibe_checks"
] as const;

export const legacyPublicFunctions = [
  "handle_new_user",
  "refresh_weekly_vibe_ranking",
  "submit_report",
  "update_content_report_count",
  "update_post_stats",
  "update_updated_at_column"
] as const;

function quoteIdentifier(value: string) {
  return `"${value.replaceAll(`"`, `""`)}"`;
}

function sqlDollarQuote(value: string) {
  return `$backup$${value}$backup$`;
}

async function listPublicTables(sql: ReturnType<typeof createSupabaseSql>) {
  const rows = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name asc
  `;

  return rows.map((row) => row.table_name);
}

async function buildLegacyTableBackup(sql: ReturnType<typeof createSupabaseSql>, tableName: string) {
  const rows = await sql.unsafe<{ payload: unknown }[]>(
    `select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb) as payload from public.${quoteIdentifier(tableName)} as t`
  );
  const payload = JSON.stringify(rows[0]?.payload ?? []);

  return [
    `-- ${tableName}`,
    `insert into public.${quoteIdentifier(tableName)}`,
    `select * from jsonb_populate_recordset(null::public.${quoteIdentifier(tableName)}, ${sqlDollarQuote(
      payload
    )}::jsonb);`,
    ""
  ].join("\n");
}

async function buildLegacyFunctionBackup(sql: ReturnType<typeof createSupabaseSql>) {
  const rows = await sql<{ definition: string; name: string }[]>`
    select
      p.proname as name,
      pg_get_functiondef(p.oid) as definition
    from pg_proc as p
    join pg_namespace as n on n.oid = p.pronamespace
    where n.nspname = 'public'
    order by p.proname asc
  `;

  return rows
    .filter((row) => legacyPublicFunctions.includes(row.name as (typeof legacyPublicFunctions)[number]))
    .map((row) => `-- ${row.name}\n${row.definition}\n`)
    .join("\n");
}

async function buildLegacyTriggerBackup(sql: ReturnType<typeof createSupabaseSql>) {
  const rows = await sql<{ table_name: string; trigger_name: string; definition: string }[]>`
    select
      c.relname as table_name,
      t.tgname as trigger_name,
      pg_get_triggerdef(t.oid, true) as definition
    from pg_trigger as t
    join pg_class as c on c.oid = t.tgrelid
    join pg_namespace as n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and not t.tgisinternal
    order by c.relname asc, t.tgname asc
  `;

  return rows
    .filter((row) => legacyPublicTables.includes(row.table_name as (typeof legacyPublicTables)[number]))
    .map((row) => `-- ${row.table_name}.${row.trigger_name}\n${row.definition};\n`)
    .join("\n");
}

export async function backupAndCleanupLegacyPublicObjects({
  commit = false,
  onProgress
}: {
  commit?: boolean;
  onProgress?: (message: string) => void;
}) {
  const sql = createSupabaseSql();
  const startedAt = new Date().toISOString().replaceAll(":", "").replaceAll(".", "-");
  const backupDir = path.join(repoRoot, "supabase", "backups", startedAt);

  try {
    const actualTables = await listPublicTables(sql);
    const knownTables = new Set([...keepPublicTables, ...legacyPublicTables]);
    const unexpected = actualTables.filter((tableName) => !knownTables.has(tableName as never));

    if (unexpected.length > 0) {
      throw new Error(`Unexpected public tables present: ${unexpected.join(", ")}`);
    }

    await mkdir(backupDir, { recursive: true });

    const existingLegacyTables = legacyPublicTables.filter((tableName) => actualTables.includes(tableName));
    const tableBackups: string[] = [];
    for (const tableName of existingLegacyTables) {
      onProgress?.(`backing up ${tableName}`);
      tableBackups.push(await buildLegacyTableBackup(sql, tableName));
    }

    onProgress?.("backing up legacy functions");
    const functionBackup = await buildLegacyFunctionBackup(sql);
    onProgress?.("backing up legacy triggers");
    const triggerBackup = await buildLegacyTriggerBackup(sql);

    await writeFile(
      path.join(backupDir, "legacy-public-data.sql"),
      tableBackups.length > 0 ? tableBackups.join("\n") : "-- no legacy public tables found\n"
    );
    await writeFile(
      path.join(backupDir, "legacy-public-functions.sql"),
      functionBackup || "-- no legacy public functions found\n"
    );
    await writeFile(
      path.join(backupDir, "legacy-public-triggers.sql"),
      triggerBackup || "-- no legacy public triggers found\n"
    );

    if (commit) {
      const cleanup = readCleanupSql();
      onProgress?.(`applying cleanup sql: ${cleanup.filePath}`);
      await sql.unsafe(cleanup.sql);
    }

    const remainingTables = await listPublicTables(sql);
    const remainingLegacy = remainingTables.filter((tableName) => legacyPublicTables.includes(tableName as never));

    return {
      backupDir: path.relative(repoRoot, backupDir),
      actualTables,
      existingLegacyTables,
      remainingLegacy,
      committed: commit
    };
  } finally {
    await sql.end();
  }
}
